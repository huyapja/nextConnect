export type Message = FileMessage | TextMessage | ImageMessage | PollMessage | SystemMessage | GroupCallMessage

export interface BaseMessage {
    name: string,
    owner: string,
    _liked_by: string,
    channel_id: string,
    creation: string,
    modified: string,
    message_type: 'Text' | 'File' | 'Image' | 'Poll' | 'System' | 'GroupCall',
    message_reactions?: string | null,
    is_continuation: 1 | 0
    is_reply: 1 | 0
    linked_message?: string | null
    link_doctype?: string
    link_document?: string
    is_edited: 1 | 0
    is_forwarded: 1 | 0
    /** JSON as string */
    replied_message_details?: string,
    poll_id?: string
    is_bot_message?: 1 | 0,
    bot?: string,
    hide_link_preview?: 1 | 0,
    is_thread: 1 | 0,
    is_pinned: 1 | 0,
    content?: string
    is_retracted?: 1 | 0
    group_call_room_id?: string
    group_call_status?: string
    group_call_participants?: string
}

export interface FileMessage extends BaseMessage {
    id: string
    fileMeta: any
    is_error: any
    is_pending: any
    text: string,
    file: string,
    message_type: 'File'
}

export interface ImageMessage extends BaseMessage {
    id: string
    is_error: any
    is_pending: any
    fileMeta: any
    text: string,
    file: string,
    message_type: 'Image'
    thumbnail_width?: number,
    thumbnail_height?: number,
    image_thumbnail?: string,
    blurhash?: string
}

export interface TextMessage extends BaseMessage {
    is_error: any
    is_pending: any
    id: string
    text: string,
    message_type: 'Text',
    content?: string
}

export interface PollMessage extends BaseMessage {
    text: string,
    message_type: 'Poll',
    poll_id: string,
    content?: string
}

export interface SystemMessage extends BaseMessage {
    message_type: 'System',
    text: string,
}

export interface GroupCallMessage extends BaseMessage {
    message_type: 'GroupCall',
    text: string,
    group_call_room_id: string,
    group_call_status: string,
    group_call_participants: string
}

export type DateBlock = {
    block_type: 'date',
    data: string
}

export type MessageBlock = {
    block_type: 'message',
    data: Message
}

export type MessagesWithDate = (DateBlock | MessageBlock)[]