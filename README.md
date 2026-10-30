# Relic Grove: Archive Frontier

Canvas RPG/action game with movement, combat, gathering, inventory, shop upgrades, and boss clearing.

## Install

```bash
npm ci
```

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## GitHub Pages deployment

Use Node.js 24. Source lives on `main`; the public game is https://noelperland.github.io/relic-grove-archive-frontier/ . GitHub Pages serves built files from `gh-pages`.

```sh
npm ci
npm run build -- --base=/relic-grove-archive-frontier/
npm run preview -- --base=/relic-grove-archive-frontier/
```

Publish `dist/` contents to a separate `gh-pages` checkout, include `.nojekyll`, commit and push without force. Preserve source on `main`. Verify assets, real gameplay, touch/keyboard input, pause/restart and results at the public subfolder after deployment. Local tests do not verify the public release.

The old Liivo deployment is separate. Do not replace the hub's current Pages link with an unverified URL.

Input regression: npm test includes focus/pointer cleanup checks. npm run test:input-browser checks real movement and blur/release in headless Chrome (Windows standard install). Test-only state instrumentation stays inside Vite test plugin.
Browser regression also covers pause freeze, level-up, boss-clear and restart with storage access blocked or writes full; progress cannot persist across reload when storage fails.

Run npm run test:visual to validate hero crop bounds and movement directions and capture gate/lake/walk views under ../work/relic-visual (QA_OUTPUT overrides). CHROME_PATH or PLAYWRIGHT_CHROME selects Chrome. Visual inspection confirmed gate source rectangle had clipped spires/outer pillars; expanded existing-art crop preserves ground anchor. West animation intentionally mirrors east because source sheet has no separate west frames. No new artwork generated.
