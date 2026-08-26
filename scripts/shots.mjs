/**
 * Fotografon faqen në disa pozicione dhe gjerësi.
 *
 *   node scripts/shots.mjs [baseUrl]
 *
 * Pret që serveri i zhvillimit të jetë ndezur. Ruan te .shots/.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:5175';
const OUT = '.shots';
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

/* Sa larg të rrëshqasë për secilën pamje, si shumëfish i lartësisë. */
const STOPS = [0, 1.2, 2.4, 3.6, 6.0, 9.6];

/* Headless Chromium nuk ka GPU: pa SwiftShader konteksti WebGL nuk
   krijohet fare dhe faqja mbetet bosh. */
const browser = await chromium.launch({
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--disable-lcd-text',
  ],
});
const errors = [];

for (const v of VIEWS) {
  /* deviceScaleFactor 1: SwiftShader rendon me CPU, dhe 2x e katërfishon
     punën për çdo kuadër — fotot dilnin jashtë kohës. */
  const page = await browser.newPage({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 1,
  });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${v.name}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[${v.name}] ${e.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 120000 });
  /* Prit derisa perdja e ngarkimit të jetë hequr. */
  await page.waitForFunction(
    () => document.querySelector('.loader')?.classList.contains('is-done'),
    null,
    { timeout: 120000 },
  ).catch(() => errors.push(`[${v.name}] modeli nuk u ngarkua brenda kohës`));
  await page.waitForTimeout(2500);

  for (const [i, mult] of STOPS.entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), mult * v.height);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/${v.name}-${i}.png`, animations: 'disabled', timeout: 180000 });
  }

  /* Faqet e tjera, vetëm në krye. */
  if (v.name === 'desktop') {
    for (const p of ['/pyetje/', '/kushtet/', '/privatesia/', '/404.html']) {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/page${p.replace(/\W+/g, '-')}.png`, animations: 'disabled', timeout: 180000 });
    }
  }
  await page.close();
}

await browser.close();
console.log(fs.readdirSync(OUT).sort().join('\n'));
console.log(errors.length ? '\nGABIME KONSOLE:\n' + errors.join('\n') : '\nasnjë gabim konsole');
