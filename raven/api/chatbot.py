import frappe
from frappe import _
from frappe.model.document import Document
from raven.ai.openai_client import get_open_ai_client
from raven.chatbot.doctype.chatconversation.chatconversation import ChatConversation
from raven.chatbot.doctype.chatmessage.chatmessage import ChatMessage
import uuid
import traceback
import os
import time
from frappe.utils import get_files_path
from PyPDF2 import PdfReader
import docx
import pandas as pd
import tiktoken

# Helper: Tạo tin nhắn
def create_message(conversation_id, message, is_user=True, message_type="Text", file=None):
    message_id = str(uuid.uuid4())
    chat_message = frappe.get_doc({
        "doctype": "ChatMessage",
        "name": message_id,
        "parent": conversation_id,
        "parentfield": "messages",
        "parenttype": "ChatConversation",
        "sender": frappe.session.user if is_user else "AI Assistant",
        "is_user": is_user,
        "message": message,
        "message_type": message_type,
        "file": file,
        "timestamp": frappe.utils.now()
    })
    chat_message.insert()
    return chat_message

def extract_text_from_file(file_url):
    is_private = file_url.startswith("/private/")
    base_path = get_files_path(is_private=is_private)
    full_path = os.path.join(base_path, os.path.basename(file_url))

    try:
        if file_url.endswith(".pdf"):
            with open(full_path, 'rb') as f:
                reader = PdfReader(f)
                return '\n'.join([page.extract_text() for page in reader.pages if page.extract_text()])
        elif file_url.endswith(".docx"):
            doc = docx.Document(full_path)
            return '\n'.join([p.text for p in doc.paragraphs])
        elif file_url.endswith((".xls", ".xlsx")):
            df = pd.read_excel(full_path)
            return df.to_string(index=False)
        elif file_url.endswith(".txt"):
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
    except Exception as e:
        return f"[Không thể đọc file: {e}]"

    return "[Định dạng file không hỗ trợ]"

# Helper: Xây dựng context từ các tin nhắn gần nhất
def build_context(conversation_id, model="gpt-4o"):
    # Cấu hình tokens để hỗ trợ 5 files (5MB mỗi file) + text 11,000 từ
    MAX_TOTAL_TOKENS = 80000      # Tổng tokens cho input (trong giới hạn 128K của GPT-4o)
    MAX_FILE_TOKENS = 10000       # Mỗi file tối đa 10K tokens (≈ 5MB content)
    MAX_MESSAGE_COUNT = 100       # Tăng số message để lưu đủ history với files

    try:
        encoding = tiktoken.encoding_for_model(model)
    except:
        encoding = tiktoken.get_encoding("cl100k_base")

    def token_len(text):
        return len(encoding.encode(text or ""))

    frappe.db.commit()

    messages = frappe.get_all(
        "ChatMessage",
        filters={"parent": conversation_id},
        fields=["sender", "is_user", "message", "timestamp", "file", "message_type"],
        order_by="timestamp desc",
        limit_page_length=MAX_MESSAGE_COUNT
    )[::-1]

    # Thêm system message để ghi đè thông tin mặc định
    system_message = {
        "role": "system",
        "content": """Bạn là trợ lý AI tiên tiến được hỗ trợ bởi mô hình GPT-4o của OpenAI. 

Hướng dẫn trả lời:
- Hãy trả lời một cách chính xác, chi tiết và thông minh
- Sử dụng tiếng Việt tự nhiên và thân thiện
- Khi được hỏi về kiến thức chuyên môn, hãy đi sâu vào chi tiết
- Nếu cần giải quyết vấn đề phức tạp, hãy phân tích từng bước
- Khi không chắc chắn, hãy thừa nhận và đưa ra các khả năng
- Luôn cố gắng cung cấp giá trị thực sự trong mỗi câu trả lời"""
    }
    
    context = [system_message]
    total_tokens = token_len(system_message["content"])

    for msg in messages:
        content = msg.message or ""

        # Nếu có file → trích nội dung
        if msg.file:
            file_text = extract_text_from_file(msg.file) or ""
            file_tokens = token_len(file_text)

            if file_tokens == 0:
                continue
            elif file_tokens > MAX_FILE_TOKENS:
                # Rút gọn file quá lớn nhưng giữ nhiều nội dung hơn (cho files 5MB)
                approx_summary = file_text.strip()[:7500]  # Tăng từ 1500 lên 7500 chars
                content += (
                    "\n\n[Nội dung file tóm tắt:]\n"
                    + approx_summary +
                    "\n\n[Ghi chú: Nội dung đã được rút gọn vì quá dài]"
                )
            else:
                content += f"\n\n[Nội dung file đính kèm:]\n{file_text.strip()}"

        msg_tokens = token_len(content)

        if total_tokens + msg_tokens > MAX_TOTAL_TOKENS:
            continue

        total_tokens += msg_tokens
        context.append({
            "role": "user" if msg.is_user else "assistant",
            "content": content.strip()
        })

    frappe.log_error(
        f"[BUILD_CONTEXT] conversation_id={conversation_id}, messages={len(messages)}, context={len(context)}, tokens={total_tokens}",
        "Build Context - Token Accurate"
    )

    return context

