import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.terrainReady === 'true' && !document.querySelector('.loading-screen'));
  await page.getByRole('button', { name: 'Whole crater overview', exact: true }).click();
  assert.ok(await page.getByRole('dialog', { name: 'Jezero whole crater overview' }).isVisible());
  await page.locator('.crater-overview img').evaluate(img => img.decode());
  await page.screenshot({ path: 'test-results/overview.png' });
  await page.getByRole('button', { name: 'Explore the 10 by 10 kilometer mission zone', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 0);
  const sizes = await page.locator('.left-panel').evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
  console.log('Whole-crater overview, mission-zone navigation: PASS', sizes);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('canvas')?.clientWidth === 390);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: 'test-results/mobile-review.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'Whole crater overview', exact: true }).click();
  await page.locator('.crater-overview img').evaluate(img => img.decode());
  await page.screenshot({ path: 'test-results/mobile-overview.png' });
  console.log('Mobile overview and overflow check: PASS');
} finally { await browser.close(); }
