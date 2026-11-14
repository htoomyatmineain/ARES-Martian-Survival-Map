import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,serviceWorkers:'block'});
page.setDefaultTimeout(25000);const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,detail)=>{assert.ok(ok,name);checks.push({name,status:'PASS',detail});console.log('PASS',name);};
const button=name=>page.getByRole('button',{name,exact:true});
const pose=()=>page.evaluate(()=>JSON.parse(document.documentElement.dataset.sciencePlayer));
try{
  await page.goto('http://localhost:4173/?workspace=science');await page.waitForFunction(()=>document.documentElement.dataset.terrainReady==='true');
  await page.evaluate(()=>window.__scienceSmoke='preserved');
  check('Original ARES science workspace retained',await page.getByRole('heading',{name:/Jezero Crater/}).isVisible()&&await button('3D VIEW').isVisible()&&await button('2D VIEW').isVisible());
  check('Original four-times map relief retained',await page.locator('#exaggeration').inputValue()==='4');
  await page.screenshot({path:'docs/science-3d-preserved.png'});
  await button('2D VIEW').click();await page.waitForTimeout(200);check('Original 2D map still works',(await button('2D VIEW').getAttribute('class')).includes('active'));
  await button('EXPLORE').click();await page.waitForFunction(()=>document.documentElement.dataset.sciencePlayer);
  const initial=await pose();check('Walking starts with 1.7 meter terrain clearance',Math.abs(initial.y-initial.ground-1.7)<.005,initial);
  check('Walking uses true scale without altering saved map exaggeration',await page.locator('#exaggeration').inputValue()==='1'&&await page.locator('#exaggeration').isDisabled());
  await page.keyboard.down('KeyW');await page.waitForTimeout(750);await page.keyboard.up('KeyW');await page.waitForTimeout(500);const walked=await pose();
  check('Free WASD walking follows this CTX terrain',Math.hypot(walked.x-initial.x,walked.z-initial.z)>.5&&Math.abs(walked.y-walked.ground-1.7)<.005,walked);
  await page.mouse.move(650,400);await page.mouse.down();await page.mouse.move(740,415,{steps:12});await page.mouse.up();await page.waitForTimeout(100);
  check('Mouse drag changes walking look',Math.abs((await pose()).yaw-walked.yaw)>.01);
  await button('Reset camera').click();await page.waitForTimeout(100);const reset=await pose();check('Existing reset camera resets walking',Math.hypot(reset.x-initial.x,reset.z-initial.z)<.01);
  await page.screenshot({path:'docs/science-walking.png'});
  await button('3D VIEW').click();await page.waitForTimeout(200);
  check('Original 3D and four-times relief restored',await page.locator('#exaggeration').inputValue()==='4'&&!await page.locator('#exaggeration').isDisabled());
  await button('EXPLORE').click();await page.waitForTimeout(150);const back=await pose();check('Walking survives view switching',Math.hypot(back.x-reset.x,back.z-reset.z)<.01);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
  const move=await button('POV movement joystick').boundingBox(),look=await button('POV look touchpad').boundingBox();
  const client=await page.context().newCDPSession(page),a={x:move.x+move.width/2,y:move.y+move.height*.2,id:1},b={x:look.x+look.width/2,y:look.y+look.height/2,id:2};
  const p0=await pose();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await page.waitForTimeout(450);
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[a,{...b,x:b.x+20}]});await page.waitForTimeout(200);
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);const p1=await pose();
  check('Mobile move and look work on science page',Math.hypot(p1.x-p0.x,p1.z-p0.z)>.25&&Math.abs(p1.yaw-p0.yaw)>.01,{p0,p1});await client.detach();
  check('Page did not reload when switching',await page.evaluate(()=>window.__scienceSmoke==='preserved'));
  check('No browser runtime errors',errors.length===0,errors);
}catch(e){checks.push({status:'FAIL',error:String(e)});process.exitCode=1;console.error(e);}
finally{await writeFile('docs/science-walking-smoke.json',JSON.stringify(checks,null,2));await browser.close();}
