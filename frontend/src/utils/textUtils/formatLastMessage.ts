const MAX_PREVIEW_LENGTH = 10

export const truncateText = (text: string, maxLength: number = MAX_PREVIEW_LENGTH): string => {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

const isImageFile = (filename: string = ''): boolean => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename)

const isVideoFile = (filename: string = ''): boolean => /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i.test(filename)

const isAudioFile = (filename: string = ''): boolean => /\.(mp3|wav|ogg|m4a|aac)$/i.test(filename)

const stripHtmlTags = (html: string): string => html.replace(/<\/?[^>]+(>|$)/g, '')

export interface Channel {
  name: any
  peer_user_id: any
  is_direct_message: boolean
  last_message_details: any
}

export function formatLastMessageParts(
  channel: Channel,
  currentUser: string,
  senderName?: string,
  maxLength: number = MAX_PREVIEW_LENGTH
): { senderLabel: string; contentLabel: string } {
  if (!channel?.last_message_details) return { senderLabel: '', contentLabel: '' }

  let raw: any
  try {
    raw =
      typeof channel.last_message_details === 'string'
        ? JSON.parse(channel.last_message_details)
        : channel.last_message_details
  } catch {
    return { senderLabel: '', contentLabel: '' }
  }

  const isCurrentUser = raw.owner === currentUser

  // Nếu là bot và là tin nhắn trực tiếp -> chỉ hiển thị contentLabel
  if (raw.is_bot_message && channel.is_direct_message) {
    return {
      senderLabel: '',
      contentLabel: parseContentLabel(raw, maxLength)
    }
  }

  // Xác định senderLabel
  let senderLabel = ''
  if (raw.content?.includes('thu hồi')) {
    senderLabel = ''
  } else if (raw.is_bot_message) {
    senderLabel = raw.bot || 'bot'
  } else {
    senderLabel = isCurrentUser ? 'Bạn' : channel.is_direct_message ? '' : senderName || raw.owner || 'Người dùng'
  }

  return {
    senderLabel,
    contentLabel: parseContentLabel(raw, maxLength)
  }
}

function parseContentLabel(raw: any, maxLength: number): string {
  if (typeof raw.content !== 'string') return ''
  const filename = raw.content

  switch (raw.message_type) {
    case 'Image':
      return 'gửi ảnh'
    case 'Audio':
      return 'gửi âm thanh'
    case 'File':
      if (isImageFile(filename)) return 'gửi ảnh'
      if (isVideoFile(filename)) return 'gửi video'
      if (isAudioFile(filename)) return 'gửi âm thanh'
      return 'gửi file'
    case 'Text':
      // eslint-disable-next-line no-case-declarations
      const text = stripHtmlTags(filename)
      return truncateText(text, maxLength)
    default:
      return ''
  }
}
