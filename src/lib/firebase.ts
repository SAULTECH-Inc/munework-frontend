import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { notificationsApi } from './api';

// Firebase Web App Config (mune-work project)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mune-work.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mune-work',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mune-work.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '109767450778418985794',
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
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
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

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground notification received:', payload);
      if (payload.notification && typeof window !== 'undefined' && 'Notification' in window) {
        new Notification(payload.notification.title || 'MuneWork', {
          body: payload.notification.body,
          icon: '/favicon.ico',
        });
      }
    });

    return messaging;
  } catch (err) {
    console.error('[FCM] Error initializing push notifications:', err);
    return null;
  }
}
