// This script registers the service worker.
// It's placed in the public folder so it can be served directly.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registered:', registration);

        // Optional: Listen for updates to the service worker
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) {
            return;
          }
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // At this point, the updated precached content has been fetched,
                // but the previous service worker will still serve the older content until all
                // client tabs are closed.
                console.log('New content is available and will be used when all tabs for this page are closed.');
              } else {
                // At this point, everything has been precached.
                // It's the perfect time to display a "Content is cached for offline use." message.
                console.log('Content is cached for offline use.');
              }
            }
          };
        };
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
} else {
  console.log('Service workers are not supported by this browser.');
}
