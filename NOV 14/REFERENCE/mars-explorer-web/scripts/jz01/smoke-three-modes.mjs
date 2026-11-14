import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
const results=[];const check=(name,ok,detail)=>{assert.ok(ok,name);results.push({name,status:'PASS',detail});console.log('PASS',name);};
const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,serviceWorkers:'block'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
const button=name=>page.getByRole('button',{name,exact:true});
const pose=()=>page.evaluate(()=>({x:window.__jz01POV.x,z:window.__jz01POV.z,y:window.__jz01POV.y,mesh:window.__jz01POV.mesh,dtm:window.__jz01POV.dtm,yaw:window.__jz01POV.yaw}));
try{
  await page.goto('http://localhost:4173/?workspace=jz01');
  await page.waitForFunction(()=>document.querySelector('.jz01-map')?.dataset.ready==='true'&&window.__jz01);
  const labels=await page.getByRole('group',{name:'Terrain view'}).getByRole('button').allTextContents();
  check('One switch, exactly three modes',JSON.stringify(labels)===JSON.stringify(['2D Map',"Bird's-Eye 3D",'Explore'])&&await page.locator('[aria-label="Presentation mode"],.jz01-facts,nav').count()===0);
  const map=page.locator('.jz01-map svg');
  for(const [file,label] of [['route_dijkstra.csv','Existing Dijkstra baseline'],['route_slope_aware_astar.csv','Existing slope-aware A* baseline']]){
    const csv=await readFile(`source-data/JZ01_Codex_Handoff/${file}`,'utf8');
    const expected=csv.trim().split(/\r?\n/).slice(1).map(line=>{const [east,south]=line.split(',').map(Number);return `${east-250},${south-250}`;}).join(' ');
    check(`${file}: all supplied route coordinates align`,await page.locator(`polyline[aria-label="${label}"]`).getAttribute('points')===expected);
  }
  const beforeMap=await map.getAttribute('viewBox');await page.mouse.move(640,400);await page.mouse.wheel(0,-300);await page.waitForTimeout(100);
  const zoomed=await map.getAttribute('viewBox');await page.mouse.down();await page.mouse.move(700,430,{steps:8});await page.mouse.up();
  check('2D zoom and pan',beforeMap!==zoomed&&await map.getAttribute('viewBox')!==zoomed);
  await button("Bird's-Eye 3D").click();await page.waitForFunction(()=>window.__jz01.view==='tactical'&&window.__jz01.controls);
  const camera=()=>page.evaluate(()=>window.__jz01.camera.position.toArray());
  const p0=await camera();await page.mouse.move(640,400);await page.mouse.down();await page.mouse.move(780,460,{steps:12});await page.mouse.up();await page.waitForTimeout(500);
  const p1=await camera();check('3D pointer orbit and tilt',Math.hypot(...p1.map((v,i)=>v-p0[i]))>5&&Math.abs(p1[1]-p0[1])>1);
  const pan0=await page.evaluate(()=>window.__jz01.controls.target.toArray());await page.mouse.down({button:'right'});await page.mouse.move(850,480,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(450);
  const pan1=await page.evaluate(()=>window.__jz01.controls.target.toArray());check('3D pan',Math.hypot(...pan1.map((v,i)=>v-pan0[i]))>1);
  const distance=()=>page.evaluate(()=>window.__jz01.camera.position.distanceTo(window.__jz01.controls.target));
  const d0=await distance();await page.mouse.wheel(0,-300);await page.waitForTimeout(500);check('3D zoom',(await distance())<d0);
  const circle=await page.evaluate(()=>{
    const {camera,controls:c}=window.__jz01;c.enableDamping=false;c.update();const original=camera.position.clone(),offset=original.clone().sub(c.target),radius=offset.length();
    const theta=c.getAzimuthalAngle(),phi=c.getPolarAngle(),points=[];
    for(let i=0;i<=16;i++){camera.position.setFromSphericalCoords(radius,phi,theta+i*2*Math.PI/16).add(c.target);c.update();points.push(camera.position.clone().sub(c.target).toArray());}
    const error=camera.position.distanceTo(original);camera.position.copy(original);c.update();c.enableDamping=true;
    return {full:points.some(p=>p[0]>1)&&points.some(p=>p[0]<-1)&&points.some(p=>p[2]>1)&&points.some(p=>p[2]<-1)&&error<.01,error};
  });check('3D unrestricted full horizontal orbit',circle.full,circle);
  await button('Reset view').click();await page.waitForTimeout(800);const reset=await camera();check('3D reset',Math.hypot(...reset.map((v,i)=>v-p0[i]))<.1);
  await button('Explore').click();await page.waitForFunction(()=>window.__jz01POV&&window.__jz01.view==='pov');
  const walk0=await pose();await page.keyboard.down('KeyW');await page.waitForTimeout(650);await page.keyboard.up('KeyW');await page.waitForTimeout(500);const walk1=await pose();
  check('Explore WASD and ground clearance',Math.hypot(walk1.x-walk0.x,walk1.z-walk0.z)>.4&&Math.abs(walk1.y-Math.max(walk1.dtm,walk1.mesh)-1.7)<.00001);
  await page.mouse.move(640,400);await page.mouse.down();await page.mouse.move(740,420,{steps:8});await page.mouse.up();await page.waitForTimeout(100);
  check('Explore mouse look',Math.abs((await pose()).yaw-walk1.yaw)>.01);
  for(let i=0;i<2;i++){
    await button('2D Map').click();await page.waitForFunction(()=>document.querySelector('.jz01-map')?.dataset.ready==='true');
    await button("Bird's-Eye 3D").click();await page.waitForFunction(()=>window.__jz01.controls&&window.__jz01.view==='tactical');
    await button('Explore').click();await page.waitForFunction(()=>window.__jz01POV&&window.__jz01.view==='pov');
  }
  const afterSwitch=await pose();check('Repeated three-mode switching retains walking position',Math.hypot(afterSwitch.x-walk1.x,afterSwitch.z-walk1.z)<.01);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  const move=await button('POV movement joystick').boundingBox(),look=await button('POV look touchpad').boundingBox();const client=await page.context().newCDPSession(page);
  const a={x:move.x+move.width/2,y:move.y+move.height*.2,id:1},b={x:look.x+look.width/2,y:look.y+look.height/2,id:2};
  const touch0=await pose();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await page.waitForTimeout(400);
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[a,{...b,x:b.x+20}]});await page.waitForTimeout(200);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(450);
  const touch1=await pose();check('Existing mobile walking and looking',Math.hypot(touch1.x-touch0.x,touch1.z-touch0.z)>.2&&Math.abs(touch1.yaw-touch0.yaw)>.01);await client.detach();
  await button('2D Map').click();await page.waitForFunction(()=>document.querySelector('.jz01-map')?.dataset.ready==='true');
  check('Mobile mode switch fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
  const baseline=JSON.parse(await readFile('docs/jz01/validation.json','utf8')).checks['Input integrity'].detail.hashes;
  for(const [name,value]of Object.entries(baseline))assert.equal(await hash(`source-data/JZ01_Codex_Handoff/${name}`),value);
  assert.equal(await hash('public/assets/mars/jz01/terrain.glb'),'a53e6d64dc9b59a0f94eb91aac3ce1d98582d71c8f0b2c35483e5097c3782f78');
  assert.equal(await hash('generated/jz01/JZ01_terrain_scene.blend'),'d4156a056f2da25d8a82c9a1a6b8a11e82bc02c4482d5e014d2636720ecd4ca4');
  for(const [original,copy]of [['texture.png','orthomosaic.png'],['route_dijkstra.csv','route_dijkstra.csv'],['route_slope_aware_astar.csv','route_slope_aware_astar.csv']])assert.equal(await hash(`source-data/JZ01_Codex_Handoff/${original}`),await hash(`public/assets/mars/jz01/${copy}`));
  check('Original dataset, GLB, Blender and supplied route/image bytes preserved',true);check('No browser runtime errors',errors.length===0,errors);
}catch(e){results.push({status:'FAIL',error:String(e)});process.exitCode=1;console.error(e);}
finally{await writeFile('docs/jz01/three-mode-smoke.json',JSON.stringify(results,null,2));await browser.close();}
