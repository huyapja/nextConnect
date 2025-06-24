import { RavenMessage } from '@/types/RavenMessaging/RavenMessage'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useState, useEffect, useRef } from 'react'
import { Message } from '../../../../../../types/Messaging/Message'
// import { useOnlineStatus } from '../../network/useNetworkStatus'
import { CustomFile } from '../../file-upload/FileDrop'
import { isImageFile } from '../ChatMessage/Renderers/FileMessage'
import { set as idbSet, get as idbGet } from 'idb-keyval'
import { PendingMessage } from './useSendMessage'

export const useSendMessageThread = (
  channelID: string,
  threadID: string,
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
  const STORAGE_KEY = `pending_thread_messages_${threadID}`

  const [pendingMessages, setPendingMessages] = useState<Record<string, PendingMessage[]>>({})
  const pendingQueueRef = useRef<Record<string, PendingMessage[]>>({})

  const createClientId = () => `${Date.now()}-${Math.random()}`

  const persistPendingMessages = async (updated: Record<string, PendingMessage[]>) => {
    const current = updated[threadID] || []

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
        await idbSet(`file-${m.id}`, m.file)
      }
    }
  }

  const updatePendingState = (updater: (messages: PendingMessage[]) => PendingMessage[]) => {
    setPendingMessages((prev) => {
      const updatedThread = updater(prev[threadID] || [])
      const updated = {
        ...prev,
        [threadID]: updatedThread
      }
      pendingQueueRef.current = {
        ...pendingQueueRef.current,
        [threadID]: updatedThread.filter((m) => m.status === 'pending')
      }
      persistPendingMessages(updated)
      return updated
    })
  }

  const sendOneMessage = async (content: string, client_id: string, json?: any, sendSilently = false) => {
    const res = await call({
      channel_id: channelID,
      parent_message: threadID,
      text: content,
      client_id,
      json_content: json,
      is_reply: selectedMessage ? 1 : 0,
      linked_message: selectedMessage ? selectedMessage.name : null,
      send_silently: sendSilently
    })

    const { message, client_id: returnedClientId } = res.message

    const msgWithClientId = { ...message, client_id: returnedClientId }

    onMessageSent([msgWithClientId])

    updatePendingState((msgs) => msgs.filter((m) => m.id !== returnedClientId))
  }

  const sendTextMessage = async (content: string, json?: any, sendSilently = false) => {
    const pendingTextMsg = (pendingMessages[threadID] || []).find(
      (m) => m.message_type === 'Text' && m.content === content
    )

    const client_id = pendingTextMsg ? pendingTextMsg.id : createClientId()

    await sendOneMessage(content, client_id, json, sendSilently)
  }

  const sendFileMessages = async () => {
    const uploadedFiles = await uploadFiles(selectedMessage)

    uploadedFiles.forEach(({ client_id, message, file }) => {
      if (message) {
        onMessageSent([message])
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
          [threadID]: restored
        }))

        pendingQueueRef.current[threadID] = restored.filter((m) => m.status === 'pending')
      }
    }

    loadPending()
  }, [threadID])

  const retryPendingMessages = async () => {
    const queue = [...(pendingQueueRef.current[threadID] || [])]

    for (const msg of queue) {
      try {
        if (msg.message_type === 'Text') {
          await sendOneMessage(msg.content || '', msg.id)
        } else if (msg.message_type === 'File' && msg.file) {
          const result = await uploadOneFile(msg.file, selectedMessage)
          if (result.message) {
            onMessageSent([result.message])
            removePendingMessage(msg.id)
          } else {
            updatePendingState((msgs) => msgs.map((m) => (m.id === msg.id ? { ...m, status: 'error' } : m)))
          }
        } else {
          console.warn('Cannot retry file: missing file object in memory')
        }
      } catch (err) {
        console.error('retryPendingMessages error', err)
      }
    }
  }

  const sendOnePendingMessage = async (id: string) => {
    const msg = (pendingMessages[threadID] || []).find((m) => m.id === id)
    if (!msg) return

    try {
      if (msg.message_type === 'Text') {
        await sendOneMessage(msg.content || '', msg.id)
      } else if (msg.message_type === 'File' || msg.message_type === 'Image') {
        let file = msg.file

        if (!file) {
          file = await idbGet(`file-${msg.id}`)
        }

        if (file) {
          const result = await uploadOneFile(file, selectedMessage)
          if (result.message) {
            onMessageSent([result.message])
            removePendingMessage(id)
          } else {
            updatePendingState((msgs) => msgs.map((m) => (m.id === id ? { ...m, status: 'error' } : m)))
          }
        } else {
          console.warn('Cannot retry file: missing file in RAM and IndexedDB')
        }
      } else {
        console.warn('Cannot retry file: missing file object in memory')
      }
    } catch (err) {
      console.error('sendOnePendingMessage error', err)
    }
  }

  const removePendingMessage = (id: string) => {
    updatePendingState((msgs) => msgs.filter((m) => m.id !== id))
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      updatePendingState((msgs) =>
        msgs.map((m) => {
          if (m.status === 'pending') {
            console.log('checking pending', m.id, now - m.createdAt)
          }
          if (m.status === 'pending' && now - m.createdAt > 10000) {
            return { ...m, status: 'error' }
          }
          return m
        })
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [threadID])

  return {
    sendMessage,
    loading,
    pendingMessages: pendingMessages[threadID] || [],
    retryPendingMessages,
    sendOnePendingMessage,
    removePendingMessage
  }
}
