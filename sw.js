// 화장대 오프라인용 — 늘 새 버전을 먼저 받고, 인터넷이 끊겼거나 3초 넘게 느리면 마지막으로 받은 것을 연다.
// 데이터는 IndexedDB 에 있어서 여기선 앱 파일만 다룬다. Gemini 같은 다른 주소 요청은 건드리지 않는다.
const CACHE = 'vanity';

// 페이지는 받을 때마다 서버에 바뀌었는지 묻는다(no-cache) — GitHub Pages 가 「10분 동안 다시 묻지 말 것」(max-age=600)을 붙여서,
// 그냥 받으면 새로 올린 뒤에도 브라우저가 옛 화면을 10분 동안 그대로 준다. 안 바뀌었으면 서버는 「그대로」(304)만 답해서 가볍다.
const FRESH = { cache: 'no-cache' };

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add(new Request('./', FRESH))));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === 'navigate' ? './' : req;          // 페이지는 하나뿐 — ?test·index.html 로 열어도 같은 칸
  const net = (req.mode === 'navigate' ? fetch(req, FRESH) : fetch(req)).then(async res => {      // 아이콘 같은 나머지 파일은 거의 안 바뀌니 그대로
    if (res.ok) await (await caches.open(CACHE)).put(key, res.clone());
    return res;
  });
  const old = () => caches.match(key, { ignoreSearch: true }).then(r => r || Promise.reject());
  e.waitUntil(net.catch(() => {}));                          // 늦게 온 새 버전도 마저 받아 둔다 → 다음에 열 때 새 버전
  e.respondWith(Promise.any([net, net.catch(old), new Promise(r => setTimeout(r, 3000)).then(old)])
    .catch(() => Response.error()));
});
