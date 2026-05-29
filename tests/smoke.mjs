import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";

const port = 5181;
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = "qa-smoke";
mkdirSync(outDir, { recursive: true });
validateAssets();

const server = await createServer({
  logLevel: "silent",
  server: { host: "127.0.0.1", port, strictPort: true },
});

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Vite server did not start.");
}

async function main() {
  await server.listen();
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) errors.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${outDir}/01-title.png` });
  await page.click("#primary");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/02-start.png` });

  await page.click("#shopHint");
  await expectVisible(page, "#shop", "shop");
  await page.locator(".shop-section-title", { hasText: "Sell Inventory" }).waitFor();
  if ((await page.locator(".sell-item[disabled]").count()) > 0) throw new Error("Shop shows zero-count sell rows");
  const goldBeforeSell = await page.locator("#gold").textContent();
  await page.locator(".sell-item:not([disabled])").first().click();
  await page.waitForFunction((gold) => Number(document.querySelector("#gold")?.textContent) > Number(gold), goldBeforeSell);
  const goldAfterSell = await page.locator("#gold").textContent();
  if (Number(goldAfterSell) <= Number(goldBeforeSell)) throw new Error("Selling inventory item did not add gold");
  await page.keyboard.press("Escape");
  await expectHidden(page, "#shop", "shop after Escape");

  for (const key of ["KeyW", "KeyA", "KeyS", "KeyD"]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(220);
    await page.keyboard.up(key);
  }
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(220);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("KeyD");
  await page.screenshot({ path: `${outDir}/03-movement.png` });
  const hotbarIcons = await page.locator("#quickbar .hotbar-icon").count();
  if (hotbarIcons < 5) throw new Error("Hotbar item images missing");

  await page.click("#inventoryBtn");
  await expectVisible(page, "#inventory", "inventory");
  if ((await page.locator("#inventory").textContent())?.includes("0 x")) throw new Error("Inventory shows zero-count rows");
  await page.keyboard.press("Escape");
  await expectHidden(page, "#inventory", "inventory after Escape");

  await page.click("#pause");
  await expectVisible(page, "#panel", "pause panel");
  await page.keyboard.press("Escape");
  await expectHidden(page, "#panel", "pause panel after Escape");
  await page.click("#mute");
  await page.click("#motion");
  await page.screenshot({ path: `${outDir}/04-ui-buttons.png` });

  await page.goto(`${baseUrl}?assetQa=1`, { waitUntil: "networkidle" });
  await page.click("#primary");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/05-asset-qa-start.png` });
  await page.keyboard.press("Space");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/06-combat-boss-clear.png` });
  const panelHiddenAfterBoss = await page.locator("#panel").evaluate((el) => el.hidden);
  const waveText = await page.locator("#wave").textContent();
  if (!panelHiddenAfterBoss) throw new Error("Boss clear opened end panel; expected continued play.");
  if (waveText !== "clear" && waveText !== "boss") throw new Error(`Unexpected wave text after combat: ${waveText}`);

  await page.click("button[data-slot='pick']");
  await page.mouse.click(600, 240);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${outDir}/07-mining.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/08-mobile-resize.png` });

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  await browser.close();
}

async function expectVisible(page, selector, label) {
  const visible = await page.locator(selector).isVisible();
  if (!visible) throw new Error(`${label} was not visible`);
}

async function expectHidden(page, selector, label) {
  const hidden = await page.locator(selector).evaluate((el) => el.hidden);
  if (!hidden) throw new Error(`${label} was not hidden`);
}

function validateAssets() {
  const assets = [
    "public/assets/hero-rpg-sheet.png",
    "public/assets/enemy-sheet.png",
    "public/assets/boss-golem-sheet.png",
    "public/assets/tileset-grove.png",
    "public/assets/terrain-props.png",
    "public/assets/camp-shop-opaque.png",
    "public/assets/oak-shop-panel.png",
    "public/assets/lake-prop.png",
    "public/assets/item-icons.png",
    "public/assets/adventure-medieval-fantasy.mp3",
  ];
  for (const asset of assets) readFileSync(asset);

  const hero = pngSize("public/assets/hero-rpg-sheet.png");
  const enemy = pngSize("public/assets/enemy-sheet.png");
  const boss = pngSize("public/assets/boss-golem-sheet.png");
  assertGrid("hero-rpg-sheet.png", hero, 4, 4);
  assertGrid("enemy-sheet.png", enemy, 4, 4);
  assertGrid("boss-golem-sheet.png", boss, 4, 1);

  const heroRects = {
    0: [88, 22, 150, 170],
    1: [60, 18, 154, 174],
    2: [18, 18, 184, 174],
    4: [84, 12, 152, 164],
    5: [60, 14, 154, 178],
    6: [18, 16, 184, 170],
    8: [72, 0, 170, 164],
    9: [40, 0, 176, 166],
    10: [12, 0, 180, 164],
    11: [0, 0, 156, 150],
    12: [60, 0, 178, 146],
    13: [48, 0, 188, 154],
    14: [0, 0, 220, 154],
    15: [0, 0, 116, 150],
  };
  const enemyRects = {
    4: [14, 42, 238, 150],
    5: [18, 12, 232, 180],
    6: [0, 42, 242, 150],
    7: [0, 30, 210, 156],
    8: [34, 0, 188, 162],
    9: [0, 0, 256, 166],
    10: [0, 0, 256, 162],
    11: [0, 0, 228, 166],
  };
  const bossRects = {
    0: [0, 132, 522, 592],
    1: [34, 148, 506, 456],
    2: [0, 170, 500, 462],
    3: [20, 150, 500, 574],
  };
  assertRects("hero-rpg-sheet.png", hero, 4, 4, heroRects);
  assertRects("enemy-sheet.png", enemy, 4, 4, enemyRects);
  assertRects("boss-golem-sheet.png", boss, 4, 1, bossRects);
}

function pngSize(file) {
  const bytes = readFileSync(file);
  if (bytes.toString("ascii", 1, 4) !== "PNG") throw new Error(`${file} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertGrid(name, size, cols, rows) {
  if (size.width % cols !== 0 || size.height % rows !== 0) {
    throw new Error(`${name} ${size.width}x${size.height} does not fit ${cols}x${rows}`);
  }
}

function assertRects(name, size, cols, rows, rects) {
  const cellW = size.width / cols;
  const cellH = size.height / rows;
  for (const [frame, rect] of Object.entries(rects)) {
    const [sx, sy, sw, sh] = rect;
    if (sx < 0 || sy < 0 || sw <= 0 || sh <= 0 || sx + sw > cellW || sy + sh > cellH) {
      throw new Error(`${name} frame ${frame} source rect is outside its cell`);
    }
  }
}

main()
  .finally(() => {
    void server.close();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
