import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { notificationsApi } from './api';

// Firebase Web App Config (mune-work project)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mune-work.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mune-work',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mune-work.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '723511201389',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export async function initFirebaseMessaging() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('[FCM] Web Push Messaging is not supported on this browser.');
      return null;
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const messaging = getMessaging(app);

    // Request Notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[FCM] Notification permission denied by user.');
        return null;
      }
    }

    // Register service worker if supported
    let swRegistration: ServiceWorkerRegistration | undefined = undefined;
    if ('serviceWorker' in navigator) {
      // A service worker is a static file outside the bundle, so the config
      // travels on its URL rather than being hardcoded a second time.
      const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      })}`;
      // A dedicated scope, matching what the Firebase SDK uses by default.
      // Without it this registers at "/" — the same scope main.tsx uses for
      // the PWA worker — and a scope holds only one registration, so whichever
      // registered last wins. main.tsx runs on every load, so sw.js would take
      // over the scope that owns the push subscription and silently swallow
      // every push, while FCM still reported a successful send.
      swRegistration = await navigator.serviceWorker.register(swUrl, {
        scope: '/firebase-cloud-messaging-push-scope',
      });

      // getToken needs an activated worker; register() resolves before that.
      if (swRegistration.active === null) {
        await new Promise<void>((resolve) => {
          const worker = swRegistration!.installing ?? swRegistration!.waiting;
          if (!worker) return resolve();
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve();
          });
        });
      }
    }

    // Get FCM Token
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken) {
      console.log('[FCM] Obtained Push Token:', currentToken);
      await notificationsApi.registerFcmToken(currentToken);
    } else {
      console.log('[FCM] No registration token available. Request permission to generate one.');
    }

    // Clicking a notification focuses this tab and hands us the destination,
    // because the worker cannot navigate a client it does not control.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
          window.location.assign(event.data.url);
        }
      });
    }

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground notification received:', payload);
      if (payload.notification && typeof window !== 'undefined' && 'Notification' in window) {
        new Notification(payload.notification.title || 'Mune Work', {
          body: payload.notification.body,
          icon: '/brand/logo-mark-192.png',
        });
      }
    });

    return messaging;
  } catch (err) {
    console.error('[FCM] Error initializing push notifications:', err);
    return null;
  }
}
