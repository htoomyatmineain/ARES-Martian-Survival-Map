import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.cinematicReady === 'true');
  await page.getByRole('button', { name: 'Enter Exploration', exact: true }).click();
  await page.waitForFunction(() => parseInt(document.querySelector('.mx-waypoint>span').textContent) < 340);
  await page.getByRole('button', { name: 'Pause Exploration', exact: true }).click();
  await page.getByRole('button', { name: 'Return to Base', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.mx-objectives>button')].some(b => b.textContent.includes('Return to Base') && b.classList.contains('complete')));
  assert.match(await page.locator('.mx-toast').innerText(), /Safe return/);
  console.log('PASS Return-to-base navigation completes and persists mission objective.');
  await page.goto('http://localhost:4173/?workspace=science', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.terrainReady === 'true' && !document.querySelector('.loading-screen'));
  assert.match(await page.locator('.route-verdict').innerText(), /Within simulated mission budget/);
  assert.ok(await page.getByRole('link', { name: 'Return to Mars Explorer' }).isVisible());
  console.log('PASS Preserved scientific terrain workspace loads with valid USGS route.');
} finally { await browser.close(); }
