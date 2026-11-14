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
const clickPoint=async p=>{const at=await svg().evaluate((el,p)=>{const v=new DOMPoint(p.x,p.z).matrixTransform(el.getScreenCTM());return{x:v.x,y:v.y}},p);await page.mouse.click(at.x,at.y);};
const waitPreview=async p=>{await expect.poll(async()=>{const el=svg().locator('[data-testid="emergency-planned-route"]');if(await el.count()!==1)return false;const last=(await el.getAttribute('points')).trim().split(/\s+/).at(-1).split(',').map(Number);return Math.hypot(last[0]-p.x,last[1]-p.z)<.01},{timeout:120000}).toBe(true);};
try{
await page.goto('http://127.0.0.1:4173/explorer',{waitUntil:'domcontentloaded'});await nav('Emergency').click();await expect(panel()).toBeVisible({timeout:120000});await page.clock.install();
const destination=panel().getByRole('combobox',{name:'Emergency destination'});assert((await destination.locator('option').count())>=3);await destination.selectOption('skinner-ridge-skyland');await expect(svg().locator('[data-testid="emergency-destination-marker"]')).toHaveAttribute('transform',/translate\(-777/);log('named science-site selection and visible pin PASS');
await panel().getByRole('button',{name:'Select emergency location on map',exact:true}).click();await clickPoint({x:2000,z:1500});await waitPreview({x:2000,z:1500});assert.equal(await destination.inputValue(),'custom');await clickPoint({x:2200,z:1600});await waitPreview({x:2200,z:1600});await expect(panel().getByRole('button',{name:'Finish selecting location',exact:true})).toHaveAttribute('aria-pressed','true');await expect(svg().locator('[data-testid="emergency-route-line"]')).toHaveCount(0);log('repeated 2D free clicks update pin, route and mission context PASS');
const sources=panel().locator('.rm-emergency-science details').filter({has:page.locator('summary', {hasText:'Sources & assumptions'})});assert.equal(await sources.evaluate(el=>el.open),false);await expect(panel().getByText('OLINDEX3: valid regional spectral sample only;', {exact:false})).not.toBeVisible();log('technical evidence collapsed PASS');
await page.getByRole('button',{name:'3D Tactical',exact:true}).click();const canvas=page.locator('.rm-emergency-scene canvas');await expect(canvas).toBeVisible({timeout:60000});await expect(page.locator('.rm-emergency-scene [aria-label="Simulated habitat"]')).toBeVisible({timeout:60000});const size=await canvas.evaluate(el=>({w:el.clientWidth||986,h:el.clientHeight||782}));log('3D terrain ready',{size});await canvas.click({position:{x:size.w*.54,y:size.h*.58},timeout:60000});await expect.poll(()=>field('Local coordinates'),{timeout:15000}).not.toBe('E 2200.0, S 1600.0 m');const selected3d=await field('Local coordinates');await page.getByRole('button',{name:'2D Map',exact:true}).click();assert.equal(await field('Local coordinates'),selected3d);log('existing 3D click shares selected coordinates PASS');
await clickPoint({x:2200,z:1600});await waitPreview({x:2200,z:1600});await panel().getByRole('slider').fill('5');await expect(panel().locator('[aria-label="Planning assessment"]').getByRole('heading',{name:'LOW OXYGEN',exact:true})).toBeVisible();
await page.screenshot({path:root+'/selection-planning-preview.png'});await panel().getByRole('button',{name:'Start Simulation',exact:true}).click();await expect(destination).toBeDisabled();await expect(svg().locator('[data-testid="emergency-planned-route"]')).toHaveCount(0);await page.clock.runFor(10000);
const mid=await svg().evaluate(el=>({marker:el.querySelector('[data-testid="eva-crew-marker"]').getAttribute('transform'),trail:el.querySelector('[data-testid="emergency-route-line"]').getAttribute('points')}));assert.equal(mid.trail.trim().split(/\s+/).at(-1),mid.marker.replace('translate(','').replace(')','').replace(' ',','));await page.screenshot({path:root+'/selection-traveled-trail.png'});await page.clock.runFor(10100);await expect(panel().locator('[aria-label="Emergency case"]').getByRole('heading',{name:'LOW OXYGEN',exact:true})).toBeVisible();await expect(svg().locator('[data-testid="emergency-completed-trail"]')).toHaveCount(1);log('preview, locked outbound animation, completed trail and critical DSS alert PASS');assert.deepEqual(errors,[]);
}catch(e){console.log(e.stack);await page.screenshot({path:root+'/selection-failure.png',timeout:10000}).catch(()=>{});console.log((await panel().innerText().catch(()=>page.locator('body').innerText())).slice(0,1200));process.exitCode=1;}finally{await browser.close();}
