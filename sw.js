// WoogiGames — Service Worker
// Amaç: (1) "Ana Ekrana Ekle" ile eklenen PWA'nın gerçek bir uygulama gibi anında
// açılmasını sağlamak, (2) daha önce ziyaret edilmiş sayfaların internetsizken de
// (ya da zayıf bağlantıda) çalışmaya devam etmesi. Strateji: "stale-while-revalidate"
// — önce (varsa) önbellekten anında yanıt ver, ARDINDAN arka planda ağdan taze
// kopyayı çek ve önbelleği güncelle. Böylece hem hız hem güncellik kazanılır.
// Sadece SİTENİN KENDİ dosyaları önbelleklenir (Google Fonts/Firebase/AdSense gibi
// üçüncü taraf istekler dokunulmadan doğrudan ağa gider).

const CACHE_NAME = 'woogigames-v1';

// İlk kurulumda önden ısıtılacak temel dosyalar — site geneli her sayfada kullanılan
// paylaşılan dosyalar. Diğer her şey (oyun sayfaları, oyuna özel görseller) ilk
// ziyarette otomatik olarak önbelleğe eklenir (bkz. fetch handler).
const CORE_ASSETS = [
  './',
  'index.html',
  'common.css',
  'common.js',
  'assets/index.css',
  'assets/index.js',
  'assets/logo.png',
  'assets/mascot-round.png',
  'assets/favicon-32.png',
  'assets/favicon-64.png',
  'assets/favicon-180.png',
  'assets/pwa/icon-192.png',
  'assets/pwa/icon-512.png',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {}) // tek bir dosya bile başarısız olsa kurulumu engelleme
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/Firebase yazma istekleri vb. dokunulmaz

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // üçüncü taraf isteklere karışma

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached); // ağ başarısız olursa (çevrimdışı) önbelleğe düş
      return cached || networkFetch;
    })
  );
});
