importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

/**
 * A service worker cannot read import.meta.env — it is a static file, not part
 * of the Vite bundle. So the app passes the Firebase config on the registration
 * URL and we read it back here, which keeps one source of truth (the
 * VITE_FIREBASE_* variables) instead of a second hardcoded copy that drifts.
 *
 * Defaults cover the values that are fixed for this project; apiKey and appId
 * have no sensible default and must arrive from the app.
 */
const params = new URL(self.location).searchParams;

const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || 'mune-work.firebaseapp.com',
  projectId: params.get('projectId') || 'mune-work',
  storageBucket: params.get('storageBucket') || 'mune-work.firebasestorage.app',
  // The Firebase project number. Not the service account's client_id — a
  // 21-digit value here silently produces a messaging instance that never
  // receives anything.
  messagingSenderId: params.get('messagingSenderId') || '723511201389',
  appId: params.get('appId') || '',
};

if (!firebaseConfig.apiKey || !firebaseConfig.appId) {
  // Failing loudly here beats a worker that installs and then quietly does
  // nothing, which is indistinguishable from "push is broken".
  console.error(
    '[FCM SW] Missing apiKey or appId. Set VITE_FIREBASE_API_KEY and ' +
      'VITE_FIREBASE_APP_ID and rebuild — background notifications are disabled.',
  );
} else {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Mune Work';

    self.registration.showNotification(title, {
      body: payload.notification?.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: payload.data,
      tag: payload.data?.notificationId || undefined,
    });
  });
}

// Opening the app from a notification should land on whatever it refers to,
// and focus an existing tab rather than piling up new ones.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
