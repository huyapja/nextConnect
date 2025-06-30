# Cấu hình Stringee Call 2 cho Raven

## 1. Cài đặt Stringee API Keys

Thêm các biến môi trường sau vào file `sites/common_site_config.json`:

```json
{
  "stringee_api_key_sid": "SK.0.YOUR_API_KEY_SID",
  "stringee_api_key_secret": "YOUR_API_KEY_SECRET"
}
```

Hoặc thêm vào file `.env`:

```bash
STRINGEE_API_KEY_SID=SK.0.YOUR_API_KEY_SID
STRINGEE_API_KEY_SECRET=YOUR_API_KEY_SECRET
```

## 2. Tải Stringee SDK

Tải file `latest.sdk.bundle.min.js` từ Stringee và đặt vào:
```
apps/raven/frontend/public/stringee/latest.sdk.bundle.min.js
```

## 3. Migrate Database

Chạy lệnh để tạo DocType mới:

```bash
bench migrate
```

## 4. Build Frontend

```bash
bench build --app raven
```

## 5. Khởi động lại server

```bash
bench restart
```

## Cách sử dụng

1. **Gọi điện/Video call**: Trong chat 1-1, nhấn vào nút điện thoại (audio) hoặc camera (video) ở header.

2. **Nhận cuộc gọi**: Khi có cuộc gọi đến, sẽ hiện popup để trả lời hoặc từ chối.

3. **Trong cuộc gọi**: 
   - Nhấn nút mic để bật/tắt tiếng
   - Nhấn nút camera để bật/tắt video (chỉ video call)
   - Nhấn nút đỏ để kết thúc cuộc gọi

## Troubleshooting

### Lỗi "Stringee API keys chưa được cấu hình"
- Kiểm tra lại cấu hình API keys trong `common_site_config.json`
- Khởi động lại server sau khi thay đổi cấu hình

### Lỗi "Không thể kết nối đến dịch vụ gọi"
- Kiểm tra Stringee SDK đã được load chưa
- Kiểm tra API keys có đúng không
- Kiểm tra kết nối internet

### Không thấy nút gọi
- Đảm bảo đang ở trong chat 1-1 (không phải group chat)
- Đảm bảo người nhận không phải là bot hoặc tài khoản bị vô hiệu hóa
- Kiểm tra CallProvider đã được wrap đúng chưa

### Cuộc gọi không kết nối
- Kiểm tra quyền truy cập microphone/camera của trình duyệt
- Kiểm tra firewall/network có chặn WebRTC không
- Kiểm tra Stringee token có hết hạn không (token có thời hạn 1 giờ)

## API Endpoints

- `GET /api/method/raven.api.stringee_token.get_stringee_token` - Lấy token
- `POST /api/method/raven.api.stringee_token.create_call_session` - Tạo session cuộc gọi
- `POST /api/method/raven.api.stringee_token.update_call_status` - Cập nhật trạng thái
- `POST /api/method/raven.api.stringee_token.answer_call` - Trả lời cuộc gọi
- `POST /api/method/raven.api.stringee_token.reject_call` - Từ chối cuộc gọi 