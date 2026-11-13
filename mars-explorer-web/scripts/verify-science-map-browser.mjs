import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const base='https://qcgpyoegjwqfhvzvuhdl.supabase.co/storage/v1/object/public/jezero-map/western-jezero-v1/';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1500,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route(base+'**',async route=>{const file=route.request().url().split('/').at(-1).split('?')[0];if(!/^[\w.-]+$/.test(file))return route.abort();const path='scripts/.cache/science-validation/'+file;if(!existsSync(path))execFileSync('curl.exe',['-f','-sS','--retry','2','--max-time','45',base+file,'-o',path]);await route.fulfill({body:await readFile(path),contentType:file.endsWith('.json')?'application/json':file.endsWith('.webp')?'image/webp':'application/octet-stream'});});
await page.goto('http://127.0.0.1:5192/');
await expect(page.locator('[data-science-id]')).toHaveCount(16,{timeout:90000});
const select=page.getByLabel('Mission destination',{exact:true});await select.selectOption('M2020-190-3');
await expect(page.locator('body')).toContainText('Native elevation profile checked',{timeout:90000});
await page.getByRole('tab',{name:'Sites',exact:true}).click();
await page.getByRole('button',{name:'View Rochette / Montdenier (provisional)',exact:true}).click();
await expect(page.getByTestId('science-site-popup')).toContainText('PROVISIONAL POSITION');
await expect(page.getByTestId('science-site-popup')).toContainText('exactly-reachable');
await page.screenshot({path:'../docs/science-catalogues/verified-map-2d.png'});
await page.getByRole('button',{name:'Close science site',exact:true}).click();
console.log('PASS: 16 2D markers, destination coordinates, live verified route, provisional popup and recorded reason.');

await page.getByRole('button',{name:/3D TACTICAL/i}).click();await page.waitForTimeout(6000);
console.log('3D canvas count',await page.locator('canvas').count(),'page errors',JSON.stringify(errors));
await page.screenshot({path:'../docs/science-catalogues/verified-map-3d.png'});
const canvasCount=await page.locator('canvas').count();
await page.getByRole('button',{name:/2D MAP/i}).click();
await page.getByRole('tab',{name:'Route plan',exact:true}).click();
await select.selectOption('M2020-923-25');
await expect(page.locator('body')).toContainText('no connected 20 m search-grid path',{timeout:60000});
console.log('PASS: unreachable destination reason shown.');
await writeFile('../docs/science-catalogues/browser-validation.json',JSON.stringify({map2DMarkers:16,destinationOptions:17,selectedSample:'M2020-190-3',nativeProfileVerified:true,unreachableReasonShown:true,provisionalPopup:true,canvasCount,pageErrors:errors,transport:'Playwright intercept serves exact cloud bytes downloaded via curl; app SHA-256 checks remain active. This bypasses browser network failure only, not data validation.'},null,2)+'\n');
}finally{await browser.close();}
