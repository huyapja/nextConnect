import ChatbotAIChatBox from '@/components/feature/chatbot-ai/ChatbotAIChatBox'
import { ChatSession } from '@/components/feature/chatbot-ai/ChatbotAIContainer'
import { useChatbotConversations, useChatbotMessages, useSendChatbotMessage } from '@/hooks/useChatbotAPI'
import { Message } from '@/types/ChatBot/types'
import { normalizeConversations, normalizeMessages } from '@/utils/chatBot-options'
import { FrappeConfig, FrappeContext, useFrappeEventListener } from 'frappe-react-sdk'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  const { call } = useContext(FrappeContext) as FrappeConfig

  const [socketConnected, setSocketConnected] = useState(true)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE)
  const [fileError, setFileError] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null) // Track pending message với files
  const { files, addFile, addFiles, removeFile, uploadFiles, canAddMore, maxFiles, fileUploadProgress } = useUploadChatbotFile(botID as string, input)

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
        const success = addFile(file)
        if (success) {
          setFileError(null)
        }
      }
    },
    [validateFile, addFile]
  )

  // Multiple file handling
  const handleFilesSelect = useCallback(
    (fileList: File[]) => {
      const validFiles: File[] = []
      let hasError = false
      
      for (const file of fileList) {
        const error = validateFile(file)
        if (error) {
          setFileError(error)
          hasError = true
          break
        } else {
          validFiles.push(file)
        }
      }
      
      if (!hasError && validFiles.length > 0) {
        const success = addFiles(validFiles)
        if (success) {
          setFileError(null)
        }
      }
    },
    [validateFile, addFiles]
  )

  const handleRemoveFile = useCallback((fileId: string) => {
    removeFile(fileId)
    setFileError(null)
  }, [removeFile])

  const handleClearAllFiles = useCallback(() => {
    files.forEach(file => removeFile(file.fileID))
    setFileError(null)
  }, [files, removeFile])

  // Function to group consecutive file messages from same user
  const groupConsecutiveFileMessages = useCallback((messages: Message[]) => {
    const grouped: Message[] = []
    let i = 0

    while (i < messages.length) {
      const currentMsg = messages[i]
      
      if (currentMsg.role === 'user' && currentMsg.message_type === 'File') {
        // Start of a file group - collect all consecutive file messages
        const fileGroup: Message[] = [currentMsg]
        let j = i + 1
        
        while (j < messages.length && 
               messages[j].role === 'user' && 
               messages[j].message_type === 'File') {
          fileGroup.push(messages[j])
          j++
        }
        
        if (fileGroup.length > 1) {
          // Group multiple file messages into one
          const firstMsg = fileGroup[0]
          const fileTexts = fileGroup.map(msg => msg.content).filter(Boolean)
          const combinedContent = fileTexts.length > 0 
            ? fileTexts.join('\n') 
            : `${fileGroup.length} files uploaded`
            
          grouped.push({
            ...firstMsg,
            content: combinedContent,
            id: `grouped-${firstMsg.id}`,
            // Store original messages for rendering multiple files
            groupedFiles: fileGroup
          } as Message & { groupedFiles: Message[] })
        } else {
          // Single file message
          grouped.push(currentMsg)
        }
        
        i = j
      } else {
        // Regular message
        grouped.push(currentMsg)
        i++
      }
    }
    
    return grouped
  }, [])

  // Message pagination logic with grouping
  const { visibleMessages, hasMore, startIdx } = useMemo(() => {
    const groupedMessages = groupConsecutiveFileMessages(localMessages)
    const totalMessages = groupedMessages?.length
    const startIdx = Math.max(0, totalMessages - visibleCount)
    return {
      visibleMessages: groupedMessages.slice(startIdx),
      hasMore: startIdx > 0,
      startIdx
    }
  }, [localMessages, visibleCount, groupConsecutiveFileMessages])

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + MESSAGES_PER_PAGE)
  }, [])

  // Reset visible count when session changes
  useEffect(() => {
    setVisibleCount(MESSAGES_PER_PAGE)
    setPendingMessage(null) // Clear pending message when switching sessions
  }, [botID])

  // Hàm gửi tin nhắn Chatbot AI
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim()
    const hasText = trimmedInput !== ''
    const hasFile = files.length > 0

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

    // Tạo pending message với cả text và files
    const newPendingMessage: Message | null = (hasText || hasFile)
      ? {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: hasText 
            ? (hasFile ? `${trimmedInput}\n\n[Đang tải ${files.length} file...]` : trimmedInput)
            : `[Đang tải ${files.length} file...]`,
          pending: true,
          message_type: hasFile ? 'File' : 'Text'
        }
      : null

    if (newPendingMessage) {
      setPendingMessage(newPendingMessage)
    }

    setInput('')
    setFileError(null)
    setIsThinking(true)

    try {
      const context = createContext()

      // STEP 1: Gửi text message trước (nếu có)
      if (hasText) {
        await sendMessage({
          conversation_id: botID!,
          message: trimmedInput,
          context
        })
      }

      // STEP 2: Upload files sau (nếu có)
      if (hasFile) {
        await uploadFiles()
      }

      // STEP 3: Trigger AI reply để xử lý toàn bộ conversation
      if (hasText || hasFile) {
        try {
          await call.post('raven.api.chatbot.trigger_ai_reply', {
            conversation_id: botID!,
            message_text: null // Không cần message text vì đã gửi rồi
          })
        } catch (error) {
          console.error('Error triggering AI reply:', error)
        }
      }

      await mutateMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.')

      // Clear pending message on error
      setPendingMessage(null)
      setIsThinking(false)
    } finally {
      clearFileInput()
    }
  }, [
    input,
    files,
    sending,
    loadingMessages,
    localMessages,
    botID,
    sendMessage,
    mutateMessages,
    uploadFiles,
    call
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
    
    // Merge pending message if exists
    const allMessages = [...normalizedMessages]
    
    if (pendingMessage) {
      // Simple check: if we have any recent user messages from backend, clear pending
      const latestUserMessage = normalizedMessages
        .filter(msg => msg.role === 'user')
        .slice(-1)[0]
      
      if (latestUserMessage && 
          normalizedMessages.length > 0 && 
          pendingMessage.content &&
          (latestUserMessage.content?.includes(pendingMessage.content.split('\n\n[Đang tải')[0]) ||
           latestUserMessage.message_type === 'File')) {
        // Clear pending message if we found a matching backend message
        setPendingMessage(null)
      } else {
        // Add pending message if no match found
        allMessages.push(pendingMessage)
      }
    }
    
    setLocalMessages(allMessages)
  }, [messages, pendingMessage])

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
    // Clear pending message when AI replies
    setPendingMessage(null)
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
      files={files}
      fileError={fileError}
      onFileSelect={handleFileSelect}
      onFilesSelect={handleFilesSelect}
      onRemoveFile={handleRemoveFile}
      onClearAllFiles={handleClearAllFiles}
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