// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
let messaging;
try {
  firebase.initializeApp({
    apiKey: "AIzaSyD_kYjg-Kh729ZwWZ4kciNbfSOBtbvRUdg",
    authDomain: "warehouse-6b3ac.firebaseapp.com",
    projectId: "warehouse-6b3ac",
    storageBucket: "warehouse-6b3ac.firebasestorage.app",
    messagingSenderId: "1002761221501",
    appId: "1:1002761221501:web:7a85a01d9de12e75d0c814",
    measurementId: "G-1MS2B2S995"
  });

  // Get the messaging instance
  messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage(function(payload) {
    console.log('Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('Firebase initialization error in service worker:', error);
}

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');
  
  event.notification.close();
  
  // Handle the notification click
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
