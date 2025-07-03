import base64
import io
from mimetypes import guess_type

import blurhash
import frappe
from frappe import _
from frappe.core.doctype.file.utils import get_local_image
from frappe.handler import upload_file
from frappe.utils.image import optimize_image
from PIL import Image, ImageOps

# Giới hạn kích thước file cho Raven messaging (5MB)
RAVEN_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes

def upload_JPEG_wrt_EXIF(content, filename, optimize=False):
	"""
	When a user uploads a JPEG file, we need to transpose the image based on the EXIF data.
	This is because the image is rotated when it is uploaded to the server.
	"""
	content_type = guess_type(filename)[0]

	# if file format is JPEG, we need to transpose the image
	if content_type.startswith("image/jpeg"):
		with Image.open(io.BytesIO(content)) as image:
			# transpose the image
			transposed_image = ImageOps.exif_transpose(image)
			#  convert the image to bytes
			buffer = io.BytesIO()
			# save the image to the buffer
			transposed_image.save(buffer, format="JPEG")
			# get the value of the buffer
			buffer = buffer.getvalue()
	else:
		buffer = base64.b64decode(content)

	if optimize:
		buffer = optimize_image(buffer, content_type)

	file_doc = frappe.get_doc(
		{
			"doctype": "File",
			"file_name": filename,
			"content": buffer,
			"attached_to_doctype": "Raven Message",
			"attached_to_name": frappe.form_dict.docname,
			"is_private": 1,
			"attached_to_field": "file",
		}
	).insert()

	return file_doc

@frappe.whitelist(methods=["POST"])
def upload_file_with_message():
	"""
	Upload file vào Raven Chat:
	- Tạo Raven Message
	- Upload file
	- Nếu là ảnh: tính blurhash, kích thước
	- Cập nhật last_message_details
	- Reset is_done nếu cần
	- Gửi realtime: raven:channel_done_updated, new_message
	"""

	files = frappe.request.files
	if "file" not in files:
		frappe.throw("Không có file đính kèm")

	file = files["file"]
	file_content = file.stream.read()
	file_size = len(file_content)
	file.stream.seek(0)

	if file_size > RAVEN_MAX_FILE_SIZE:
		frappe.throw(
			_("Kích thước file không được vượt quá 5MB. File của bạn là {0} MB").format(
				round(file_size / 1024 / 1024, 2)
			),
			exc=frappe.ValidationError
		)

	image_exts = ["jpg", "jpeg", "png", "gif", "webp"]
	frappe.form_dict.doctype = "Raven Message"
	frappe.form_dict.fieldname = "file"
	frappe.form_dict.optimize = str(frappe.form_dict.get("compressImages", "false")).lower() in ("1", "true")
	client_id = frappe.form_dict.get("client_id")
	channel_id = frappe.form_dict.get("channelID")

	# 1. Tạo message
	message_doc = frappe.new_doc("Raven Message")
	message_doc.channel_id = channel_id
	message_doc.message_type = "File"
	message_doc.text = frappe.form_dict.caption

	if not frappe.form_dict.caption:
		message_doc.content = file.filename or "File"
	else:
		message_doc.content = frappe.form_dict.caption

	message_doc.is_reply = frappe.form_dict.is_reply
	if message_doc.is_reply in ("1", 1, True):
		message_doc.linked_message = frappe.form_dict.linked_message

	message_doc.insert()
	frappe.form_dict.docname = message_doc.name

	# 2. Upload file
	if file.filename.lower().endswith((".jpeg", ".jpg")):
		file_doc = upload_JPEG_wrt_EXIF(file_content, file.filename, frappe.form_dict.optimize)
	else:
		file_doc = upload_file()

	message_doc.reload()
	message_doc.file = file_doc.file_url

	# 3. Nếu là ảnh, tính blurhash & kích thước
	ext = file.filename.split(".")[-1].lower()
	if ext in image_exts:
		from PIL import Image
		image, _, _ = get_local_image(file_doc.file_url)
		width, height = image.size
		is_landscape = width > height

		MAX_WIDTH = 480
		MAX_HEIGHT = 320
		if is_landscape:
			thumb_w = min(width, MAX_WIDTH)
			thumb_h = int(height * thumb_w / width)
		else:
			thumb_h = min(height, MAX_HEIGHT)
			thumb_w = int(width * thumb_h / height)

		image.thumbnail((thumb_w, thumb_h))
		x_comp = 4 if is_landscape else 3
		y_comp = 3 if is_landscape else 4
		blurhash_str = blurhash.encode(image, x_components=x_comp, y_components=y_comp)

		message_doc.message_type = "Image"
		message_doc.blurhash = blurhash_str
		message_doc.image_width = width
		message_doc.image_height = height
		message_doc.thumbnail_width = thumb_w
		message_doc.thumbnail_height = thumb_h

	message_doc.save()

	# 4. Cập nhật last_message_details của channel
	frappe.db.set_value("Raven Channel", channel_id, {
		"last_message_details": frappe.as_json({
			"message_id": message_doc.name,
			"content": message_doc.content or message_doc.file,
			"owner": message_doc.owner,
			"message_type": message_doc.message_type,
			"is_bot_message": 0,
			"bot": None
		}),
		"last_message_timestamp": message_doc.creation
	})

	# 5. RESET is_done = 0 cho những user đã mark done
	done_members = frappe.get_all(
		"Raven Channel Member",
		filters={"channel_id": channel_id, "is_done": 1},
		fields=["name", "user_id"]
	)

	for member in done_members:
		frappe.db.set_value("Raven Channel Member", member.name, "is_done", 0)
		frappe.publish_realtime(
			event="raven:channel_done_updated",
			message={"channel_id": channel_id, "is_done": 0},
			user=member.user_id,
			after_commit=True
		)

	# 6. Gửi event new_message cho user khác
	all_members = frappe.get_all("Raven Channel Member", filters={"channel_id": channel_id}, pluck="user_id")

	for uid in all_members:
		if uid != frappe.session.user:
			frappe.publish_realtime(
				event="new_message",
				message={
					"channel_id": channel_id,
					"user": frappe.session.user,
					"seen_at": frappe.utils.now_datetime(),
				},
				user=uid
			)

	# 7. Trả về kết quả
	return {
		"message": message_doc.as_dict(),
		"client_id": client_id
	}
