/**
 * Tombstone service worker.
 *
 * The web PWA install experience was retired in favor of native app-store apps.
 * This no-op worker replaces the previous caching worker so that any browser that
 * already registered the old service worker cleans itself up: it deletes all caches,
 * unregisters itself, and reloads open tabs so users immediately get live content.
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch {
        /* ignore cache-clear failures */
      }
      try {
        await self.registration.unregister()
      } catch {
        /* ignore unregister failures */
      }
      try {
        const clients = await self.clients.matchAll({ type: 'window' })
        for (const client of clients) {
          client.navigate(client.url)
        }
      } catch {
        /* ignore reload failures */
      }
    })(),
  )
})
