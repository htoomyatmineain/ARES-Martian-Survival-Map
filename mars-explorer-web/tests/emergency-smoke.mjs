import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';
const root='scripts/.cache/emergency';await mkdir(root,{recursive:true});
const cache=path.join(process.env.LOCALAPPDATA??'', 'ms-playwright');
const cached=existsSync(cache)?readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(cache,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(existsSync):undefined;
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??(existsSync(chromium.executablePath())?undefined:cached);
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
await mkdir(root+'/terrain-cache',{recursive:true});
await page.route('**/western-jezero-v1/*',async route=>{
 const file=new URL(route.request().url()).pathname.split('/').at(-1);const target=root+'/terrain-cache/'+file;
 let body;try{body=await readFile(target);}catch{const response=await route.fetch({timeout:120000});if(!response.ok())return route.fulfill({response});body=await response.body();await writeFile(target,body);}
 await route.fulfill({status:200,body,headers:{'access-control-allow-origin':'*','content-type':file.endsWith('.json')?'application/json':file.endsWith('.webp')?'image/webp':'application/octet-stream'}});
});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const log=(name,data={})=>console.log(JSON.stringify({check:name,...data}));
const nav=name=>page.locator('.rm-primary-nav').getByRole('button',{name,exact:true});
const panel=()=>page.locator('.rm-emergency-panel');
const svg=()=>page.locator('.rm-emergency .rm-map2d svg.rm-svg');
const select=async point=>{await panel().getByRole('button',{name:'Select emergency location on map',exact:true}).click();const at=await svg().evaluate((el,p)=>{const v=new DOMPoint(p.x,p.z).matrixTransform(el.getScreenCTM());return {x:v.x,y:v.y}},point);await page.mouse.click(at.x,at.y);await expect(panel().getByRole('button',{name:'Start Simulation',exact:true})).toBeEnabled({timeout:120000});};
const field=async name=>panel().locator('dt').filter({hasText:new RegExp('^'+name+'$')}).locator('+ dd').first().innerText();
try{
await page.goto('http://127.0.0.1:5173/explorer',{waitUntil:'domcontentloaded'});await nav('Emergency').click();await expect(panel()).toBeVisible({timeout:120000});log('hosted NASA terrain loaded');
await page.clock.install();await panel().getByRole('slider',{name:'Oxygen at emergency arrival'}).fill('0');await expect(panel().getByRole('slider')).toHaveValue('0');await panel().getByRole('slider').fill('100');await expect(panel().getByRole('slider')).toHaveValue('100');assert.equal(await panel().getByRole('button',{name:/^\d+%/}).count(),0);
if(!process.env.ARES_SMOKE_MISSION_ONLY){
for(const [oxygen,point] of [[90,{x:2000,z:1500}],[30,{x:2200,z:1600}],[60,{x:2000,z:1600}],[5,{x:1900,z:1700}]]){
 await panel().getByRole('slider',{name:'Oxygen at emergency arrival'}).fill(String(oxygen));await select(point);
 await expect(svg().locator('[data-testid="emergency-route-line"]')).toHaveCount(0);
 if(oxygen<=10){await expect(panel().getByRole('combobox',{name:'Science task'})).toHaveValue('generic');assert.equal(await panel().locator('.rm-emergency-science a').count(),0);}else{await expect(panel().getByRole('combobox',{name:'Science task'}).locator('option')).not.toHaveCount(1,{timeout:30000});assert((await panel().getByRole('combobox',{name:'Science task'}).locator('option').count())>=2);assert((await panel().locator('.rm-emergency-science a').count())>0);}
 await panel().getByText('Mission details',{exact:true}).click();await expect(panel().getByText('Science objective/value:',{exact:false})).toBeVisible();await panel().getByText('Mission details',{exact:true}).click();
 if(oxygen===90){await panel().getByRole('combobox',{name:'Science task'}).selectOption('target-assessment');await panel().getByRole('combobox',{name:'Carried equipment'}).selectOption('heavy');}
 if(oxygen===30){await panel().getByRole('combobox',{name:'Science task'}).selectOption('surface-context');await panel().getByRole('combobox',{name:'Carried equipment'}).selectOption('baseline');}
 if(oxygen===60){await panel().getByRole('combobox',{name:'Science task'}).selectOption('context-imaging');await panel().getByRole('combobox',{name:'Carried equipment'}).selectOption('baseline');await expect(panel().getByRole('button',{name:'Start Simulation',exact:true})).toBeDisabled();await panel().getByRole('combobox',{name:'Carried equipment'}).selectOption('light');await panel().getByRole('checkbox',{name:/Shortened task/}).check();}
 await expect(panel().getByRole('combobox',{name:'Activity'}).locator('option[value=run]')).toBeDisabled();
 await expect(panel().getByRole('button',{name:'Start Simulation',exact:true})).toBeEnabled({timeout:120000});

 log('verified outbound',{oxygen,location:await field('Local coordinates'),distance:await field('Outbound route')});
 await panel().getByRole('button',{name:'Start Simulation',exact:true}).click();await expect(panel().getByRole('slider',{name:'Oxygen at emergency arrival'})).toBeDisabled();
 const before=await svg().locator('[data-testid="eva-crew-marker"]').getAttribute('transform');await page.clock.runFor(10000);
 const snapshot=await svg().evaluate(el=>({marker:el.querySelector('[data-testid="eva-crew-marker"]').getAttribute('transform'),trail:el.querySelector('[data-testid="emergency-route-line"]').getAttribute('points')}));assert.notEqual(snapshot.marker,before);assert.equal(snapshot.trail.trim().split(/\s+/).at(-1),snapshot.marker.replace('translate(','').replace(')','').replace(' ',','));await page.clock.runFor(10100);
 await expect(panel().getByRole('heading',{name:'Decision Support',exact:true})).toBeVisible();
 await expect(panel().getByRole('heading',{name:'Verifying return routes…',exact:true})).toHaveCount(0,{timeout:120000});
 const arrived=(await svg().locator('[data-testid="eva-crew-marker"]').getAttribute('transform')).replace('translate(','').replace(')','').split(' ').map(Number);assert(Math.hypot(arrived[0]-point.x,arrived[1]-point.z)<.01);
 const result=await panel().locator('.rm-emergency-result').innerText();
 assert(result.includes(oxygen<=10?'Emergency Contingency':'Insufficient Data'));await panel().getByRole('button',{name:'Contact Base · SIMULATED',exact:true}).click();await expect(panel().getByText('Local simulated requests: 1',{exact:true})).toBeVisible();
 assert.equal(await svg().locator('[data-testid="emergency-route-line"]').getAttribute('stroke'),'#f39b58');
 if(oxygen===60)assert.equal(await field('Task duration'),'7.0 min');log('arrival decision and return',{oxygen,result:result.slice(0,650)});
 if(oxygen<=10){await panel().evaluate(el=>el.scrollTop=0);assert.equal(await panel().locator('.rm-emergency-case h2').evaluate(el=>getComputedStyle(el).fontSize),'24px');const top=await panel().locator('.rm-emergency-case').boundingBox();const parent=await panel().boundingBox();assert(top.y>=parent.y&&top.y-parent.y<50);assert.equal(await panel().locator('.rm-emergency-result dd').first().evaluate(el=>getComputedStyle(el).fontSize),'14px');await page.screenshot({path:root+'/critical-desktop.png'});}
 await panel().getByRole('button',{name:'Reset',exact:true}).click();await expect(panel().getByRole('button',{name:'Start Simulation',exact:true})).toBeDisabled();assert.equal(await field('Emergency location'),'Not selected');
}
// Tab switching must discard the independent Emergency simulation without overwriting Map.
await select({x:2000,z:1500});await panel().getByRole('button',{name:'Start Simulation',exact:true}).click();await nav('Map').click();await nav('Emergency').click();assert.equal(await field('Emergency location'),'Not selected');log('reset and traveling-tab cleanup');
// Tactical selection uses actual rendered terrain click; verify same coordinates in 2D afterwards.
await page.getByRole('button',{name:'3D Tactical',exact:true}).click();const canvas=page.locator('.rm-emergency-scene canvas');await expect(canvas).toBeVisible({timeout:60000});await page.waitForTimeout(1500);
await panel().getByRole('button',{name:'Select emergency location on map',exact:true}).click();const box=await canvas.boundingBox();await page.mouse.click(box.x+box.width*.54,box.y+box.height*.58);await expect(panel().locator('dt').filter({hasText:'Local coordinates'}).locator('+ dd')).not.toHaveText('—',{timeout:15000});
const threeCoordinates=await field('Local coordinates');await page.getByRole('button',{name:'2D Map',exact:true}).click();assert.equal(await field('Local coordinates'),threeCoordinates);log('3D click and 2D coordinate agreement',{coordinates:threeCoordinates});
await panel().getByRole('button',{name:'Reset',exact:true}).click();
for(const size of [{width:1024,height:768},{width:700,height:900},{width:390,height:844}]){await page.setViewportSize(size);await page.screenshot({path:root+`/layout-${size.width}.png`});const bounds=await page.locator('.rm-emergency').evaluate(el=>({width:el.scrollWidth,client:el.clientWidth,body:document.documentElement.scrollWidth,viewport:innerWidth}));assert(bounds.body<=bounds.viewport);log('responsive layout',{...size,bounds});}
await page.setViewportSize({width:1440,height:1000});
}
// Existing Map + Mission workflow with real terrain and 20-minute science snapshot.
await nav('Map').click();await page.setViewportSize({width:390,height:844});const phoneNav=await page.locator('.rm-primary-nav').boundingBox();assert(phoneNav.x+phoneNav.width<=391);await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Set destination',exact:true}).click();const map=page.locator('.rm-stage .rm-map2d svg.rm-svg');const missionPoint=await map.evaluate(el=>{const v=new DOMPoint(2000,1500).matrixTransform(el.getScreenCTM());return {x:v.x,y:v.y}});await page.mouse.click(missionPoint.x,missionPoint.y);await nav('Mission').click();await page.getByRole('button',{name:'Review mission',exact:true}).click();await expect(page.getByRole('button',{name:'Start EVA simulation',exact:true})).toBeEnabled({timeout:120000});await page.getByRole('button',{name:'Start EVA simulation',exact:true}).click();
await page.clock.runFor(20000);await expect(page.getByRole('button',{name:'Begin science task',exact:true})).toBeVisible();await nav('Emergency').click();assert.notEqual(await field('Current Mission EVA remaining · preview'),'Unknown');
await select({x:2000,z:1500});await panel().getByRole('button',{name:'Start Simulation',exact:true}).click();await page.clock.runFor(20100);await expect(panel().getByRole('heading',{name:'Continue Mission',exact:true})).toBeVisible({timeout:120000});log('Mission snapshot integration and continuation');const sharedMetrics=await page.getByRole('region',{name:'Route Comparison',exact:true}).innerText();await page.getByRole('button',{name:'3D Tactical',exact:true}).click();await expect(page.locator('.rm-emergency-scene canvas')).toBeVisible({timeout:60000});assert.equal(await page.getByRole('region',{name:'Route Comparison',exact:true}).innerText(),sharedMetrics);await page.screenshot({path:root+'/phase4-return-3d.png'});await page.getByRole('button',{name:'2D Map',exact:true}).click();await panel().getByRole('button',{name:'Initiate Return to Base · SIMULATED',exact:true}).click();await page.clock.runFor(20100);assert.equal(await svg().locator('[data-testid="eva-crew-marker"]').getAttribute('transform'),'translate(1900 1500)');log('shared 2D/3D metrics and simulated return');
await panel().getByRole('button',{name:'Reset',exact:true}).click();await panel().getByRole('slider').fill('30');await select({x:2000,z:1500});await expect(panel().getByRole('combobox',{name:'Science task'}).locator('option')).not.toHaveCount(1,{timeout:30000});await panel().getByRole('combobox',{name:'Science task'}).selectOption('context-imaging');await panel().getByText('Configurable simulation assumptions',{exact:true}).click();await panel().getByRole('spinbutton',{name:'Task consumption multiplier',exact:true}).fill('5');await panel().getByRole('button',{name:'Start Simulation',exact:true}).click();await page.clock.runFor(20100);await expect(panel().getByRole('heading',{name:'Shorten Mission',exact:true})).toBeVisible({timeout:120000});await panel().getByRole('button',{name:'Shorten Mission',exact:true}).click();assert.equal(await field('Task duration'),'7.0 min');await expect(panel().getByRole('heading',{name:'Continue Mission',exact:true})).toBeVisible();log('workload-based recommendation change and predefined partial action');

await nav('Mission').click();await expect(page.getByRole('button',{name:'Begin science task',exact:true})).toBeVisible();log('Mission remains unchanged by Emergency');
// Missing native hazards must fail closed.
await page.route('**/data/routing/native-hazards.bin',r=>r.fulfill({status:503,body:'unavailable'}));await nav('Emergency').click();await panel().getByRole('button',{name:'Select emergency location on map',exact:true}).click();await svg().focus();await svg().press('ArrowRight');await expect(panel().getByRole('button',{name:'Start Simulation',exact:true})).toBeDisabled();await expect(panel().getByRole('status').filter({hasText:'Native slope data unavailable'})).toBeVisible({timeout:15000});log('missing hazard data fails closed');
const broken=await context.newPage();await broken.route('**/western-jezero-v1/**',r=>r.fulfill({status:503,body:'unavailable'}));await broken.goto('http://127.0.0.1:5173/explorer');await broken.locator('.rm-primary-nav').getByRole('button',{name:'Emergency',exact:true}).click();await expect(broken.getByRole('heading',{name:'Terrain could not load',exact:true})).toBeVisible({timeout:15000});log('missing terrain shows explicit error');await broken.close();
assert.deepEqual(errors,[]);log('browser smoke PASS');
}catch(error){console.log('SMOKE FAIL',error.stack);await page.screenshot({path:root+'/failure.png'});console.log((await page.locator('.rm-emergency').innerText().catch(()=>page.locator('body').innerText())).slice(-4000));process.exitCode=1;}finally{await browser.close();}
