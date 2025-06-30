// Debug script cho message integration
// Paste vào Browser Console sau khi gửi message

console.log("🔍 Debugging RavenMessage Integration...");

// 1. Check if Firebase objects are available
console.log("Firebase V9 available:", !!window.firebaseV9);
console.log("Firebase service:", window.firebaseV9?.service?.isInitialized());

// 2. Monitor network requests to see if message is sent
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [url, options] = args;
    
    if (url.includes('/api/method/') && options?.method === 'POST') {
        console.log("🌐 API Call:", url, options?.body);
    }
    
    return originalFetch.apply(this, args);
};

// 3. Monitor realtime events
if (window.io && window.io.socket) {
    console.log("👂 Monitoring realtime events...");
    
    window.io.socket.onAny((eventName, data) => {
        if (eventName.includes('message') || eventName.includes('notification')) {
            console.log("📡 Realtime event:", eventName, data);
        }
    });
}

// 4. Test Firebase notification service directly
if (window.firebaseNotificationService) {
    console.log("🧪 Testing Firebase service direct call...");
    window.firebaseNotificationService.sendTestNotification().then(() => {
        console.log("✅ Direct test notification sent");
    }).catch(err => {
        console.error("❌ Direct test failed:", err);
    });
}

console.log("📝 Debug setup complete. Now send a message in chat!");
console.log("Watch for logs above when you send a message."); 