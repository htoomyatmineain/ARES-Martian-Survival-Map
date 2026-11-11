import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.TEST_URL || 'http://localhost:5173';
const output = 'docs/jz01';
const step5 = process.env.JZ01_STEP5 === '1';
const completion=process.env.JZ01_STEP5_COMPLETE==='1';
const step4 = process.env.JZ01_STEP4 === '1' || step5;
const evidencePrefix=completion?'step5_complete':step5?'step5':'step4';
await mkdir(`${output}/screenshots`, { recursive: true });
const sourceDir = 'source-data/JZ01_Codex_Handoff';
const positions = [], uvs = [], faces = [];
for (const line of (await readFile(`${sourceDir}/terrain.obj`, 'utf8')).split(/\r?\n/)) {
  const a = line.trim().split(/\s+/);
  if (a[0] === 'v') positions.push(a.slice(1, 4).map(Number));
  if (a[0] === 'vt') uvs.push(a.slice(1, 3).map(Number));
  if (a[0] === 'f') faces.push(a.slice(1).map(t => t.split('/').slice(0, 2).map(n => Number(n) - 1)));
}
const manifest = JSON.parse(await readFile(`${sourceDir}/manifest.json`, 'utf8'));
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const result = { url: `${base}/?workspace=jz01`, tests: [], errors: [], failedRequests: [], cancelledRequests: [], warnings: [] };
const check = (name, condition, detail) => {
  result.tests.push({ name, status: condition ? 'PASS' : 'FAIL', detail });
  assert.ok(condition, `${name}: ${JSON.stringify(detail)}`);
  console.log('PASS', name);
};
const args = process.env.SOFTWARE_WEBGL === '1'
  ? ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--enable-webgl', '--use-angle=d3d11'];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args });
