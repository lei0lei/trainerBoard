const CACHE_NAME = "trainerboard-shell-v2";

function getScopePath() {
  const scopeUrl = new URL(self.registration.scope);
  const pathname = scopeUrl.pathname.replace(/\/$/, "");
  return pathname === "/" ? "" : pathname;
}

function withBase(path = "/") {
  const scopePath = getScopePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${scopePath}${normalizedPath}` || "/";
}

const APP_SHELL = [
  withBase("/"),
  withBase("/dashboard/"),
  withBase("/manifest.webmanifest"),
  withBase("/offline.html"),
  withBase("/favicon.ico"),
  withBase("/favicon.svg"),
  withBase("/icons/icon-32.png"),
  withBase("/icons/icon-192.png"),
  withBase("/icons/icon-512.png"),
  withBase("/icons/icon-maskable-512.png"),
  withBase("/icons/apple-touch-icon.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(requestUrl) {
  return requestUrl.pathname.startsWith(withBase("/api/")) || requestUrl.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(withBase("/offline.html")))
    );
    return;
  }

  if (["style", "script", "worker", "font", "image", "manifest"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            return response;
          })
      )
    );
  }
});
