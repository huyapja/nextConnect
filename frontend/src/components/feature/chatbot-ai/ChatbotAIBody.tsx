import ChatbotAIChatBox from '@/components/feature/chatbot-ai/ChatbotAIChatBox'
import { ChatSession } from '@/components/feature/chatbot-ai/ChatbotAIContainer'
import { useChatbotConversations, useChatbotMessages, useSendChatbotMessage } from '@/hooks/useChatbotAPI'
import { Message } from '@/types/ChatBot/types'
import { normalizeConversations, normalizeMessages } from '@/utils/chatBot-options'
import { useFrappeEventListener } from 'frappe-react-sdk'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import ChatStreamLoader from '../chat/ChatStream/ChatStreamLoader'
import { CustomFile } from '../file-upload/FileDrop'
import useUploadChatbotFile from './useUploadChatbotFile'

const MESSAGES_PER_PAGE = 15
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']

const ChatbotAIBody = ({ botID }: { botID?: string }) => {
  const { data: conversations } = useChatbotConversations()
  // Lấy messages từ backend
  const { data: messages, mutate: mutateMessages, isLoading: loadingMessages } = useChatbotMessages(botID || undefined)

  const [socketConnected, setSocketConnected] = useState(true)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE)
  const [fileError, setFileError] = useState<string | null>(null)
  const { addFile, uploadFiles } = useUploadChatbotFile(botID as string, input)

  const { call: sendMessage, loading: sending } = useSendChatbotMessage()

  // Chuyển đổi dữ liệu conversation sang ChatSession cho UI
  const sessions: ChatSession[] = useMemo(() => {
    return normalizeConversations(conversations)?.map((c) => ({
      id: c.name,
      title: c.title,
      creation: c.creation,
      messages: []
    }))
  }, [conversations])

  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === botID) || sessions[0]
  }, [sessions, botID])

  // File validation logic
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB'
    }
    return null
  }, [])

  // File handling logic
  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file)
      if (error) {
        setFileError(error)
      } else {
        setSelectedFile(file)
        setFileError(null)
      }
    },
    [validateFile]
  )

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null)
    setFileError(null)
  }, [])

  // Message pagination logic
  const { visibleMessages, hasMore, startIdx } = useMemo(() => {
    const totalMessages = localMessages?.length
    const startIdx = Math.max(0, totalMessages - visibleCount)
    return {
      visibleMessages: localMessages.slice(startIdx),
      hasMore: startIdx > 0,
      startIdx
    }
  }, [localMessages, visibleCount])

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + MESSAGES_PER_PAGE)
  }, [])

  // Reset visible count when session changes
  useEffect(() => {
    setVisibleCount(MESSAGES_PER_PAGE)
  }, [botID])

  // Hàm gửi tin nhắn Chatbot AI
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim()
    const hasText = trimmedInput !== ''
    const hasFile = !!selectedFile

    if ((!hasText && !hasFile) || sending || loadingMessages) return

    const clearFileInput = () => {
      const fileInput = document.querySelector<HTMLInputElement>("input[type='file']")
      if (fileInput) fileInput.value = ''
    }

    const createContext = () =>
      localMessages?.map((msg) => ({
        role: msg.role,
        content: msg.content
      })) || []

    const tempMessage: Message | null = hasText
      ? {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          pending: true
        }
      : null

    if (tempMessage) {
      setLocalMessages((prev) => [...prev, tempMessage])
    }

    setInput('')
    setFileError(null)
    setIsThinking(true)

    try {
      const context = createContext()

      if (hasFile) {
        const fileWrapper = selectedFile as CustomFile
        fileWrapper.fileID = `${fileWrapper.name}-${Date.now()}`

        await addFile(fileWrapper)
        await uploadFiles()
      } else if (hasText) {
        await sendMessage({
          conversation_id: botID!,
          message: trimmedInput,
          context
        })
      }

      await mutateMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.')

      if (tempMessage) {
        setLocalMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id))
      }
    } finally {
      setSelectedFile(null)
      clearFileInput()
    }
  }, [
    input,
    selectedFile,
    sending,
    loadingMessages,
    localMessages,
    botID,
    sendMessage,
    mutateMessages,
    addFile,
    uploadFiles
  ])

  // Input handlers
  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      handleSendMessage()
    },
    [handleSendMessage]
  )

  // Update local messages when backend messages change
  useEffect(() => {
    const normalizedMessages = normalizeMessages(messages)
    setLocalMessages(normalizedMessages)
  }, [messages])

  // Thêm xử lý realtime cho tin nhắn AI
  useFrappeEventListener('raven:new_ai_message', (data) => {
    if (data.conversation_id !== botID) return

    setLocalMessages((prev) => {
      const exists = prev.some((msg) => msg.id === data.message_id)
      if (exists) return prev

      return [
        ...prev,
        {
          id: data.message_id,
          role: 'ai',
          content: data.message
        }
      ]
    })
    setIsThinking(false)
  })

  useFrappeEventListener('raven:error', (error) => {
    console.error('Socket error:', error)
    setSocketConnected(false)
    setIsThinking(false)
    setTimeout(() => {
      window.location.reload()
    }, 5000)
  })

  // Polling fallback when socket disconnected
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout

    if (!socketConnected) {
      pollingInterval = setInterval(() => {
        mutateMessages()
      }, 3000)
    }

    return () => clearInterval(pollingInterval)
  }, [socketConnected, mutateMessages])

  const handleReloadThinking = useCallback(() => {
    mutateMessages()
    setIsThinking(false)
  }, [mutateMessages])

  // Early return if no session is selected
  if (!selectedSession || !botID || loadingMessages) {
    return <ChatStreamLoader />
  }

  return (
    <ChatbotAIChatBox
      session={{
        id: botID,
        title: selectedSession.title,
        messages: visibleMessages
      }}
      // Input states
      input={input}
      onInputChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
      // File states
      selectedFile={selectedFile}
      fileError={fileError}
      onFileSelect={handleFileSelect}
      onRemoveFile={handleRemoveFile}
      allowedFileTypes={ALLOWED_FILE_TYPES}
      maxFileSize={MAX_FILE_SIZE}
      // Message states
      isThinking={isThinking}
      onReload={handleReloadThinking}
      thinkingTimeout={20000}
      hasMore={hasMore}
      onShowMore={handleShowMore}
      startIdx={startIdx}
      // Loading states
      loading={sending || loadingMessages}
    />
  )
}

export default ChatbotAIBody
