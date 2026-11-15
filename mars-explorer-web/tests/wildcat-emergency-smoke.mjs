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
 await panel.getByRole('combobox',{name:'Emergency destination',exact:true}).selectOption('wildcat-ridge-hazeltop');
 await expect(button('Start Simulation')).toBeEnabled({timeout:180000});
 const points=await page.getByTestId('emergency-planned-route').getAttribute('points');
 const last=points.trim().split(/\s+/).at(-1).split(',').map(Number);
 assert.ok(Math.hypot(last[0]-(-793.4144988766204),last[1]-80.78726349538618)<.01);
 await expect(page.getByTestId('approach-endpoint')).toHaveCount(0);
 console.log('PASS Wildcat Ridge exact route displayed and native profiles verified with default Light kit');
 await page.screenshot({path:'scripts/.cache/emergency/wildcat-exact-route.png'});
 await panel.getByRole('combobox',{name:'Emergency type',exact:true}).selectOption('rover-failure');
 await button('Speed up 2×').click();
 await button('Start Simulation').click();
 await expect(page.locator('.rm-emergency-arrival-alert')).toBeVisible({timeout:20000});
 await expect(button('Hold Position')).toBeEnabled({timeout:180000});
 await expect(button('Return to Habitat')).toBeDisabled();
 console.log('PASS independent Light kit walking return remains blocked when no loaded route exists');
 assert.deepEqual(errors,[]);
} finally { await browser.close(); }
