# Investment Calculator

A compound growth calculator for contributions, fees, tax, inflation, withdrawals, goals and simulated market ranges. It runs entirely in the browser, and nothing you enter leaves your device.

**Use it:** https://samcky2k-git.github.io/investment-calculator/

On iPhone, open the link in Safari, tap Share, then **Add to Home Screen**. It then opens full screen and works offline.

## Files

| File | Purpose |
|---|---|
| `index.html` | The app, and the single source for everything else. It also opens directly from disk. |
| `build-web.js` | Builds `docs/` (the hosted site) and `web/` (the claude.ai version) from `index.html`. |
| `make-icons.js` | Renders `icon.svg` to the PNG icons in `icons/` (needs Chrome). |
| `docs/` | The published site. GitHub Pages serves this folder. |

## Updating

1. Edit `index.html`.
2. Run `node build-web.js`.
3. Commit and push. The site updates within a minute or two, and installed copies pick it up on the next launch after that.

The default inputs are placeholders, not market data or advice.