# Helper: Gọi OpenAI
def call_openai(context):
    raven_settings = frappe.get_cached_doc("Raven Settings")
    if not raven_settings.enable_ai_integration:
        return "AI chưa được kích hoạt. Vui lòng liên hệ admin."

    client = get_open_ai_client()
    if not client:
        return "Không thể kết nối OpenAI. Vui lòng kiểm tra cấu hình API key."

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=context,
        temperature=0.3,  # Giảm temperature để có response ổn định và chính xác hơn
        max_tokens=8000,  # Tăng max_tokens để có response đầy đủ cho các files lớn
        top_p=0.9,        # Thêm top_p để kiểm soát chất lượng response
        frequency_penalty=0.1  # Giảm lặp lại
    )
    return response.choices[0].message.content


@frappe.whitelist()
def get_conversations():
    return frappe.get_all(
        "ChatConversation",
        filters={"user": frappe.session.user},
        fields=["name", "title", "creation"],
        order_by="creation desc"
    )


@frappe.whitelist()
def create_conversation(title):
    conversation = frappe.get_doc({
        "doctype": "ChatConversation",
        "title": title,
        "user": frappe.session.user
    })
    conversation.insert()
    return conversation


@frappe.whitelist()
def get_messages(conversation_id=None):
    if not conversation_id:
        return []

    return frappe.get_all(
        "ChatMessage",
        filters={"parent": conversation_id},
        fields=["name", "sender", "is_user", "message", "timestamp" ,"message_type" ,"file"],
        order_by="timestamp asc"
    )


@frappe.whitelist()
def send_message(conversation_id, message, is_user=True, message_type="Text", file=None, trigger_ai=True):
    try:
        if not frappe.db.exists("ChatConversation", conversation_id):
            frappe.throw(_("Cuộc trò chuyện không tồn tại"))

        chat_message = create_message(conversation_id, message, is_user, message_type, file)

        # Commit message trước khi enqueue AI reply
        frappe.db.commit()

        # Chỉ trigger AI reply nếu trigger_ai = True và là user message
        if is_user and trigger_ai:
            # Delay nhỏ để đảm bảo message đã được commit
            frappe.enqueue(
                "raven.api.chatbot.handle_ai_reply",
                conversation_id=conversation_id,
                now=False,
                timeout=600  # 10 phút timeout cho files lớn
            )

        return chat_message.name

    except Exception as e:
        frappe.log_error(
            f"{str(e)}\n{traceback.format_exc()}",
            "Gửi tin nhắn thất bại"
        )
        frappe.throw(_("Có lỗi xảy ra khi gửi tin nhắn"))


@frappe.whitelist()
def trigger_ai_reply(conversation_id, message_text=None):
    """
    API để trigger AI reply cho conversation sau khi upload files
    """
    try:
        if not frappe.db.exists("ChatConversation", conversation_id):
            frappe.throw(_("Cuộc trò chuyện không tồn tại"))
        
        # Tạo message từ user nếu có message_text
        if message_text:
            create_message(conversation_id, message_text, is_user=True, message_type="Text")
            frappe.db.commit()
        
        # Enqueue AI reply
        frappe.enqueue(
            "raven.api.chatbot.handle_ai_reply",
            conversation_id=conversation_id,
            now=False,
            timeout=600  # 10 phút timeout cho files lớn
        )
        
        return {"success": True, "message": "AI reply đã được trigger"}
        
    except Exception as e:
        frappe.log_error(
            f"{str(e)}\n{traceback.format_exc()}",
            "Trigger AI Reply Error"
        )
        frappe.throw(_("Có lỗi xảy ra khi gọi AI reply"))


