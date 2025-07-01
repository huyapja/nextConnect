/**
 * Script để test socket connection và realtime messaging
 * Chạy bằng: node apps/raven/debug_socket_test.js
 */

const io = require('socket.io-client');
const fs = require('fs');

// Đọc config từ env file
let config = {};
try {
  const envContent = fs.readFileSync('apps/raven/.firebase.env', 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('=')) {
      const [key, value] = line.split('=');
      config[key.trim()] = value.trim().replace(/"/g, '');
    }
  });
} catch (error) {
  console.log('⚠️  Không thể đọc .firebase.env, sử dụng config mặc định');
}

// Config mặc định
const DEFAULT_CONFIG = {
  SOCKETIO_PORT: '9000',
  SITE_NAME: 'dev.localhost'
};

const SOCKETIO_PORT = config.SOCKETIO_PORT || DEFAULT_CONFIG.SOCKETIO_PORT;
const SITE_NAME = config.SITE_NAME || DEFAULT_CONFIG.SITE_NAME;
const SOCKET_URL = `http://localhost:${SOCKETIO_PORT}/${SITE_NAME}`;

console.log('🔧 Socket Test Configuration:');
console.log(`   Port: ${SOCKETIO_PORT}`);
console.log(`   Site: ${SITE_NAME}`);
console.log(`   URL: ${SOCKET_URL}`);
console.log('');

// Tạo socket connection
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  timeout: 5000,
});

let connectionStartTime = Date.now();
let eventCount = 0;

// Connection events
socket.on('connect', () => {
  const connectionTime = Date.now() - connectionStartTime;
  console.log(`✅ Socket connected successfully in ${connectionTime}ms`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  console.log(`   Socket ID: ${socket.id}`);
  console.log('');
  
  // Test ping
  console.log('📡 Testing ping...');
  socket.emit('ping');
});

socket.on('pong', () => {
  console.log('✅ Ping test successful');
  console.log('');
  
  // Bắt đầu lắng nghe message events
  console.log('👂 Listening for message events...');
  console.log('   - message_created');
  console.log('   - message_edited');
  console.log('   - message_deleted');
  console.log('   - message_reacted');
  console.log('   - raven_message_retracted');
  console.log('');
  console.log('💡 Tip: Gửi tin nhắn trong Raven để test realtime events');
  console.log('');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error.message);
  console.log('');
  console.log('🔍 Troubleshooting:');
  console.log('   1. Kiểm tra socketio service có chạy không');
  console.log('   2. Kiểm tra port trong config');
  console.log('   3. Kiểm tra firewall/proxy settings');
});

socket.on('disconnect', (reason) => {
  console.log(`❌ Socket disconnected: ${reason}`);
});

// Message events
const messageEvents = [
  'message_created',
  'message_edited', 
  'message_deleted',
  'message_reacted',
  'message_saved',
  'raven_message_retracted'
];

messageEvents.forEach(eventName => {
  socket.on(eventName, (data) => {
    eventCount++;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`📨 [${timestamp}] ${eventName}:`);
    console.log(`   Channel: ${data.channel_id}`);
    console.log(`   Message: ${data.message_id || data.message_details?.name || 'N/A'}`);
    console.log(`   Sender: ${data.sender || data.message_details?.owner || 'N/A'}`);
    if (data.message_details?.content) {
      console.log(`   Content: ${data.message_details.content.substring(0, 50)}...`);
    }
    console.log('');
  });
});

// Other important events
socket.on('raven:unread_channel_count_updated', (data) => {
  eventCount++;
  const timestamp = new Date().toLocaleTimeString();
  console.log(`📬 [${timestamp}] unread_channel_count_updated:`);
  console.log(`   Channel: ${data.channel_id}`);
  console.log(`   Sender: ${data.sent_by}`);
  console.log('');
});

socket.on('thread_reply', (data) => {
  eventCount++;
  const timestamp = new Date().toLocaleTimeString();
  console.log(`🧵 [${timestamp}] thread_reply:`);
  console.log(`   Channel: ${data.channel_id}`);
  console.log(`   Replies: ${data.number_of_replies}`);
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('📊 Test Summary:');
  console.log(`   Events received: ${eventCount}`);
  console.log(`   Connection time: ${Date.now() - connectionStartTime}ms`);
  console.log('');
  console.log('👋 Closing socket connection...');
  socket.close();
  process.exit(0);
});

// Auto-close after 5 minutes
setTimeout(() => {
  console.log('');
  console.log('⏱️  Test timeout reached (5 minutes)');
  console.log('📊 Final Summary:');
  console.log(`   Events received: ${eventCount}`);
  console.log(`   Connection time: ${Date.now() - connectionStartTime}ms`);
  console.log('');
  socket.close();
  process.exit(0);
}, 5 * 60 * 1000);

console.log('🚀 Starting socket connection test...');
console.log('⏱️  Test will run for 5 minutes or until Ctrl+C');
console.log(''); 