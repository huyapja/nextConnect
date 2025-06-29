import frappe
from frappe import _
from frappe.handler import upload_file

@frappe.whitelist()
def upload_file_with_message():
    """
    Gửi file đính kèm cho Chatbot AI. Gắn file vào ChatMessage trong ChatConversation.
    """
    # Lấy dữ liệu từ form gửi lên
    conversation_id = frappe.form_dict.get("conversation_id")
    message = frappe.form_dict.get("message") or ""
    file = frappe.request.files.get("file")
    batch_upload = frappe.form_dict.get("batch_upload", False)  # Flag để không gọi AI reply

    # Kiểm tra bắt buộc
    if not conversation_id:
        frappe.throw(_("Thiếu conversation_id"))
    if not file:
        frappe.throw(_("Không có file đính kèm"))

    try:
        # Đặt savepoint để rollback nếu lỗi
        frappe.db.savepoint("before_upload")
        # Tạo bản ghi ChatMessage (tạm thời chưa có file_url)
        message_doc = frappe.get_doc({
            "doctype": "ChatMessage",
            "parenttype": "ChatConversation",
            "parent": conversation_id,
            "parentfield": "messages",
            "sender": frappe.session.user,
            "is_user": 1,
            "message": message or file.filename,
            "message_type": "File",
        }).insert()

        # Chuẩn bị biến môi trường để upload
        frappe.form_dict.doctype = "ChatMessage"
        frappe.form_dict.docname = message_doc.name
        frappe.form_dict.fieldname = "file"
        frappe.form_dict.optimize = 0  # nếu muốn nén ảnh

        # Gọi hàm upload file
        file_doc = upload_file()

        # Cập nhật file_url vào bản ghi ChatMessage
        message_doc.file = file_doc.file_url
        message_doc.save()

        # Đảm bảo tất cả đã commit trước khi AI xử lý
        frappe.db.commit()

        # Log để debug nếu cần
        frappe.logger().info(f"[UPLOAD_WITH_MESSAGE] ChatMessage đã tạo: {message_doc.name}, File: {file_doc.file_url}")

        # Chỉ gọi AI reply nếu không phải batch upload
        if not batch_upload:
            frappe.enqueue(
                "raven.api.chatbot.handle_ai_reply",
                conversation_id=conversation_id,
                now=False,
                enqueue_after_commit=True
            )

        return {
            "message": message_doc.name,
            "file_url": file_doc.file_url
        }

    except Exception as e:
        # Rollback lại bản ghi ChatMessage
        frappe.db.rollback(save_point="before_upload")
        frappe.log_error(f"{str(e)}", "upload_file_with_message FAILED")
        frappe.throw(_("Có lỗi xảy ra khi gửi file đính kèm"))


@frappe.whitelist()
def upload_multiple_files_with_message():
    """
    Gửi nhiều file đính kèm cùng lúc cho Chatbot AI (tối đa 5 file)
    """
    conversation_id = frappe.form_dict.get("conversation_id")
    message = frappe.form_dict.get("message") or ""
    
    # Kiểm tra bắt buộc
    if not conversation_id:
        frappe.throw(_("Thiếu conversation_id"))
    
    # Lấy danh sách file từ request
    files = []
    for i in range(5):  # Tối đa 5 file
        file_key = f"file_{i}"
        if file_key in frappe.request.files:
            files.append(frappe.request.files[file_key])
    
    if not files:
        frappe.throw(_("Không có file đính kèm"))
    
    if len(files) > 5:
        frappe.throw(_("Tối đa chỉ được tải lên 5 file cùng lúc"))
    
    try:
        frappe.db.savepoint("before_batch_upload")
        
        uploaded_files = []
        
        # Upload từng file
        for idx, file in enumerate(files):
            # Tạo bản ghi ChatMessage cho mỗi file
            message_doc = frappe.get_doc({
                "doctype": "ChatMessage",
                "parenttype": "ChatConversation", 
                "parent": conversation_id,
                "parentfield": "messages",
                "sender": frappe.session.user,
                "is_user": 1,
                "message": message if idx == 0 else file.filename,  # Chỉ file đầu tiên có message
                "message_type": "File",
            }).insert()
            
            # Chuẩn bị upload file
            original_form_dict = frappe.form_dict.copy()
            frappe.form_dict.doctype = "ChatMessage"
            frappe.form_dict.docname = message_doc.name
            frappe.form_dict.fieldname = "file"
            frappe.form_dict.optimize = 0
            
            # Tạm thời set file hiện tại vào request
            original_files = frappe.request.files.copy()
            frappe.request.files = {"file": file}
            
            try:
                file_doc = upload_file()
                message_doc.file = file_doc.file_url
                message_doc.save()
                
                uploaded_files.append({
                    "message": message_doc.name,
                    "file_url": file_doc.file_url,
                    "filename": file.filename
                })
                
                frappe.logger().info(f"[BATCH_UPLOAD] File {idx+1}/{len(files)} uploaded: {file.filename}")
                
            finally:
                # Khôi phục lại form_dict và files
                frappe.form_dict = original_form_dict
                frappe.request.files = original_files
        
        # Commit tất cả các file
        frappe.db.commit()
        
        # Gọi AI reply một lần duy nhất sau khi tất cả file đã upload
        frappe.enqueue(
            "raven.api.chatbot.handle_ai_reply",
            conversation_id=conversation_id,
            now=False,
            enqueue_after_commit=True
        )
        
        frappe.logger().info(f"[BATCH_UPLOAD] Uploaded {len(uploaded_files)} files successfully")
        
        return {
            "success": True,
            "files": uploaded_files,
            "total_files": len(uploaded_files)
        }
        
    except Exception as e:
        frappe.db.rollback(save_point="before_batch_upload")
        frappe.log_error(f"{str(e)}", "upload_multiple_files_with_message FAILED")
        frappe.throw(_("Có lỗi xảy ra khi gửi file đính kèm: ") + str(e))
