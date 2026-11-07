// Renders icon.svg to the PNG icons iOS and Android need, using headless Chrome.
// Run:  node make-icons.js
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dir = __dirname, out = path.join(dir, 'icons');
fs.mkdirSync(out, { recursive: true });
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
// Both are rendered at 512 px: headless Chrome won't open a window much under 500 px, and iOS
// scales a 512 px apple-touch-icon down to its 180 px Home Screen size cleanly.
const page = path.join(tmp, 'icon.html');
fs.writeFileSync(page, `<!doctype html><html><body style="margin:0;overflow:hidden">${svg.replace('<svg ', '<svg width="512" height="512" ')}</body></html>`);
for (const name of ['icon-512.png', 'apple-touch-icon.png']) {
  cp.spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=512,512',
    '--default-background-color=00000000', '--user-data-dir=' + path.join(tmp, 'prof'),
    '--screenshot=' + path.join(out, name), 'file:///' + page.replace(/\\/g, '/')], { timeout: 60000 });
  console.log(fs.existsSync(path.join(out, name)) ? 'wrote icons/' + name : 'FAILED icons/' + name);
}
