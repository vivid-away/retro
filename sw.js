/* ===================================================
   RETRO COLLECTOR - sw.js  v3.0
   Service Worker – PWA完全対応版
   =================================================== */

/* ── バージョン管理
   ファイルを更新したら CACHE_VERSION を上げてください。
   旧キャッシュは自動的に削除されます。
   ================================================== */
const CACHE_VERSION = 'v3.0';
const CACHE_STATIC  = 'rc-static-' + CACHE_VERSION;
const CACHE_FONTS   = 'rc-fonts-'  + CACHE_VERSION;
const ALL_CACHES    = [CACHE_STATIC, CACHE_FONTS];

/* ── キャッシュするアプリファイル ── */
const CORE_ASSETS = [
  './',
  './index.html',
  './console.html',
  './style.css',
  './portal.css',
  './console.css',
  './db.js',
  './portal.js',
  './console.js',
  './backup.js',
  './manifest.json',
];

const ICON_ASSETS = [
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

/* ── インストール: コアファイルを事前キャッシュ ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => {
        /* アイコンは存在しなくても失敗しないよう個別にキャッシュ */
        return caches.open(CACHE_STATIC).then(cache =>
          Promise.allSettled(
            ICON_ASSETS.map(url =>
              fetch(url).then(res => {
                if (res.ok) cache.put(url, res);
              }).catch(() => {})
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ── アクティベート: 旧キャッシュを削除 ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── フェッチ戦略 ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Google Fonts → Network First */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(networkFirstFont(request));
    return;
  }

  /* 同一オリジン → Cache First */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

/* Cache First */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('./index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

/* Network First（フォント用） */
async function networkFirstFont(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_FONTS);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request);
  }
}

/* ── 更新メッセージ受信 ── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
