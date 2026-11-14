// Service worker: guarda a página e as bibliotecas no celular para funcionar sem internet.
// Ao mudar a lista de arquivos ou as versões das bibliotecas, troque o número da versão abaixo.
const CACHE = 'ifc-ar-v1';

const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/exporters/USDZExporter.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/fflate.module.js',
  'https://cdn.jsdelivr.net/npm/web-ifc@0.0.66/+esm',
  'https://cdn.jsdelivr.net/npm/web-ifc@0.0.66/web-ifc.wasm',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...CORE, ...LIBS])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const save = (req, res) => {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

// Rede com limite de tempo: com sinal fraco na obra, cai para a cópia guardada em 3 s.
const networkWithTimeout = (req, ms) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // Página do app: tenta a versão mais nova; sem rede, usa a guardada.
    e.respondWith(
      networkWithTimeout(req, 3000)
        .then((res) => save(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
  } else if (url.hostname === 'cdn.jsdelivr.net') {
    // Bibliotecas com versão fixa: usa a cópia guardada primeiro.
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => save(req, res))));
  }
});
