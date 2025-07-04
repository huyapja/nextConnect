import { getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import { savedMessageStore } from '@/hooks/useSavedMessageStore'
import { UserContext } from '@/utils/auth/UserProvider'
import { updateSavedCount } from '@/utils/updateSavedCount'
import { ContextMenu, Flex } from '@radix-ui/themes'
import { FrappeConfig, FrappeContext, useSWRConfig } from 'frappe-react-sdk'
import { useContext } from 'react'
import { AiOutlineEdit } from 'react-icons/ai'
import { BiBookmarkMinus, BiBookmarkPlus, BiCopy, BiDownload, BiLink, BiPaperclip, BiTrash } from 'react-icons/bi'
import { LuForward, LuReply } from 'react-icons/lu'
import { MdOutlineEmojiEmotions } from 'react-icons/md'
import { RiPushpinLine, RiUnpinLine } from 'react-icons/ri'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileMessage, Message } from '../../../../../../../types/Messaging/Message'
import MessageActionSubMenu from './MessageActionSubMenu'
import { CreateThreadContextItem } from './QuickActions/CreateThreadButton'
import { RetractVote } from './RetractVote'
import { useMessageCopy } from './useMessageCopy'

export interface MessageContextMenuProps {
  message?: Message | null
  onDelete: VoidFunction
  onEdit: VoidFunction
  onReply: VoidFunction
  onForward: VoidFunction
  onViewReaction?: VoidFunction
  onAttachDocument: VoidFunction
  showThreadButton?: boolean
  selectedText?: string
}
export const MessageContextMenu = ({
  message,
  onDelete,
  onEdit,
  onReply,
  onForward,
  showThreadButton,
  onAttachDocument,
  onViewReaction,
  selectedText
}: MessageContextMenuProps) => {
  const copy = useMessageCopy(message, selectedText)
  const { currentUser } = useContext(UserContext)

  const isOwner = currentUser === message?.owner && !message?.is_bot_message

  const isReactionsAvailable = Object.keys(JSON.parse(message?.message_reactions ?? '{}'))?.length !== 0

  return (
    <ContextMenu.Content>
      {message ? (
        <>
          {message && message.message_type === 'Poll' && <RetractVote message={message} />}

          <ContextMenu.Item>
            <Flex gap='2' width='100%' onClick={onReply}>
              <LuReply size='18' />
              Trả lời
            </Flex>
          </ContextMenu.Item>

          <ContextMenu.Item>
            <Flex gap='2' width='100%' onClick={onForward}>
              <LuForward size='18' />
              Chuyển tiếp
            </Flex>
          </ContextMenu.Item>

          {message && !message.is_thread && showThreadButton && <CreateThreadContextItem messageID={message.name} />}

          {/* <CopyMessageLink message={message} /> */}

          <ContextMenu.Separator />
          <ContextMenu.Group>
            {(message.text || selectedText) && (
              <ContextMenu.Item>
                <Flex gap='2' width='100%' onClick={copy}>
                  <BiCopy size='18' />
                  Sao chép {selectedText ? 'đoạn văn bản đã chọn' : ''}
                </Flex>
              </ContextMenu.Item>
            )}

            {['File', 'Image'].includes(message.message_type) && (
              <ContextMenu.Group>
                <ContextMenu.Item>
                  <Flex gap='2' width='100%' onClick={copy}>
                    <BiLink size='18' />
                    Sao chép liên kết
                  </Flex>
                </ContextMenu.Item>

                <ContextMenu.Item asChild>
                  <a download href={(message as FileMessage).file}>
                    <Flex gap='2'>
                      <BiDownload size='18' />
                      Tải xuống
                    </Flex>
                  </a>
                </ContextMenu.Item>

                <ContextMenu.Item>
                  <Flex gap='2' width='100%' onClick={onAttachDocument}>
                    <BiPaperclip size='18' />
                    Đính kèm vào tài liệu
                  </Flex>
                </ContextMenu.Item>
              </ContextMenu.Group>
            )}

            {showThreadButton && <PinMessageAction message={message} />}
            <SaveMessageAction message={message} />
          </ContextMenu.Group>

          {isReactionsAvailable && (
            <ContextMenu.Group>
              <ContextMenu.Separator />
              <ContextMenu.Item>
                <Flex gap='2' width='100%' onClick={onViewReaction}>
                  <MdOutlineEmojiEmotions size='18' />
                  Xem cảm xúc
                </Flex>
              </ContextMenu.Item>
            </ContextMenu.Group>
          )}

          <MessageActionSubMenu messageID={message.name} />

          {isOwner && (
            <ContextMenu.Group>
              <ContextMenu.Separator />
              {message.message_type === 'Text' && (
                <ContextMenu.Item>
                  <Flex gap='2' width='100%' onClick={onEdit}>
                    <AiOutlineEdit size='18' />
                    Chỉnh sửa
                  </Flex>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item color='red'>
                <Flex gap='2' width='100%' onClick={onDelete}>
                  <BiTrash size='18' />
                  Thu hồi
                </Flex>
              </ContextMenu.Item>
            </ContextMenu.Group>
          )}
        </>
      ) : null}
    </ContextMenu.Content>
  )
}

const CopyMessageLink = ({ message }: { message: Message }) => {
  const { workspaceID, threadID } = useParams()

  const onClick = () => {
    let basePath = `${import.meta.env.VITE_BASE_NAME}`
    if (!window.location.origin.endsWith('/')) {
      basePath = '/' + basePath
    }

    const isMessageInThread = threadID === message.channel_id
    if (isMessageInThread) {
      navigator.clipboard.writeText(
        `${window.location.origin}${basePath}/${encodeURIComponent(workspaceID ?? 'channels')}/threads/${encodeURIComponent(threadID)}?message_id=${encodeURIComponent(message.name)}`
      )
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}${basePath}/${encodeURIComponent(workspaceID ?? 'channels')}/${encodeURIComponent(message.channel_id)}?message_id=${encodeURIComponent(message.name)}`
      )
    }
    toast.success('Message link copied to clipboard')
  }

  return (
    <ContextMenu.Item>
      <Flex gap='2' width='100%' onClick={onClick}>
        <BiLink size='18' />
        Sao chép liên kết
      </Flex>
    </ContextMenu.Item>
  )
}

const SaveMessageAction = ({ message }: { message: Message }) => {
  const { currentUser } = useContext(UserContext)
  const isSaved = JSON.parse(message._liked_by ? message._liked_by : '[]').includes(currentUser)
  const { call } = useContext(FrappeContext) as FrappeConfig

  const { threadID } = useParams() // 👈 lấy từ URL

  const handleLike = () => {
    call
      .post('raven.api.raven_message.save_message', {
        // doctype: 'Raven Message',
        message_id: message.name,
        add: isSaved ? 'No' : 'Yes',
        thread_id: threadID || null
      })
      .then((response) => {
        if (isSaved) {
          toast('Message unsaved')
          savedMessageStore.removeMessage(message.name)
          updateSavedCount(-1) // 👈 Giảm 1
        } else {
          savedMessageStore.pushMessage(response.message)
          toast.success('Message saved')
          updateSavedCount(+1) // 👈 Tăng 1
        }
      })
      .catch((e) => {
        toast.error('Could not perform the action', {
          description: getErrorMessage(e)
        })
      })
  }

  return (
    <ContextMenu.Item>
      <Flex gap='2' width='100%' onClick={handleLike}>
        {!isSaved && <BiBookmarkPlus size='18' />}
        {isSaved && <BiBookmarkMinus size='18' />}
        {!isSaved ? 'Gắn cờ' : 'Bỏ gắn cờ'} tin nhắn
      </Flex>
    </ContextMenu.Item>
  )
}

const PinMessageAction = ({ message }: { message: Message }) => {
  const isPinned = message.is_pinned
  const { call } = useContext(FrappeContext) as FrappeConfig
  const { mutate } = useSWRConfig()

  const handlePin = () => {
    call
      .post('raven.api.raven_channel.toggle_pin_message', {
        channel_id: message.channel_id,
        message_id: message.name
      })
      .then(() => {
        mutate('channel_list')
        toast.success(`Message ${isPinned ? 'unpinned' : 'pinned'}`)
      })
      .catch((e) => {
        toast.error('Could not perform the action', {
          description: getErrorMessage(e)
        })
      })
  }

  return (
    <ContextMenu.Item>
      <Flex gap='2' width='100%' onClick={handlePin}>
        {!isPinned ? <RiPushpinLine size='18' /> : <RiUnpinLine size='18' />}
        {!isPinned ? 'Ghim' : 'Bỏ ghim'}
      </Flex>
    </ContextMenu.Item>
  )
}
