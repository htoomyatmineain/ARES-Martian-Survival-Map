import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
const cache=path.join(process.env.LOCALAPPDATA,'ms-playwright');
const executablePath=existsSync(chromium.executablePath())?undefined:readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().reverse().map(n=>path.join(cache,n,'chrome-headless-shell-win64','chrome-headless-shell.exe')).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
// Reproduce an unavailable remote map: localhost must work without browser cloud access.
await page.route('https://qcgpyoegjwqfhvzvuhdl.supabase.co/**',r=>r.abort());
const panel=page.locator('.rm-emergency-panel');
const button=name=>panel.getByRole('button',{name,exact:true});
try {
 await page.goto('http://localhost:5173/?workspace=regional');
 await page.locator('.rm-primary-nav').getByRole('button',{name:'Emergency',exact:true}).click();
 await expect(panel).toBeVisible({timeout:60000});
 console.log('PASS terrain and emergency panel load with browser cloud requests blocked');
 for(const kind of ['oxygen','rover-failure','visibility']) {
  if(kind!=='oxygen') await button('Reset').click();
  await panel.getByRole('combobox',{name:'Emergency type',exact:true}).selectOption(kind);
  await panel.getByRole('combobox',{name:'Emergency timing',exact:true}).selectOption('outbound');
  await button('Select on map').click();
  const at=await page.locator('.rm-emergency svg.rm-svg').evaluate(el=>{const p=new DOMPoint(2200,1600).matrixTransform(el.getScreenCTM());return{x:p.x,y:p.y};});
  await page.mouse.click(at.x,at.y);
  await expect(button('Start Simulation')).toBeEnabled({timeout:120000});
  await expect(panel.getByRole('link',{name:'Simulation guide'})).toHaveCount(0);
  await button('Speed up 2×').click();
  await expect(button('Speed up 2×')).toHaveAttribute('aria-pressed','true');
  await button('Start Simulation').click();
  await expect(page.locator('.rm-emergency-arrival-alert')).toBeVisible({timeout:30000});
  await expect(button('Return to Habitat')).toBeEnabled({timeout:120000});
  await expect(button('Continue Mission')).toBeDisabled();
  await button('Return to Habitat').click();
  await expect(page.locator('.rm-emergency-arrival-alert h2')).toHaveText('Returning to habitat');
  await expect(page.locator('.rm-emergency-arrival-alert h2')).toHaveText('At habitat',{timeout:30000});
  console.log(`PASS ${kind}: verified route, event, blocked science, return and completion`);
 }
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'scripts/.cache/emergency/local-emergency-fixed.png'});
 console.log('PASS no browser runtime errors');
} catch(e) { console.log((await page.locator('body').innerText()).slice(-4000));throw e; }
finally { await browser.close(); }
