import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.env.TEST_URL || 'http://localhost:4173/', { waitUntil: 'networkidle', timeout: 90000 });
try { await page.waitForFunction(() => document.documentElement.dataset.cinematicReady === 'true', undefined, { timeout: 90000 }); } catch (e) { errors.push(e.message); }
await page.screenshot({ path: 'test-results/cinematic-desktop.png', timeout: 90000 });
console.log(JSON.stringify({ errors, ready: await page.evaluate(() => document.documentElement.dataset.cinematicReady), canvas: await page.locator('canvas').count() }, null, 2));
await writeFile('test-results/cinematic-console.json', JSON.stringify(errors, null, 2));
await browser.close();
