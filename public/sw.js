// Service worker minimal pour activer l'installation PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pas de cache pour l'instant : le réseau reste la source de vérité.
  // Ce handler est requis pour que le navigateur considère le SW comme "actif".
});