import { RavenMessage } from '@/types/RavenMessaging/RavenMessage'
import { UserContext } from '@/utils/auth/UserProvider'
import { useUpdateLastMessageDetails } from '@/utils/channel/ChannelListProvider'
import { useFrappePostCall, useSWRConfig } from 'frappe-react-sdk'
import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Message } from '../../../../../../types/Messaging/Message'
// import { useOnlineStatus } from '../../network/useNetworkStatus'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { useAtom } from 'jotai'
import { CustomFile } from '../../file-upload/FileDrop'
import { isImageFile } from '../ChatMessage/Renderers/FileMessage'

export type PendingMessage = {
  id: string
  content?: string
  status: 'pending' | 'error'
  createdAt: number
  message_type: 'Text' | 'File' | 'Image'
  file?: CustomFile
  fileMeta?: { name: string; size: number; type: string }
}

import { atom } from 'jotai'

export const messageProcessingIdsAtom = atom<string[]>([])

export const useSendMessage = (
  channelID: string,
  uploadFiles: (
    selectedMessage?: Message | null
  ) => Promise<{ client_id: string; message: RavenMessage | null; file: CustomFile }[]>,
  uploadOneFile: (
    f: CustomFile,
    selectedMessage?: Message | null
  ) => Promise<{ client_id: string; message: RavenMessage | null; file: CustomFile }>,
  onMessageSent: (messages: RavenMessage[]) => void,
  selectedMessage?: Message | null
) => {
  const { call, loading } = useFrappePostCall<{ message: RavenMessage }>('raven.api.raven_message.send_message')
  const { call: createDMChannel } = useFrappePostCall<{ message: string }>('raven.api.raven_channel.create_direct_message_channel')
  const { updateLastMessageForChannel } = useUpdateLastMessageDetails()
  const { currentUser } = useContext(UserContext)
  const { workspaceID } = useParams()
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()
  const STORAGE_KEY = `pending_messages_${channelID}`

  const [pendingMessages, setPendingMessages] = useState<Record<string, PendingMessage[]>>({})
  const pendingQueueRef = useRef<Record<string, PendingMessage[]>>({})
  const [processingIds, setProcessingIds] = useAtom(messageProcessingIdsAtom)
  const isProcessing = (id: string) => processingIds.includes(id)

  const createClientId = () => `${Date.now()}-${Math.random()}`

  const persistPendingMessages = async (updated: Record<string, PendingMessage[]>) => {
    const current = updated[channelID] || []

    const safeToSave = current.map((m) => {
      if (m.message_type === 'File' || m.message_type === 'Image') {
        const { id, content, status, createdAt, message_type, fileMeta } = m
        return { id, content, status, createdAt, message_type, fileMeta }
      }
      return m
    })

    await idbSet(STORAGE_KEY, safeToSave)

    for (const m of current) {
      if ((m.message_type === 'File' || m.message_type === 'Image') && m.file) {
        const maxSize = 5 * 1024 * 1024
        if (m.file.size <= maxSize) {
          await idbSet(`file-${m.id}`, m.file)
        } else {
          console.warn(`Skip saving large file: ${m.file.name} (${m.file.size} bytes)`)
        }
      }
    }
  }

  const updatePendingState = (updater: (messages: PendingMessage[]) => PendingMessage[]) => {
    setPendingMessages((prev) => {
      const updatedChannel = updater(prev[channelID] || [])
      const updated = {
        ...prev,
        [channelID]: updatedChannel
      }
      pendingQueueRef.current = {
        ...pendingQueueRef.current,
        [channelID]: updatedChannel.filter((m) => m.status === 'pending')
      }
      persistPendingMessages(updated)
      return updated
    })
  }

  const updateSidebarMessage = (msg: RavenMessage, fallbackText?: string) => {
    updateLastMessageForChannel(channelID, {
      message_id: msg.name,
      content: fallbackText || msg.content || '',
      owner: currentUser,
      message_type: msg.message_type,
      is_bot_message: msg.is_bot_message,
      bot: msg.bot || null,
      timestamp: new Date().toISOString()
    })
  }

  // Hàm xử lý tạo DM channel cho draft channel
  const handleDraftChannel = async (draftChannelID: string): Promise<string> => {
    if (draftChannelID.startsWith('_')) {
      const userID = draftChannelID.substring(1)
      try {
        const result = await createDMChannel({ user_id: userID })
        const realChannelID = result?.message
        
        if (realChannelID) {
          // Cập nhật channel list
          mutate('channel_list')
          
          // Chuyển hướng đến channel thực sự
          if (workspaceID) {
            navigate(`/${workspaceID}/${realChannelID}`, { replace: true })
          } else {
            navigate(`/channel/${realChannelID}`, { replace: true })
          }
          
          return realChannelID
        }
      } catch (error) {
        console.error('Không thể tạo DM channel:', error)
        throw error
      }
    }
    return draftChannelID
  }

  const sendOneMessage = async (content: string, client_id: string, json?: any, sendSilently = false) => {
    // Xử lý draft channel trước khi gửi tin nhắn
    const actualChannelID = await handleDraftChannel(channelID)
    
    const res = await call({
      channel_id: actualChannelID,
      text: content,
      client_id,
      json_content: json,
      is_reply: selectedMessage ? 1 : 0,
      linked_message: selectedMessage ? selectedMessage.name : null,
      send_silently: sendSilently
    })

    const { message, client_id: returnedClientId } = res.message as any

    const msgWithClientId = { ...message, client_id: returnedClientId }

    updateSidebarMessage(msgWithClientId)
    onMessageSent([msgWithClientId])

    updatePendingState((msgs) => msgs.filter((m) => m.id !== returnedClientId))
  }

  const sendTextMessage = async (content: string, json?: any, sendSilently = false) => {
    const pendingTextMsg = (pendingMessages[channelID] || []).find(
      (m) => m.message_type === 'Text' && m.content?.trim() === content?.trim()
    )

    const client_id = pendingTextMsg ? pendingTextMsg.id : createClientId()

    await sendOneMessage(content, client_id, json, sendSilently)
  }

  const sendFileMessages = async () => {
    // Xử lý draft channel trước khi upload files
    await handleDraftChannel(channelID)
    
    const uploadedFiles = await uploadFiles(selectedMessage)

    uploadedFiles.forEach(({ client_id, message, file }) => {
      if (message) {
        updateSidebarMessage(message)
        onMessageSent([message])

        // ✅ Remove pendingMessage nào có file trùng
        updatePendingState((msgs) =>
          msgs.filter(
            (m) =>
              !(
                (m.message_type === 'File' || m.message_type === 'Image') &&
                m.fileMeta?.name?.trim().toLowerCase() === message.content?.trim().toLowerCase()
              )
          )
        )
      } else {
        updatePendingState((msgs) => [
          ...msgs,
          {
            id: client_id,
            status: 'pending',
            createdAt: Date.now(),
            message_type: isImageFile(file.name) ? 'Image' : 'File',
            file,
            fileMeta: { name: file.name, size: file.size, type: file.type }
          }
        ])
      }
    })
  }

  const sendMessage = async (content: string, json?: any, sendSilently = false) => {
    try {
      if (content.trim()) {
        await sendTextMessage(content, json, sendSilently)
      }
      await sendFileMessages()
    } catch (err) {
      if (content.trim()) {
        const client_id = createClientId()
        const newPending: PendingMessage = {
          id: client_id,
          content,
          status: 'pending',
          createdAt: Date.now(),
          message_type: 'Text'
        }
        updatePendingState((msgs) => [...msgs, newPending])
      }
    }
  }

  useEffect(() => {
    const loadPending = async () => {
      const saved = await idbGet(STORAGE_KEY)
      if (saved) {
        const restored = await Promise.all(
          saved.map(async (m: any) => {
            if (m.message_type === 'File' || m.message_type === 'Image') {
              const file = await idbGet(`file-${m.id}`)
              return { ...m, file }
            }
            return m
          })
        )

        setPendingMessages((prev) => ({
          ...prev,
          [channelID]: restored
        }))

        pendingQueueRef.current[channelID] = restored.filter((m) => m.status === 'pending')
      }
    }

    loadPending()
  }, [channelID])

  const retryPendingMessages = async () => {
    const queue = [...(pendingQueueRef.current[channelID] || [])]

    for (const msg of queue) {
      await sendOnePendingMessage(msg.id)
    }
  }

  const sendOnePendingMessage = async (id: string) => {
    if (isProcessing(id)) {
      console.warn(`Message ${id} is already processing, skip.`)
      return
    }

    setProcessingIds((prev) => [...prev, id])

    try {
      const msg = (pendingMessages[channelID] || []).find((m) => m.id === id)
      if (!msg) return

      if (msg.message_type === 'Text') {
        await sendOneMessage(msg.content || '', msg.id)
      } else if (msg.message_type === 'File' || msg.message_type === 'Image') {
        let file = msg.file

        if (!file) {
          file = await idbGet(`file-${msg.id}`)
        }

        if (file) {
          // Xử lý draft channel trước khi upload file
          await handleDraftChannel(channelID)
          
          const result = await uploadOneFile(file, selectedMessage)
          if (result.message) {
            // Gửi xuống cuối bằng cách thêm resend_at
            const resendAt = Date.now()

            onMessageSent([
              {
                ...result.message,
                resend_at: resendAt
              } as any
            ])

            updateSidebarMessage(result.message)
            removePendingMessage(id)
          } else {
            updatePendingState((msgs) => msgs.map((m) => (m.id === id ? { ...m, status: 'error' } : m)))
          }
        } else {
          console.warn('Cannot retry file: missing file in RAM and IndexedDB')
        }
      }
    } catch (err) {
      console.error('sendOnePendingMessage error', err)
    } finally {
      setProcessingIds((prev) => prev.filter((x) => x !== id))
    }
  }

  const removePendingMessage = (id: string) => {
    if (isProcessing(id)) {
      console.warn(`Message ${id} is already processing, skip remove.`)
      return
    }

    setProcessingIds((prev) => [...prev, id])

    try {
      updatePendingState((msgs) => msgs.filter((m) => m.id !== id))
    } finally {
      setProcessingIds((prev) => prev.filter((x) => x !== id))
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      updatePendingState((msgs) =>
        msgs.map((m) => {
          if (m.status === 'pending' && now - m.createdAt > 10000) {
            return { ...m, status: 'error' }
          }
          return m
        })
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [channelID])

  return {
    sendMessage,
    loading,
    pendingMessages: pendingMessages[channelID] || [],
    retryPendingMessages,
    sendOnePendingMessage,
    removePendingMessage
  }
}