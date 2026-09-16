/* Lehrerzeit Service Worker: hält die App offline startbar. Bei Änderungen an index.html die VERSION erhöhen. */
const VERSION = "lehrerzeit-v3";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Firebase-Datenverkehr nie abfangen
  if (url.hostname.endsWith("googleapis.com") && !url.hostname.startsWith("fonts.")) return;
  if (url.hostname.includes("firebaseapp.com") || url.hostname.includes("firebaseio.com")) return;
  // App-Dateien: Netz zuerst, sonst Cache (so kommen Updates an, offline läuft die alte Version)
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
    return;
  }
  // SDK und Schriften: Cache zuerst, im Hintergrund aktualisieren
  e.respondWith(caches.match(e.request).then(cached => {
    const net = fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return r; }).catch(() => cached);
    return cached || net;
  }));
});
