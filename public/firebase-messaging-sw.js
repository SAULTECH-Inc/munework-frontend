importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  authDomain: 'mune-work.firebaseapp.com',
  projectId: 'mune-work',
  storageBucket: 'mune-work.firebasestorage.app',
  messagingSenderId: '109767450778418985794',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Received background message: ', payload);
  const notificationTitle = payload.notification?.title || 'MuneWork';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