def handle_ai_reply(conversation_id):
    # Tạo lock key để tránh duplicate processing
    lock_key = f"ai_reply_lock_{conversation_id}"
    
    try:
        # Kiểm tra xem có process nào đang xử lý conversation này không
        if frappe.cache().get(lock_key):
            frappe.logger().info(f"[AI SKIPPED] Another AI reply process is already running for conversation {conversation_id}")
            return
        
        # Set lock với timeout 60 giây
        frappe.cache().setex(lock_key, 60, "processing")
        
        max_retries = 5
        delay_base = 1
        context = []

        for attempt in range(max_retries):
            if attempt > 0:
                time.sleep(delay_base * attempt)

            # 🛠️ Fix race condition: delay nhỏ ở lần đầu để chờ file được commit
            if attempt == 0:
                time.sleep(0.3)

            context = build_context(conversation_id)

            if context:
                break

            frappe.log_error(
                f"[AI RETRY] Attempt {attempt + 1}/{max_retries} - context rỗng",
                "AI Handler - Retry Context"
            )

        if not context:
            frappe.log_error(
                f"[AI SKIPPED] Context vẫn rỗng sau {max_retries} lần thử tại conversation_id={conversation_id}",
                "AI Handler - Final Skip"
            )
            return

        # Kiểm tra xem có AI message nào đang pending không (tránh duplicate reply)
        recent_ai_messages = frappe.get_all(
            "ChatMessage",
            filters={
                "parent": conversation_id,
                "is_user": 0,
                "creation": [">=", frappe.utils.add_to_date(frappe.utils.now(), minutes=-2)]
            },
            limit_page_length=1
        )
        
        if recent_ai_messages:
            frappe.logger().info(f"[AI SKIPPED] Recent AI message found for conversation {conversation_id}, skipping duplicate reply")
            return

        ai_reply = call_openai(context)
        chat_message = create_message(conversation_id, ai_reply, is_user=False)
        frappe.db.commit()

        frappe.publish_realtime(
            event='raven:new_ai_message',
            message={
                'conversation_id': conversation_id,
                'message': ai_reply,
                'message_id': chat_message.name
            },
            after_commit=True
        )

        frappe.logger().info(f"[AI SUCCESS] AI reply completed for conversation {conversation_id}")

    except Exception as e:
        frappe.log_error(
            f"Error handling AI reply:\n{str(e)}\n{traceback.format_exc()}",
            "AI Handler Error"
        )
    finally:
        # Luôn clear lock khi hoàn thành
        frappe.cache().delete(lock_key)



@frappe.whitelist()
def rename_conversation(conversation_id, title):
    max_retries = 3
    retry_delay = 0.5  # 500ms

    for attempt in range(max_retries):
        try:
            if not frappe.db.exists("ChatConversation", conversation_id):
                frappe.throw(_("Cuộc trò chuyện không tồn tại"))

            # Lấy document mới nhất từ database
            conversation = frappe.get_doc("ChatConversation", conversation_id)
            old_title = conversation.title
            conversation.title = title

            # Sử dụng ignore_version=True để bỏ qua timestamp check
            conversation.save(ignore_permissions=True, ignore_version=True)
            frappe.db.commit()

            frappe.publish_realtime(
                event='raven:update_conversation_title',
                message={
                    'conversation_id': conversation_id,
                    'old_title': old_title,
                    'new_title': title,
                    'creation': conversation.creation
                },
                after_commit=True,
                doctype="ChatConversation"
            )

            return conversation

        except frappe.exceptions.TimestampMismatchError as e:
            if attempt < max_retries - 1:
                frappe.log_error(
                    f"[RENAME RETRY] Attempt {attempt + 1}/{max_retries} - TimestampMismatchError, đang retry...",
                    "Rename Conversation - Retry"
                )
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                # Nếu vẫn lỗi sau max_retries, thử cách khác
                try:
                    # Sử dụng frappe.db.set_value để update trực tiếp
                    frappe.db.set_value("ChatConversation", conversation_id, "title", title)
                    frappe.db.commit()

                    # Lấy lại conversation sau khi update
                    conversation = frappe.get_doc("ChatConversation", conversation_id)

                    frappe.publish_realtime(
                        event='raven:update_conversation_title',
                        message={
                            'conversation_id': conversation_id,
                            'old_title': old_title if 'old_title' in locals() else '',
                            'new_title': title,
                            'creation': conversation.creation
                        },
                        after_commit=True,
                        doctype="ChatConversation"
                    )

                    return conversation

                except Exception as fallback_error:
                    frappe.log_error(
                        f"[RENAME FALLBACK ERROR] {str(fallback_error)}\n{traceback.format_exc()}",
                        "Rename Conversation - Fallback Failed"
                    )
                    frappe.throw(_("Không thể đổi tên cuộc trò chuyện sau nhiều lần thử"))

        except Exception as e:
            frappe.log_error(
                f"[RENAME ERROR] Attempt {attempt + 1}: {str(e)}\n{traceback.format_exc()}",
                "Rename Conversation - General Error"
            )
            if attempt == max_retries - 1:
                frappe.throw(_("Có lỗi xảy ra khi đổi tên cuộc trò chuyện"))

    frappe.throw(_("Không thể đổi tên cuộc trò chuyện sau nhiều lần thử"))