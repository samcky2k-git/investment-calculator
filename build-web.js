// Builds the two hosted versions from index.html (the single source):
//   web/investment-calculator.html  claude.ai Artifact (host supplies <html>/<head>/<body>)
//   docs/                           standalone installable web app for any static host
//                                   (GitHub Pages serves this folder)
// Run:  node build-web.js
const fs = require('fs'), path = require('path');
const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const pkg = { name: 'Investment Calculator', short: 'Invest Calc', color: '#2a78d6' };

/* ---------- Artifact version ---------- */
{
  const head = src.slice(src.indexOf('<head>') + 6, src.indexOf('</head>'));
  const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'));
  const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
  const blocks = head.match(/<(script|style)\b[\s\S]*?<\/\1>/g);
  const out = [title, '<meta name="claude:viewport-fit-sides" content="cover">', ...blocks, body.trim(), ''].join('\n');
  fs.mkdirSync(path.join(dir, 'web'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'web', 'investment-calculator.html'), out);
  console.log('wrote web/investment-calculator.html');
}

/* ---------- Standalone web app ---------- */
{
  const out = path.join(dir, 'docs');
  fs.mkdirSync(out, { recursive: true });
  // Bump the cache name on every build so phones pick up the new version.
  const version = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

  const headExtra = `
<meta name="description" content="Compound growth calculator with contributions, fees, tax, inflation, withdrawals and goals.">
<meta name="theme-color" content="#f6f6f3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f0f0e" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${pkg.short}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>
  /* Opened from the Home Screen, the page runs under the status bar. */
  body { padding-top: env(safe-area-inset-top, 0px); }
</style>`;
  const bodyExtra = `
<script>
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
</script>
`;
  let html = src.replace('</title>', '</title>' + headExtra).replace(/<\/body>/, () => bodyExtra + '</body>');
  fs.writeFileSync(path.join(out, 'index.html'), html);

  fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({
    name: pkg.name, short_name: pkg.short, start_url: './', scope: './', display: 'standalone',
    background_color: '#f6f6f3', theme_color: pkg.color,
    icons: [
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  }, null, 2));

  // Offline: serve from cache instantly, refresh the cache in the background.
  // A new build shows up on the next launch after the one that downloads it.
  fs.writeFileSync(path.join(out, 'sw.js'), `const CACHE = 'invcalc-${version}';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
`);

  fs.copyFileSync(path.join(dir, 'icon.svg'), path.join(out, 'icon.svg'));
  for (const f of ['icon-512.png', 'apple-touch-icon.png']) {
    if (fs.existsSync(path.join(dir, 'icons', f))) fs.copyFileSync(path.join(dir, 'icons', f), path.join(out, f));
    else console.warn('missing icons/' + f + ' (run node make-icons.js)');
  }
  // Tell GitHub Pages to serve the files as-is.
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  console.log('wrote docs/ (cache ' + version + ')');
}