result.browserVersion = browser.version();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: step4, serviceWorkers: 'block' });
const page = await context.newPage();
page.setDefaultTimeout(90000);
page.on('pageerror', e => result.errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()); if (m.type() === 'warning') result.warnings.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) result.failedRequests.push({ url: r.url(), status: r.status() }); });
page.on('requestfailed', r => {
  const entry = { url: r.url(), error: r.failure()?.errorText };
  // Existing terrain effects intentionally abort their first request on Strict Mode cleanup.
  const expectedAbort = entry.error === 'net::ERR_ABORTED'
    && /\/(assets\/mars\/ground\.(json|bin)|data\/terrain\.(json|bin)|assets\/mars\/jz01\/navigation-heights\.bin)$/.test(entry.url);
  (expectedAbort ? result.cancelledRequests : result.failedRequests).push(entry);
});
const ready = async target => {
  await target.goto(`${base}/?workspace=jz01`);
  await target.waitForFunction(() => document.querySelector('.jz01-preview')?.dataset.ready === 'true' && window.__jz01?.renderedFrames >= 1);
};
try {
  await ready(page);
  if (step4) { await page.getByRole('button', { name: 'Scientific', exact: true }).click();
    await page.waitForFunction(() => window.__jz01?.mode === 'scientific'); }
  check('React application and JZ-01 preview start', await page.locator('canvas').count() === 1);
  if(completion){check('Minimal viewer has no information cards or mission UI',await page.locator('.jz01-facts,.jz01-header,.jz01-footer,.mx-gauge,nav').count()===0);
    check('Exactly one simple two-option view switch',await page.getByRole('group',{name:'Terrain view'}).count()===1&&await page.getByRole('group',{name:'Terrain view'}).getByRole('button').count()===2);}
  const geometry = await page.evaluate(({ positions, uvs, faces }) => {
    const runtime = window.__jz01, root = runtime.root;
    root.updateWorldMatrix(true, true);
    const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
    const sourceIds = new Map(positions.map((p, i) => [`${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`, i]));
    const uvById = new Map(); for (const f of faces) for (const [vi, ti] of f) uvById.set(vi, uvs[ti]);
    const canonical = ids => [ids.join(','), [...ids.slice(1), ids[0]].join(','), [ids[2], ids[0], ids[1]].join(',')].sort()[0];
    const topology = new Map(); for (const f of faces) { const k = canonical(f.map(t => t[0])); topology.set(k, (topology.get(k) || 0) + 1); }
    let error = 0, uvError = 0, missing = 0, triangles = 0, count = 0;
    const seen = new Set(), minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
    const corners = {};
    for (const mesh of meshes) {
      const pos = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv, ids = [];
      const v = mesh.position.clone();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const source = [v.x, -v.z, v.y];
        const id = sourceIds.get(`${Math.round(source[0] * 1000)},${Math.round(source[1] * 1000)}`);
        if (id === undefined) { missing++; continue; }
        ids[i] = id; seen.add(id); count++;
        for (let k = 0; k < 3; k++) {
          error = Math.max(error, Math.abs(source[k] - positions[id][k]));
          minimum[k] = Math.min(minimum[k], v.getComponent(k)); maximum[k] = Math.max(maximum[k], v.getComponent(k));
        }
        uvError = Math.max(uvError, Math.abs(uv.getX(i) - uvById.get(id)[0]), Math.abs((1 - uv.getY(i)) - uvById.get(id)[1]));
        if (Math.abs(v.x) === 249.5 && Math.abs(v.z) === 249.5) {
          corners[`${v.z < 0 ? 'N' : 'S'}${v.x < 0 ? 'W' : 'E'}`] = { source: positions[id], three: v.toArray() };
        }
      }
      const index = mesh.geometry.index;
      for (let i = 0; i < (index ? index.count : pos.count); i += 3) {
        const tri = [0, 1, 2].map(j => ids[index ? index.getX(i + j) : i + j]);
        const key = canonical(tri); topology.set(key, (topology.get(key) || 0) - 1); triangles++;
      }
    }
    const materials = meshes.flatMap(m => Array.isArray(m.material) ? m.material : [m.material]);
    return { meshes: meshes.length, exportedVertices: count, sourceSamples: seen.size, triangles,
      maxPositionErrorM: error, maxUVError: uvError, unmatched: missing,
      topologyEquivalent: [...topology.values()].every(v => v === 0), bounds: { min: minimum, max: maximum }, corners,
      textures: materials.map(m => ({ name: m.name, width: m.map?.image?.width, height: m.map?.image?.height,
        flipY: m.map?.flipY, colorSpace: m.map?.colorSpace, metallic: m.metalness, roughness: m.roughness })) };
  }, { positions, uvs, faces });
  result.geometry = geometry;
  check('World-space geometry, topology, scale and orientation', geometry.meshes === 1 && geometry.triangles === 125000
    && geometry.sourceSamples === 63001 && geometry.unmatched === 0 && geometry.maxPositionErrorM < .00002 && geometry.topologyEquivalent, geometry);
  check('Original UV registration and loaded texture', geometry.maxUVError < .000002 && geometry.textures.every(t => t.width === 2000 && t.height === 2000 && t.metallic === 0), geometry.textures);
  check('NW / NE / SW coordinate directions', geometry.corners.NW.three[0] < 0 && geometry.corners.NW.three[2] < 0
    && geometry.corners.NE.three[0] > 0 && geometry.corners.NE.three[2] < 0
    && geometry.corners.SW.three[0] < 0 && geometry.corners.SW.three[2] > 0, geometry.corners);
  if (step4) {
    const modes = await page.evaluate(async () => {
      const r = window.__jz01, displayMeshes = [], sourceMeshes = [];
      r.root.traverse(o => { if (o.isMesh) displayMeshes.push(o); });
      r.source.traverse(o => { if (o.isMesh) sourceMeshes.push(o); });
      const before = displayMeshes.map(m => ({ geometry: m.geometry, map: m.material.map, matrix: m.matrixWorld.toArray() }));
      const sourceColors = sourceMeshes.map(m => m.material.color.getHexString());
      const scientific = displayMeshes.map(m => m.material.color.getHexString());
      const memory = r.renderer.info.memory;
      document.querySelector('[aria-label="Presentation mode"] button[aria-pressed="false"]').click();
      await new Promise(resolve => setTimeout(resolve, 300));
      return { scientific, cinematic: displayMeshes.map(m => m.material.color.getHexString()),
        sameGeometry: displayMeshes.every((m, i) => m.geometry === before[i].geometry && m.geometry === sourceMeshes[i].geometry),
        sameImageAndUV: displayMeshes.every((m, i) => m.material.map === before[i].map && m.material.map === sourceMeshes[i].material.map),
        sameTransforms: displayMeshes.every((m, i) => m.matrixWorld.toArray().every((v, j) => v === before[i].matrix[j])),
        clonedMaterials: displayMeshes.every((m, i) => m.material !== sourceMeshes[i].material),
        sourceColors, sourceUnchanged: sourceMeshes.every((m, i) => m.material.color.getHexString() === sourceColors[i]),
        memory: { geometries: memory.geometries, textures: memory.textures } };
    });
    result.presentation = modes;
    check('Scientific neutral imagery and cinematic presentation', modes.scientific.every(c => c === 'ffffff')
      && modes.cinematic.every(c => c !== 'ffffff'), modes);
    check('Modes preserve geometry, texture, UVs, transforms and cached source', modes.sameGeometry && modes.sameImageAndUV
      && modes.sameTransforms && modes.clonedMaterials && modes.sourceUnchanged, modes);
    // Exercise resource ownership when repeatedly replacing the presentation-only background.
    const textureCounts = [];
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Scientific', exact: true }).click(); await page.waitForTimeout(120);
      await page.getByRole('button', { name: 'Cinematic', exact: true }).click(); await page.waitForTimeout(120);
      textureCounts.push(await page.evaluate(() => window.__jz01.renderer.info.memory.textures));
    }
    check('Repeated mode changes do not accumulate background textures', Math.max(...textureCounts) - Math.min(...textureCounts) <= 1, textureCounts);
  }
  const cameraPosition = () => page.evaluate(() => window.__jz01.camera.position.toArray());
  const before = await cameraPosition();
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(box.x + box.width * .55, box.y + box.height * .55);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .7, box.y + box.height * .6, { steps: 18 }); await page.mouse.up();
  await page.waitForTimeout(800);
  const after = await cameraPosition();
  check('Pointer orbit works', Math.hypot(...after.map((v, i) => v - before[i])) > 10, { before, after });
  if(completion){
    const panBefore=await page.evaluate(()=>window.__jz01.controls.target.toArray());
    await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down({button:'right'});
    await page.mouse.move(box.x+box.width*.6,box.y+box.height*.54,{steps:12});await page.mouse.up({button:'right'});await page.waitForTimeout(700);
    const panAfter=await page.evaluate(()=>window.__jz01.controls.target.toArray());
    check('Right-drag tactical pan works without height drift',Math.hypot(panAfter[0]-panBefore[0],panAfter[2]-panBefore[2])>5&&Math.abs(panAfter[1]-panBefore[1])<.001,{panBefore,panAfter});
  }
  const distance = () => page.evaluate(() => window.__jz01.camera.position.distanceTo(window.__jz01.controls.target));
  const d0 = await distance();
  if(completion)await page.evaluate(()=>{
    window.__zoomSamples=[];const until=performance.now()+600;
    const sample=()=>{const r=window.__jz01;window.__zoomSamples.push(r.camera.position.distanceTo(r.controls.target));if(performance.now()<until)requestAnimationFrame(sample);};sample();
  });
  await page.mouse.wheel(0, -400); await page.waitForTimeout(800); const d1 = await distance();
  check('Wheel zoom works', d1 < d0, { before: d0, after: d1 });
  if(completion){const samples=await page.evaluate(()=>window.__zoomSamples);check('Wheel zoom passes through intermediate distances',samples.some(d=>d<d0-.1&&d>d1+.1),{before:d0,after:d1,sampleCount:samples.length});}
  if (step4) {
    const smooth = await page.evaluate(async () => {
      const r = window.__jz01, samples = [r.camera.position.toArray()];
      document.querySelector('.jz01-viewport canvas').dispatchEvent(new CustomEvent('mars-camera', { detail: 'reset' }));
      samples.push(r.camera.position.toArray());
      await new Promise(resolve => setTimeout(resolve, 180)); samples.push(r.camera.position.toArray());
      await new Promise(resolve => setTimeout(resolve, 700)); samples.push(r.camera.position.toArray());
      const delta = (a, b) => Math.hypot(...a.map((v, i) => v-b[i]));
      return { samples, immediate: delta(samples[0],samples[1]), intermediate: delta(samples[0],samples[2]),
        completed: delta(samples[0],samples[3]) };
    });
    check('Reset animates through intermediate camera positions', smooth.immediate < .1 && smooth.intermediate > 1
      && smooth.intermediate < smooth.completed, smooth);
  }
  await page.getByRole('button', { name: 'Reset view', exact: true }).click(); await page.waitForTimeout(850);
  check('Reset restores framing', Math.hypot(...(await cameraPosition()).map((v, i) => v - before[i])) < .1);
  if (step4) {
    await page.mouse.move(box.x + box.width * .6, box.y + box.height * .6);
    await page.mouse.wheel(0, -6000); await page.waitForTimeout(700);
    const limits = await page.evaluate(() => {
      const r = window.__jz01, c = r.controls;
      return { distance: r.camera.position.distanceTo(c.target), height: r.camera.position.y,
        minDistance: c.minDistance, maxPolarAngle: c.maxPolarAngle,
        worstClearance: c.target.y + c.minDistance * Math.cos(c.maxPolarAngle) - 58.42236328125 };
    });
    check('Zoom and polar limits keep camera above terrain', limits.distance >= limits.minDistance - .01
      && limits.height > 58.422364 && limits.worstClearance > 0, limits);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    check('Reduced-motion reset is immediate', Math.hypot(...(await cameraPosition()).map((v, i) => v-before[i])) < .1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  const b0 = await distance(); await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await page.waitForTimeout(500);
  check('Accessible zoom button works', (await distance()) < b0);
  await page.getByRole('button', { name: 'Reset view', exact: true }).click(); await page.waitForTimeout(850);
  if (step4) {
    await page.getByRole('button', { name: 'Scientific', exact: true }).click(); await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/screenshots/${evidencePrefix}_tactical_scientific.png` });
    await page.getByRole('button', { name: 'Cinematic', exact: true }).click(); await page.waitForTimeout(300);
  }
  await page.screenshot({ path: `${output}/screenshots/${step4 ? evidencePrefix+'_tactical_cinematic' : 'threejs_tactical_preview'}.png` });
  check('Browser screenshot captured', true);
  await page.evaluate(() => { const r = window.__jz01; r.controls.autoRotate = true; r.controls.autoRotateSpeed = 1; r.controls.update(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const r = window.__jz01; r.frameTimes.length = 0; r.measuring = true; });
  await page.waitForTimeout(6000);
  result.performance = await page.evaluate(() => {
    const r = window.__jz01; r.measuring = false; r.controls.autoRotate = false;
    const samples = [...r.frameTimes].sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const gl = r.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { frames: samples.length, meanFrameMs: mean, fps: 1000 / mean,
      medianFrameMs: samples[Math.floor(samples.length * .5)], p95FrameMs: samples[Math.floor(samples.length * .95)],
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      dpr: r.renderer.getPixelRatio(), viewport: [innerWidth, innerHeight],
      drawingBuffer: [r.renderer.domElement.width, r.renderer.domElement.height], calls: r.renderer.info.render.calls,
      triangles: r.renderer.info.render.triangles, geometryCount: r.renderer.info.memory.geometries,
      textures: r.renderer.info.memory.textures, shadows: r.renderer.shadowMap.enabled,
      method: 'Headless Chrome, six seconds of warmed continuous OrbitControls auto-rotation; CPU-observed rendered frame intervals, not GPU timer queries.' };
  });
  check('Browser interaction performance measured', result.performance.frames > 10 && Number.isFinite(result.performance.fps), result.performance);
  const idleStart = await page.evaluate(() => window.__jz01.renderedFrames); await page.waitForTimeout(1800);
  const idleMiddle = await page.evaluate(() => window.__jz01.renderedFrames); await page.waitForTimeout(700);
  const idleEnd = await page.evaluate(() => window.__jz01.renderedFrames);
  check('Demand rendering settles after interaction', idleEnd - idleMiddle <= 3, { idleStart, idleMiddle, idleEnd });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
  check('Mobile resize retains visible canvas and controls', await page.getByRole('button', { name: 'Reset view', exact: true }).isVisible()
    && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (step4) {
    const controlsBefore = await cameraPosition();
    const client = await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 460 }] });
    for (let x = 195; x <= 255; x += 10) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 460 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(600);
    const controlsAfter = await cameraPosition();
    check('Mobile native touch orbit', Math.hypot(...controlsAfter.map((v, i) => v-controlsBefore[i])) > 5);
    const pinchBefore = await distance();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 460 }, { x: 220, y: 460 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 130, y: 460 }, { x: 250, y: 460 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
    check('Mobile native pinch zoom', (await distance()) < pinchBefore - 5);
    await page.getByRole('button', { name: 'Reset view', exact: true }).click(); await page.waitForTimeout(850);
    const framing = await page.evaluate(() => {
      const r = window.__jz01, v = r.camera.position.clone(), projected = [];
      for (const x of [-249.5, 249.5]) for (const y of [0,58.42236328125]) for (const z of [-249.5,249.5]) {
        v.set(x,y,z).project(r.camera); projected.push(v.toArray());
      }
      return { maxX: Math.max(...projected.map(p => Math.abs(p[0]))), maxY: Math.max(...projected.map(p => Math.abs(p[1]))) };
    });
    check('Mobile reset frames complete terrain bounds', framing.maxX < .98 && framing.maxY < .98, framing);
    await client.detach();
  }
  await page.screenshot({ path: `${output}/screenshots/${step4 ? evidencePrefix+'_tactical_mobile' : 'threejs_tactical_mobile'}.png` });
  if(step5){
    result.mobileFraming=await page.evaluate(()=>{
      const r=window.__jz01,old=r.camera.clone(),target=r.controls.target.clone();
      const canvas=r.renderer.domElement,aspect=canvas.clientWidth/canvas.clientHeight;
      old.position.set(610,520,740).sub(target).multiplyScalar(Math.max(1,1.12/aspect)).add(target);old.lookAt(target);old.updateMatrixWorld();
      const corners=[[-249.5,58.4208984375,-249.5],[249.5,1.5720210075,-249.5],[249.5,6.93725586,249.5],[-249.5,54.56982422,249.5]];
      const area=cam=>{const v=r.camera.position.clone(),points=corners.map(p=>v.set(...p).project(cam).toArray());let a=0;
        for(let i=0;i<4;i++){const p=points[i],q=points[(i+1)%4];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a)/8;};
      return {step4ProjectedCanvasFraction:area(old),step5ProjectedCanvasFraction:area(r.camera)};
    });
    check('Mobile terrain occupies more overview area than Step 4 pose',result.mobileFraming.step5ProjectedCanvasFraction>result.mobileFraming.step4ProjectedCanvasFraction*1.15,result.mobileFraming);
    await page.getByRole('button',{name:'Astronaut POV',exact:true}).click();
    await page.waitForFunction(()=>window.__jz01POV&&window.__jz01?.view==='pov');
    const pose=()=>page.evaluate(()=>{const {sample,place,...p}=window.__jz01POV;return p;});
    const p0=await pose();
    check('POV starts grounded with 1.7 m clearance',Math.abs(p0.y-Math.max(p0.dtm,p0.mesh)-1.7)<.00001,p0);
    await page.getByRole('button',{name:'Scientific',exact:true}).click();await page.waitForTimeout(150);
    await page.getByRole('button',{name:'Cinematic',exact:true}).click();await page.waitForTimeout(150);
    const p1=await pose();check('POV presentation switches preserve position',Math.hypot(p1.x-p0.x,p1.z-p0.z)<.001);
    const move=await page.getByRole('button',{name:'POV movement joystick'}).boundingBox();
    const look=await page.getByRole('button',{name:'POV look touchpad'}).boundingBox();
    const client=await context.newCDPSession(page);
    const a={x:move.x+move.width/2,y:move.y+move.height*.2,id:1};
    const b={x:look.x+look.width/2,y:look.y+look.height/2,id:2};
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
    await page.waitForTimeout(500);
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[a,{...b,x:b.x+20}]});
    await page.waitForTimeout(300);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(600);const p2=await pose();
    check('Simultaneous mobile POV movement and look',Math.hypot(p2.x-p1.x,p2.z-p1.z)>.3&&Math.abs(p2.yaw-p1.yaw)>.01,{p1,p2});
    const stopped=await pose();await page.waitForTimeout(700);const still=await pose();
    check('Releasing mobile controls stops movement',Math.hypot(still.x-stopped.x,still.z-stopped.z)<.03);
    await page.screenshot({path:`${output}/screenshots/step5_pov_mobile.png`});await client.detach();
    await page.getByRole('button',{name:'Tactical 3D',exact:true}).click();await page.waitForFunction(()=>window.__jz01.view==='tactical');
    await page.getByRole('button',{name:'Astronaut POV',exact:true}).click();await page.waitForFunction(()=>window.__jz01POV);
    const restored=await pose();check('Tactical / POV switching preserves ground position',Math.hypot(restored.x-still.x,restored.z-still.z)<.03);
    await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(250);
    const box=await page.locator('canvas').boundingBox();
    await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.72,box.y+box.height*.52,{steps:12});await page.mouse.up();
    const looked=await pose();check('Desktop drag look',Math.abs(looked.yaw-restored.yaw)>.01);
    await page.getByRole('button',{name:'Lock mouse',exact:true}).click();
    await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('.jz01-viewport canvas'));
    await page.mouse.move(700,420);await page.waitForTimeout(100);
    check('Explicit pointer lock enters successfully',await page.evaluate(()=>Boolean(document.pointerLockElement)));
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement,null,{timeout:5000});
    check('Escape releases pointer lock',true);
    await page.keyboard.down('KeyW');await page.waitForTimeout(1200);await page.keyboard.up('KeyW');await page.waitForTimeout(650);
    const walked=await pose();check('WASD follows actual surface',Math.hypot(walked.x-looked.x,walked.z-looked.z)>.6&&Math.abs(walked.y-Math.max(walked.dtm,walked.mesh)-1.7)<1e-5,walked);
    const rest=await pose();await page.waitForTimeout(700);const rest2=await pose();check('WASD release settles',Math.hypot(rest.x-rest2.x,rest.z-rest2.z)<.03);
    const boundary=[];
    for(const [x,z]of [[1e6,1e6],[-1e6,1e6],[-1e6,-1e6],[1e6,-1e6]]){
      // Diagnostic placement is clamped and never accepts a height; actual movement then attempts to cross the edge.
      await page.evaluate(([x,z])=>window.__jz01POV.place(x,z),[x,z]);await page.waitForTimeout(80);
      await page.keyboard.down('KeyW');await page.waitForTimeout(180);await page.keyboard.up('KeyW');await page.waitForTimeout(450);
      boundary.push(await pose());
    }
    check('All four boundary corners block crossing and remain grounded',boundary.every(p=>Math.abs(p.x)<=247.5&&Math.abs(p.z)<=247.5&&Math.abs(p.y-Math.max(p.dtm,p.mesh)-1.7)<1e-5),boundary);
    await page.evaluate(()=>{window.__jz01.camera.position.y=-100;document.querySelector('.jz01-viewport canvas').dispatchEvent(new Event('mars-pov-input'));});await page.waitForTimeout(100);
    check('Underground camera perturbation is corrected',(await page.evaluate(()=>window.__jz01.camera.position.y))>0);
    await page.evaluate(()=>{window.__jz01.camera.position.y=1000;document.querySelector('.jz01-viewport canvas').dispatchEvent(new Event('mars-pov-input'));});await page.waitForTimeout(100);
    const grounded=await pose();check('Flying camera perturbation is corrected',Math.abs((await page.evaluate(()=>window.__jz01.camera.position.y))-grounded.eye)<1e-5);
    await page.getByRole('button',{name:'Reset POV',exact:true}).click();await page.waitForTimeout(150);
    const reset=await pose();check('POV reset restores valid spawn',Math.hypot(reset.x+170,reset.z-100)<.001&&Math.abs(reset.y-Math.max(reset.dtm,reset.mesh)-1.7)<1e-5,reset);
    await page.screenshot({path:`${output}/screenshots/step5_pov_desktop.png`});
    await page.keyboard.down('KeyW');await page.waitForTimeout(1000);
    await page.evaluate(()=>{window.__jz01.frameTimes.length=0;window.__jz01.measuring=true;});
    await page.waitForTimeout(6000);
    result.povPerformance=await page.evaluate(()=>{const r=window.__jz01;r.measuring=false;const s=[...r.frameTimes].sort((a,b)=>a-b);const mean=s.reduce((a,b)=>a+b,0)/s.length;
      return {frames:s.length,fps:1000/mean,meanMs:mean,p95ms:s[Math.floor(s.length*.95)],drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles};});
    await page.keyboard.up('KeyW');await page.waitForTimeout(600);
    check('POV moving FPS measured',result.povPerformance.frames>20&&Number.isFinite(result.povPerformance.fps),result.povPerformance);
    await page.keyboard.down('KeyW');await page.waitForTimeout(150);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(100);
    const blur=await pose();await page.waitForTimeout(400);const blur2=await pose();await page.keyboard.up('KeyW');
    check('Focus loss clears held movement',Math.hypot(blur.x-blur2.x,blur.z-blur2.z)<.001);
    if(completion){
      await page.evaluate(()=>{const b=document.createElement('button');b.id='outside-viewer-test';b.textContent='Host application control';document.body.append(b);b.focus();});
      const unfocused=await pose();await page.keyboard.down('KeyW');await page.waitForTimeout(350);await page.keyboard.up('KeyW');
      const unfocused2=await pose();check('Host UI focus does not move the embedded POV',Math.hypot(unfocused.x-unfocused2.x,unfocused.z-unfocused2.z)<.001);
      await page.evaluate(()=>document.getElementById('outside-viewer-test').remove());
    }
    await page.getByRole('button',{name:'Tactical 3D',exact:true}).click();await page.waitForFunction(()=>window.__jz01.view==='tactical');
    if(completion){
      const noReload=await page.evaluate(()=>({navigationEntries:performance.getEntriesByType('navigation').length,meshes:window.__jz01.root.children.length}));
      check('View switches do not navigate or reload',noReload.navigationEntries===1,noReload);
      await page.evaluate(()=>{const wrapper=document.querySelector('.jz01-demo');wrapper.style.width='640px';wrapper.style.height='480px';});await page.waitForTimeout(400);
      const box=await page.locator('.mars-terrain-viewer').boundingBox();
      const canvas=await page.locator('canvas').boundingBox();
      check('Reusable viewer respects a 640 by 480 parent',Math.abs(box.width-640)<1&&Math.abs(box.height-480)<1&&Math.abs(canvas.width-640)<1&&Math.abs(canvas.height-480)<1,{box,canvas});
      // Control operation must not depend on the optional diagnostic global.
      await page.evaluate(()=>{window.__viewerRef=window.__jz01;delete window.__jz01;});
      const start=await page.evaluate(()=>window.__viewerRef.camera.position.distanceTo(window.__viewerRef.controls.target));
      await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForTimeout(850);
      const end=await page.evaluate(()=>window.__viewerRef.camera.position.distanceTo(window.__viewerRef.controls.target));
      check('Camera controls work without a diagnostic global',end<start,{start,end});
      await page.evaluate(()=>{window.__jz01=window.__viewerRef;delete window.__viewerRef;});
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(base); await page.waitForFunction(() => document.documentElement.dataset.cinematicReady === 'true');
  check('Existing exploration view preserved', await page.locator('canvas').count() === 1 && await page.locator('.mx-gauge').count() === 4);
  await page.goto(`${base}/?workspace=science`); await page.waitForFunction(() => document.documentElement.dataset.terrainReady === 'true');
  check('Existing science view preserved', await page.locator('canvas').count() === 1);
  // Isolate intentional asset-failure errors from the successful-flow console log.
  const failurePage = await context.newPage();
  await failurePage.route('**/assets/mars/jz01/terrain.glb', route => route.abort('failed'));
  await failurePage.goto(`${base}/?workspace=jz01`);
  await failurePage.getByRole('heading', { name: 'Terrain could not load' }).waitFor();
  check('Asset loading failure is recoverable', await failurePage.getByRole('button', { name: 'Retry preview' }).isVisible());
  await failurePage.unroute('**/assets/mars/jz01/terrain.glb'); await failurePage.getByRole('button', { name: 'Retry preview' }).click();
  await failurePage.waitForFunction(() => document.querySelector('.jz01-preview')?.dataset.ready === 'true');
  check('Retry reloads real asset', true); await failurePage.close();
  const hashes = {};
  const sourceBaseline = JSON.parse(await readFile('docs/jz01/validation.json', 'utf8')).checks['Input integrity'].detail.hashes;
  for (const [name, expected] of Object.entries(sourceBaseline)) assert.equal(await hash(`${sourceDir}/${name}`), expected);
  check('All 17 original handoff files unchanged', true);
  for (const [name, expected] of Object.entries(manifest.files_sha256)) {
    hashes[name] = await hash(`${sourceDir}/${name}`); assert.equal(hashes[name], expected);
  }
  hashes['terrain.glb'] = await hash('public/assets/mars/jz01/terrain.glb');
  hashes['JZ01_terrain_scene.blend'] = await hash('generated/jz01/JZ01_terrain_scene.blend');
  check('Validated GLB and Blender scene unchanged', hashes['terrain.glb'] === 'a53e6d64dc9b59a0f94eb91aac3ce1d98582d71c8f0b2c35483e5097c3782f78'
    && hashes['JZ01_terrain_scene.blend'] === 'd4156a056f2da25d8a82c9a1a6b8a11e82bc02c4482d5e014d2636720ecd4ca4');
  result.inputHashes = hashes;
  check('Successful flows have no browser console or asset errors', result.errors.length === 0 && result.failedRequests.length === 0,
    { errors: result.errors, requests: result.failedRequests });
} catch (error) {
  result.failure = String(error); process.exitCode = 1; console.error(error);
} finally {
  await writeFile(`${output}/${step4 ? evidencePrefix+'-runtime-results' : 'runtime-results'}.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
