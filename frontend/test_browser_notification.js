// Test script - paste vào Browser Console để test notification
// Mở F12 → Console → paste đoạn code này

console.log("🔥 Testing Firebase Notifications...");

// 1. Check notification permission
console.log("Notification permission:", Notification.permission);

// 2. Request permission if needed
if (Notification.permission === 'default') {
    console.log("Requesting notification permission...");
    Notification.requestPermission().then(permission => {
        console.log("Permission result:", permission);
    });
}

// 3. Test browser notification
if (Notification.permission === 'granted') {
    console.log("✅ Testing browser notification...");
    new Notification("🧪 Test Notification", {
        body: "Đây là test notification từ browser console",
        icon: "/assets/raven/raven-logo.png"
    });
} else {
    console.log("❌ Notification permission denied");
}

// 4. Check Firebase messaging (v8 compat)
if (window.firebase && window.firebase.messaging) {
    console.log("✅ Firebase v8 messaging available");
    
    const messaging = window.firebase.messaging();
    
    // Listen for foreground messages
    messaging.onMessage((payload) => {
        console.log("🔥 Foreground message received:", payload);
        
        // Show notification manually
        if (Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: payload.notification.icon || "/assets/raven/raven-logo.png"
            });
        }
    });
    
    // Get current token
    messaging.getToken().then(token => {
        console.log("Current FCM token:", token);
    }).catch(err => {
        console.error("Error getting FCM token:", err);
    });
    
} else if (window.firebaseV9 && window.firebaseV9.messaging) {
    console.log("✅ Firebase v9+ messaging available");
    
    // Check Firebase v9+ modular
    const { messaging, getToken, onMessage, service } = window.firebaseV9;
    
    console.log("Firebase messaging object:", messaging);
    console.log("Firebase service initialized:", service.isInitialized());
    console.log("Firebase service token:", service.getToken());
    
    // Test getting token
    if (messaging) {
        getToken(messaging, {
            vapidKey: "BDSp283ejn319EfnQTWDrD-4Vq587ulgFEMrl9hgA6tfyuci3PfNIsGu3wmwbHAJPgh0zLW59LG4PGyidiJoCUQ"
        }).then(token => {
            console.log("🔥 Firebase v9 FCM token:", token);
        }).catch(err => {
            console.error("❌ Error getting v9 FCM token:", err);
        });
    }
    
} else {
    console.log("❌ Firebase messaging not available");
    console.log("Available Firebase objects:", {
        firebase: !!window.firebase,
        firebaseV9: !!window.firebaseV9,
        firebaseMessaging: !!window.firebaseMessaging,
        firebaseNotificationService: !!window.firebaseNotificationService
    });
}

// 5. Check service workers
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log("Service Workers:", registrations.length);
        registrations.forEach((registration, index) => {
            console.log(`SW ${index}:`, registration.scope);
        });
    });
} else {
    console.log("❌ Service Worker not supported");
} 