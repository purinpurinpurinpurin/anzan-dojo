// 電波がない時でも動くように、アプリのファイルをスマホの中に控えておく仕組み。
// アプリや問題を直したら VERSION の数字を上げる(スマホ側が新しい物を取り直す)。
const VERSION = 5;
const CACHE = 'anzan-dojo-v' + VERSION;
const FILES = [
  './', './index.html', './manifest.json', './data/tips.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // 全部そろって取れた時だけ新しい版にする。電波が弱くて1つでも失敗したら、
  // 今の控えをそのまま使い続ける(次に開いた時にまた取り直す)
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('anzan-dojo-') && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

// 控えがあればすぐそれを出す(電波がなくても・遅くても待たない)。
// 電波があれば裏で新しい物に入れ替えておく
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && res.ok) c.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return (await c.match('./index.html')) || Response.error();
    return Response.error();
  }));
});
