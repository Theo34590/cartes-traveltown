// Cache de l'application pour l'ouvrir même sans réseau. Les appels au serveur
// Google ne passent pas par ici (autre domaine). Changer VERSION à chaque mise en ligne.
var VERSION = "cartes-v6";
var FICHIERS = ["./", "index.html", "style.css?v=6", "catalogue.js?v=6", "logique.js?v=6", "app.js?v=6", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-192.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Réseau d'abord (mises à jour visibles tout de suite), cache si hors ligne.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copie = r.clone();
    caches.open(VERSION).then(function (c) { c.put(e.request, copie); });
    return r;
  }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match("index.html"); }); }));
});
