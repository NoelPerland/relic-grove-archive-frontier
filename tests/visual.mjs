import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const out = process.env.QA_OUTPUT || '../work/relic-visual';
mkdirSync(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'visual-test-only',
  transform(code, id) {
    if (id.endsWith('/src/main.ts')) return code + '\nwindow.__visualTest={player,camera,keys,heroSheet,tileset,HERO_FRAME_RECTS,BOSS_GATE,drawGate,ctx};';
  },
}] });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.click('#primary');
  await page.waitForFunction(() => window.__visualTest.heroSheet.complete && window.__visualTest.tileset.complete);
  const crops = await page.evaluate(() => {
    const q = window.__visualTest;
    return { width: q.heroSheet.naturalWidth, height: q.heroSheet.naturalHeight, rects: q.HERO_FRAME_RECTS };
  });
    const gateSources = await page.evaluate(() => {
    const q=window.__visualTest, calls=[], original=q.ctx.drawImage;
    q.ctx.drawImage=function(image,...args){if(image===q.tileset)calls.push(args.slice(0,4));};
    try { q.drawGate(); } finally { q.ctx.drawImage=original; }
    return calls;
  });
  for (const [x,y] of [[1168,550],[1310,550],[1010,800],[1480,800]]) {
    assert(gateSources.some(([sx,sy,sw,sh])=>x>=sx&&x<sx+sw&&y>=sy&&y<sy+sh),'Gate crop loses spire or outer pillar');
  }
  for (const rect of Object.values(crops.rects)) {
    assert(rect.sx >= 0 && rect.sy >= 0 && rect.sx + rect.sw <= crops.width / 4 && rect.sy + rect.sh <= crops.height / 4, 'Hero crop leaves its sheet cell');
  }
  for (const [name, x, y] of [['gate',1760,330], ['lake',330,380]]) {
    await page.evaluate(({x,y}) => { const q=window.__visualTest; q.player.x=x; q.player.y=y; }, {x,y});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${name}.png` });
  }
  for (const [key, facing] of [['d','east'],['a','west'],['w','north'],['s','south']]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(160);
    assert.equal(await page.evaluate(() => window.__visualTest.player.facing), facing);
    await page.screenshot({ path: `${out}/walk-${facing}.png` });
    await page.keyboard.up(key);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: hero crop bounds, four movement directions, gate/lake visual evidence; inspect screenshots for art quality.');
} finally { await browser.close(); await server.close(); }
