# Hướng dẫn Setup FCM Notification

## 1. Cài đặt Dependencies

```bash
# Cài đặt firebase-admin
bench --site react.test pip install firebase-admin

# Build frontend
cd apps/raven/frontend
npm run build
```

## 2. Cấu hình Firebase Service Account

### 2.1. Sử dụng biến môi trường (Khuyến nghị)

Tạo file `.env` từ template:

```bash
cp env_template.txt .env
```

Sau đó cập nhật config:

```bash
python update_config.py
```

### 2.2. Cấu hình thủ công

Thêm service account key vào `sites/common_site_config.json`:

```json
{
  "firebase_service_account_key": {
    "type": "service_account",
    "project_id": "YOUR_PROJECT_ID",
    "private_key_id": "YOUR_PRIVATE_KEY_ID",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com",
    "client_id": "YOUR_CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40YOUR_PROJECT_ID.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  }
}
```

**Lưu ý:** Thay thế các giá trị `YOUR_*` bằng thông tin thực từ Firebase Console.

## 3. Test FCM Notification

### 3.1. Test gửi notification thủ công

```bash
# Test gửi notification tới token cụ thể
curl -X POST http://localhost:8080/api/method/raven.api.test_fcm_notification.test_fcm_notification \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "your_fcm_token_here",
    "title": "Test Notification",
    "body": "Đây là notification test từ Raven"
  }'

# Test gửi notification tới channel
curl -X POST http://localhost:8080/api/method/raven.api.test_fcm_notification.send_test_message_notification \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "your_channel_id"
  }'

# Lấy danh sách FCM tokens
curl -X POST http://localhost:8080/api/method/raven.api.test_fcm_notification.get_fcm_tokens \
  -H "Content-Type: application/json"
```

### 3.2. Test gửi tin nhắn thực tế

1. Mở 2 tab trình duyệt khác nhau
2. Login với 2 user khác nhau (user A và user B)
3. Tạo channel hoặc DM giữa 2 user
4. User A gửi tin nhắn cho user B
5. Kiểm tra notification trên user B

## 4. Debug và Troubleshooting

### 4.1. Kiểm tra Console Log

**Frontend (User B):**
- Mở Developer Tools > Console
- Filter: "Service Worker" hoặc "FCM"
- Gửi tin nhắn từ user A
- Xem log:
  - `[firebase-messaging-sw.js] Received background message`
  - `Foreground push received:`
  - `[Service Worker] Notification click received.`

**Backend:**
- Kiểm tra log trong `logs/frappe.log`
- Tìm log với title "FCM Error" hoặc "FCM Test Error"

### 4.2. Kiểm tra Database

```sql
-- Kiểm tra FCM tokens
SELECT * FROM `tabFCM Token`;

-- Kiểm tra channel members
SELECT * FROM `tabRaven Channel Member` WHERE channel_id = 'your_channel_id';
```

### 4.3. Kiểm tra Service Worker

1. Mở Developer Tools > Application > Service Workers
2. Kiểm tra service worker đã đăng ký chưa
3. Xem log của service worker

### 4.4. Kiểm tra Quyền Notification

1. Mở Developer Tools > Application > Permissions
2. Kiểm tra "Notifications" có được cấp quyền "Allow" không

## 5. Các trường hợp test

### 5.1. App đang foreground
- User B đang mở tab Raven
- User A gửi tin nhắn
- User B sẽ thấy toast notification trong app

### 5.2. App đang background
- User B mở tab khác (không phải Raven)
- User A gửi tin nhắn
- User B sẽ thấy popup notification

### 5.3. App đã đóng
- User B đóng tab Raven
- User A gửi tin nhắn
- User B sẽ thấy popup notification

### 5.4. Click vào notification
- Click vào notification sẽ mở tab Raven
- Nếu có channel_id, sẽ mở trực tiếp channel đó

## 6. Lỗi thường gặp

### 6.1. "Firebase service account key not found"
- Kiểm tra cấu hình trong `sites/common_site_config.json`
- Đảm bảo service account key đúng format JSON

### 6.2. "No FCM token found"
- Kiểm tra user đã cấp quyền notification chưa
- Kiểm tra FCM token đã được lưu trong database chưa

### 6.3. "Service Worker not ready"
- Kiểm tra service worker đã đăng ký chưa
- Refresh trang để đăng ký lại service worker

### 6.4. Notification không hiện
- Kiểm tra quyền notification trên trình duyệt
- Kiểm tra console log có lỗi gì không
- Kiểm tra payload gửi lên FCM có đúng format không

## 7. Performance và Monitoring

### 7.1. Kiểm tra FCM Delivery
- FCM sẽ trả về success/failure count
- Log sẽ ghi lại failed tokens để cleanup

### 7.2. Cleanup Invalid Tokens
- FCM sẽ tự động trả về invalid tokens
- Có thể tạo job để xóa invalid tokens định kỳ

## 8. Production Checklist

- [ ] Firebase service account key đã được cấu hình
- [ ] firebase-admin đã được cài đặt
- [ ] Service worker đã được build và deploy
- [ ] FCM tokens đã được lưu trong database
- [ ] Notification permissions đã được cấp
- [ ] Test notification hoạt động
- [ ] Error handling đã được implement
- [ ] Logging đã được cấu hình

## 9. Bảo mật

- **KHÔNG** commit service account key vào repository
- Sử dụng biến môi trường cho tất cả các key nhạy cảm
- Thêm file `.env` vào `.gitignore`
- Sử dụng `env_template.txt` làm template 