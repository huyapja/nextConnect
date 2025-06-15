export type FilterConversationType =
  | 'all'
  | 'private'        // Trò chuyện riêng tư
  | 'group'          // Trò chuyện nhóm
  | 'labeled'        // Gắn nhãn
  | 'flagged'        // Gắn cờ
  | 'threaded'       // Chủ đề
  | 'unread'         // Chưa đọc
  | 'done';      // Đã xong / Đã xử lý
