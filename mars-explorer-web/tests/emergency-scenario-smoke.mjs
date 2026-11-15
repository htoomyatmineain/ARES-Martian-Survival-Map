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

const errors=[];page.on('pageerror',e=>errors.push(e.message));const panel=()=>page.locator('.rm-emergency-panel');const button=name=>panel().getByRole('button',{name,exact:true});const log=m=>console.log(m);
const selectPoint=async()=>{await button('Select emergency location on map').click();const at=await page.locator('.rm-emergency svg.rm-svg').evaluate(el=>{const p=new DOMPoint(2200,1600).matrixTransform(el.getScreenCTM());return{x:p.x,y:p.y}});await page.mouse.click(at.x,at.y);};
const start=async()=>{await expect(button('Start Simulation')).toBeEnabled({timeout:120000});await button('Start Simulation').click();await page.clock.runFor(20100);await expect(page.locator('[aria-label="Emergency case"]')).toBeVisible();await expect(panel().getByRole('heading',{name:'Verifying return routes…',exact:true})).toHaveCount(0,{timeout:120000});};
try{
 await page.goto(process.env.ARES_TEST_URL??'http://127.0.0.1:4181/explorer',{waitUntil:'domcontentloaded'});await page.locator('.rm-primary-nav').getByRole('button',{name:'Emergency',exact:true}).click();await expect(panel()).toBeVisible({timeout:120000});await page.clock.install();
 await selectPoint();await start();await expect(button('Continue Mission')).toBeEnabled();await button('Continue Mission').click();await page.clock.runFor(20100);await expect(panel().getByText('Planned science time completed',{exact:false})).toBeVisible();await panel().getByRole('checkbox').last().check();await button('Initiate Return to Base · SIMULATED').click();await page.clock.runFor(20100);await expect(panel().getByText('Returned to simulated habitat',{exact:false})).toBeVisible();await page.screenshot({path:root+'/scenario-onsite-return.png'});log('PASS onsite activity consumption, crew confirmation and return without active Mission');
 if(process.env.ARES_SCENARIO_ONLY!=='onsite'){
 await button('Reset').click();await panel().getByRole('combobox',{name:'Emergency trigger stage'}).selectOption('outbound');await panel().getByRole('slider',{name:'Oxygen at emergency arrival'}).fill('5');await selectPoint();await start();await expect(button('Continue Mission')).toBeDisabled();await expect(page.getByRole('heading',{name:'LOW OXYGEN',exact:true})).toBeVisible();log('PASS low oxygen before destination blocks science');
 await button('Reset').click();await panel().getByRole('combobox',{name:'Emergency type'}).selectOption('rover-failure');await panel().getByRole('combobox',{name:'Emergency trigger stage'}).selectOption('returning');await selectPoint();await expect(button('Start Simulation')).toBeDisabled();await panel().getByRole('checkbox',{name:'Acknowledge pre-event science'}).check();await start();await expect(button('Continue Mission')).toBeDisabled();await expect(button('Initiate Return to Base · SIMULATED')).toBeEnabled();await button('Initiate Return to Base · SIMULATED').click();await page.clock.runFor(20100);await expect(panel().getByText('Returned to simulated habitat',{exact:false})).toBeVisible();log('PASS return-leg rover failure uses acknowledged science and walking return');
 await button('Reset').click();await panel().getByRole('combobox',{name:'Emergency type'}).selectOption('visibility');await panel().getByRole('spinbutton',{name:'Event visibility metres'}).fill('10');await selectPoint();await start();await expect(button('Initiate Return to Base · SIMULATED')).toBeDisabled();await expect(button('Emergency Contingency')).toBeEnabled();await button('Contact Base · SIMULATED').click();await expect(panel().getByText('Local simulated requests: 1')).toBeVisible();await button('Emergency Contingency').click();await page.screenshot({path:root+'/scenario-visibility-hold.png'});log('PASS severe visibility holds movement and offers contact/contingency');
 await page.getByRole('button',{name:'3D Tactical',exact:true}).click();await expect(page.locator('.rm-emergency-scene canvas')).toBeVisible({timeout:60000});log('PASS 3D mounts with shared event state');}assert.deepEqual(errors,[]);log('PASS no browser runtime errors');
}catch(e){console.log(e.stack);console.log((await panel().innerText().catch(()=>page.locator('body').innerText())).slice(-2400));await page.screenshot({path:root+'/scenario-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
