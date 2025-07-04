import { Loader } from '@/components/common/Loader'
import { ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'
import { ChannelHistoryFirstMessage } from '@/components/layout/EmptyState/EmptyState'
import { useChannelSeenUsers } from '@/hooks/useChannelSeenUsers'
import { useCurrentChannelData } from '@/hooks/useCurrentChannelData'
import { useDebounceDynamic } from '@/hooks/useDebounce'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useUserData } from '@/hooks/useUserData'
import { getFileExtension } from '@/utils/operations'
import { virtuosoSettings } from '@/utils/VirtuosoSettings'
import {
  forwardRef,
  memo,
  MutableRefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react'
import { useLocation } from 'react-router-dom'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { Message } from '../../../../../../types/Messaging/Message'
import { PendingMessage } from '../ChatInput/useSendMessage'
import { isImageFile } from '../ChatMessage/Renderers/FileMessage'
import ChatDialogs from './ChatDialogs'
import ChatStreamLoader from './ChatStreamLoader'
import { MemoizedMessageRow } from './MemoizedMessageRow'
import ScrollToBottomButtons from './ScrollToBottomButtons'
import useChatStream from './useChatStream'
import { useChatStreamActions } from './useChatStreamActions'

type Props = {
  channelID: string
  replyToMessage: (message: Message) => void
  showThreadButton?: boolean
  pinnedMessagesString?: string
  onModalClose?: () => void
  virtuosoRef: MutableRefObject<VirtuosoHandle>
  pendingMessages?: PendingMessage[]
  removePendingMessage?: (id: string) => void
  sendOnePendingMessage?: (id: string) => void
}

// Tách thành separate hooks để tránh re-render không cần thiết
const useUrlParams = () => {
  const location = useLocation()
  return useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return {
      isSavedMessage: searchParams.has('message_id'),
      messageId: searchParams.get('message_id')
    }
  }, [location.search])
}

// Tối ưu state management - gộp các state liên quan
interface ChatState {
  isAtBottom: boolean
  hasScrolledToTarget: boolean
  isScrolling: boolean
  isVirtuosoReady: boolean
  isContentMeasured: boolean
  initialRenderComplete: boolean
  isInitialLoadComplete: boolean
  isLoadingMessages: boolean
  hasInitialLoadedWithMessageId: boolean
}

const initialChatState: ChatState = {
  isAtBottom: false,
  hasScrolledToTarget: false,
  isScrolling: false,
  isVirtuosoReady: false,
  isContentMeasured: false,
  initialRenderComplete: false,
  isInitialLoadComplete: false,
  isLoadingMessages: false,
  hasInitialLoadedWithMessageId: false
}

type ChatStateAction =
  | { type: 'SET_AT_BOTTOM'; payload: boolean }
  | { type: 'SET_SCROLLED_TO_TARGET'; payload: boolean }
  | { type: 'SET_SCROLLING'; payload: boolean }
  | { type: 'SET_VIRTUOSO_READY'; payload: boolean }
  | { type: 'SET_CONTENT_MEASURED'; payload: boolean }
  | { type: 'SET_INITIAL_RENDER_COMPLETE'; payload: boolean }
  | { type: 'SET_INITIAL_LOAD_COMPLETE'; payload: boolean }
  | { type: 'SET_LOADING_MESSAGES'; payload: boolean }
  | { type: 'SET_INITIAL_LOADED_WITH_MESSAGE_ID'; payload: boolean }
  | { type: 'BULK_UPDATE'; payload: Partial<ChatState> }
  | { type: 'RESET' }

const chatStateReducer = (state: ChatState, action: ChatStateAction): ChatState => {
  switch (action.type) {
    case 'SET_AT_BOTTOM':
      return { ...state, isAtBottom: action.payload }
    case 'SET_SCROLLED_TO_TARGET':
      return { ...state, hasScrolledToTarget: action.payload }
    case 'SET_SCROLLING':
      return { ...state, isScrolling: action.payload }
    case 'SET_VIRTUOSO_READY':
      return { ...state, isVirtuosoReady: action.payload }
    case 'SET_CONTENT_MEASURED':
      return { ...state, isContentMeasured: action.payload }
    case 'SET_INITIAL_RENDER_COMPLETE':
      return { ...state, initialRenderComplete: action.payload }
    case 'SET_INITIAL_LOAD_COMPLETE':
      return { ...state, isInitialLoadComplete: action.payload }
    case 'SET_LOADING_MESSAGES':
      return { ...state, isLoadingMessages: action.payload }
    case 'SET_INITIAL_LOADED_WITH_MESSAGE_ID':
      return { ...state, hasInitialLoadedWithMessageId: action.payload }
    case 'BULK_UPDATE':
      return { ...state, ...action.payload }
    case 'RESET':
      return { ...initialChatState }
    default:
      return state
  }
}

// Tối ưu animation frame hook
const useOptimizedAnimationFrame = () => {
  const rafRef = useRef<number>()
  const callbackQueueRef = useRef<(() => void)[]>([])
  const isProcessingRef = useRef(false)

  const processQueue = useCallback(() => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    rafRef.current = requestAnimationFrame(() => {
      const callbacks = [...callbackQueueRef.current]
      callbackQueueRef.current = []

      callbacks.forEach((callback) => {
        try {
          callback()
        } catch (error) {
          console.error('Animation frame callback error:', error)
        }
      })

      isProcessingRef.current = false

      // Process next batch if queue has new items
      if (callbackQueueRef.current.length > 0) {
        processQueue()
      }
    })
  }, [])

  const schedule = useCallback(
    (callback: () => void) => {
      callbackQueueRef.current.push(callback)
      if (!isProcessingRef.current) {
        processQueue()
      }
    },
    [processQueue]
  )

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      callbackQueueRef.current = []
      isProcessingRef.current = false
    }
  }, [])

  return schedule
}

// Memoize các component con để tránh re-render
const MemoizedHeader = memo(({ hasOlderMessages, isLoading }: { hasOlderMessages: boolean; isLoading: boolean }) => {
  if (!hasOlderMessages || isLoading) return null

  return (
    <div className='flex w-full min-h-8 pb-4 justify-center items-center'>
      <Loader />
    </div>
  )
})

const MemoizedFooter = memo(({ hasNewMessages }: { hasNewMessages: boolean }) => {
  if (!hasNewMessages) return null

  return (
    <div className='flex w-full min-h-8 pb-4 justify-center items-center'>
      <Loader />
    </div>
  )
})

const ChatStream = forwardRef<VirtuosoHandle, Props>(
  (
    {
      channelID,
      replyToMessage,
      showThreadButton = true,
      pinnedMessagesString,
      onModalClose,
      virtuosoRef,
      pendingMessages,
      sendOnePendingMessage,
      removePendingMessage
    },
    ref
  ) => {
    const { isSavedMessage, messageId } = useUrlParams()
    const [isInitialMounting, setIsInitialMounting] = useState(true)
    const [chatState, dispatch] = useReducer(chatStateReducer, initialChatState)

    const scheduleFrame = useOptimizedAnimationFrame()
    const initialRenderRef = useRef(true)
    const hasProcessedInitialLoad = useRef(false)

    // Cleanup timeouts on unmount
    const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set())

    const safeSetTimeout = useCallback((callback: () => void, delay: number) => {
      const timeoutId = setTimeout(() => {
        timeoutRefs.current.delete(timeoutId)
        callback()
      }, delay)
      timeoutRefs.current.add(timeoutId)
      return timeoutId
    }, [])

    useEffect(() => {
      return () => {
        timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId))
        timeoutRefs.current.clear()
      }
    }, [])

    // Reset state khi thay đổi channel hoặc messageId
    useEffect(() => {
      setIsInitialMounting(true)
      dispatch({ type: 'RESET' })
      initialRenderRef.current = true
      hasProcessedInitialLoad.current = false

      const timeout = safeSetTimeout(() => {
        setIsInitialMounting(false)
      }, 1000)

      return () => clearTimeout(timeout) // cleanup nếu channel đổi nhanh
    }, [channelID, messageId, safeSetTimeout])

    const {
      messages,
      hasOlderMessages,
      loadOlderMessages,
      goToLatestMessages,
      hasNewMessages,
      error,
      loadNewerMessages,
      isLoading,
      highlightedMessage,
      scrollToMessage,
      newMessageCount,
      newMessageIds,
      markMessageAsSeen,
      clearAllNewMessages
    } = useChatStream(channelID, virtuosoRef, pinnedMessagesString, chatState.isAtBottom)

    // Tối ưu việc xử lý initial load
    useEffect(() => {
      const hasMessages = (messages?.length ?? 0) > 0 || (pendingMessages?.length ?? 0) > 0

      if (hasMessages && !chatState.isInitialLoadComplete && !hasProcessedInitialLoad.current) {
        hasProcessedInitialLoad.current = true

        setTimeout(() => {
          dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true })
        }, 100)
        setTimeout(() => dispatch({ type: 'SET_VIRTUOSO_READY', payload: true }), 200)
        setTimeout(() => dispatch({ type: 'SET_CONTENT_MEASURED', payload: true }), 300)
        setTimeout(() => dispatch({ type: 'SET_INITIAL_RENDER_COMPLETE', payload: true }), 500)
      }
    }, [messages, pendingMessages, chatState.isInitialLoadComplete, scheduleFrame])

    // Tối ưu debounced range changed
    const handleRangeChanged = useDebounceDynamic(
      useCallback(
        (range: any) => {
          // Safety checks for all required conditions
          if (!Array.isArray(messages) || !chatState.isInitialLoadComplete || !chatState.isVirtuosoReady || chatState.isScrolling) {
            return
          }
          
          // Additional safety check for range object
          if (!range || typeof range.startIndex !== 'number' || typeof range.endIndex !== 'number') {
            return
          }

          // Preload sớm tin nhắn cũ nếu gần đầu
          if (range.startIndex <= 15 && hasOlderMessages && !chatState.isLoadingMessages) {
            dispatch({ type: 'SET_LOADING_MESSAGES', payload: true })
            loadOlderMessages().finally(() => {
              safeSetTimeout(() => dispatch({ type: 'SET_LOADING_MESSAGES', payload: false }), 300)
            })
          }

          const shouldLoadNewer =
            hasNewMessages &&
            range.endIndex >= messages.length - 5 &&
            !chatState.isLoadingMessages &&
            !chatState.hasInitialLoadedWithMessageId

          if (shouldLoadNewer) {
            dispatch({ type: 'SET_LOADING_MESSAGES', payload: true })
            loadNewerMessages().finally(() => {
              safeSetTimeout(() => dispatch({ type: 'SET_LOADING_MESSAGES', payload: false }), 300)
            })
          }

          // Batch process visible messages with safety checks
          if (newMessageIds.size > 0 && range.startIndex >= 0 && range.endIndex < messages.length) {
            const visibleMessages = messages.slice(
              Math.max(0, range.startIndex), 
              Math.min(messages.length, range.endIndex + 1)
            )
            const messagesToMark = visibleMessages
              .filter((message: any) => message && message.name && newMessageIds.has(message.name))
              .map((message: any) => message.name)

            if (messagesToMark.length > 0) {
              safeSetTimeout(() => {
                messagesToMark.forEach((messageName) => markMessageAsSeen(messageName))
              }, 2000)
            }
          }
        },
        [
          hasNewMessages,
          loadNewerMessages,
          messages,
          chatState.isInitialLoadComplete,
          chatState.isVirtuosoReady,
          chatState.isScrolling,
          chatState.isLoadingMessages,
          chatState.hasInitialLoadedWithMessageId,
          hasOlderMessages,
          loadOlderMessages,
          newMessageIds,
          markMessageAsSeen,
          safeSetTimeout
        ]
      ),
      300
    )

    const { deleteActions, editActions, forwardActions, attachDocActions, reactionActions } =
      useChatStreamActions(onModalClose)

    const { name: userID } = useUserData()
    const { seenUsers } = useChannelSeenUsers({ channelId: channelID })
    const { channel } = useCurrentChannelData(channelID)

    const onReplyMessageClick = useCallback(
      (messageID: string) => {
        scheduleFrame(() => scrollToMessage(messageID))
      },
      [scrollToMessage, scheduleFrame]
    )

    // Tối ưu target index calculation
    const targetIndex = useMemo(() => {
      if (!messageId || !Array.isArray(messages) || messages.length === 0) return undefined
      const index = messages.findIndex((msg) => msg.name === messageId)
      return index >= 0 ? index : undefined
    }, [messageId, messages])

    // Tối ưu scroll to target
    useEffect(() => {
      if (
        chatState.isInitialLoadComplete &&
        messageId &&
        messages?.length &&
        targetIndex !== undefined &&
        targetIndex >= 0 &&
        !chatState.hasScrolledToTarget &&
        !chatState.isLoadingMessages &&
        virtuosoRef.current &&
        chatState.isVirtuosoReady
      ) {
        scheduleFrame(() => {
          virtuosoRef.current?.scrollToIndex({
            index: targetIndex,
            behavior: 'auto',
            align: 'center'
          })
          dispatch({ type: 'SET_SCROLLED_TO_TARGET', payload: true })
        })
      }
    }, [
      chatState.isInitialLoadComplete,
      chatState.isVirtuosoReady,
      chatState.hasScrolledToTarget,
      chatState.isLoadingMessages,
      messageId,
      messages,
      targetIndex,
      scheduleFrame
    ])

    // Tối ưu imperative handle
    useImperativeHandle(ref, () => {
      if (!virtuosoRef.current) {
        return {} as VirtuosoHandle
      }

      return {
        ...virtuosoRef.current,
        onUpArrow: () => {
          const lastMessage = messages?.[messages.length - 1]
          if (lastMessage?.message_type === 'Text' && lastMessage.owner === userID && !lastMessage.is_bot_message) {
            editActions.setEditMessage(lastMessage)
          }
        }
      }
    }, [messages, userID, editActions.setEditMessage])

    // Tối ưu combined messages với better memoization
    const getCombinedMessages = (
      messages: Message[] | undefined | any,
      pendingMessages: PendingMessage[] | undefined,
      userID: string
    ) => {
      // Ensure we always return an array, never undefined
      if (!messages && !pendingMessages) return []
      
      // Safely handle messages array
      const safeMessages = Array.isArray(messages) ? messages : []
      const safePendingMessages = Array.isArray(pendingMessages) ? pendingMessages : []

      const processedMessages = safeMessages.map((m: any) => ({
        ...m,
        sort_time: m.sort_parent_time || m.resend_at || new Date(m.creation || m.modified || 0).getTime()
      }))

      const pending = safePendingMessages.map((m) => {
        const ext = m.fileMeta?.name ? getFileExtension(m.fileMeta.name) : ''
        const fixedType = m.message_type === 'File' && isImageFile(ext) ? 'Image' : m.message_type

        return {
          name: m.id,
          message_type: fixedType,
          content: m.content,
          owner: userID,
          is_pending: true,
          is_error: m.status === 'error',
          file: m.file,
          fileMeta: m.fileMeta,
          modified: m.createdAt ? new Date(m.createdAt).toISOString() : new Date(0).toISOString(),
          sort_time: m.createdAt || 0
        }
      })

      return [...processedMessages, ...pending].sort((a, b) => a.sort_time - b.sort_time)
    }

    const combinedMessages = useMemo(
      () => getCombinedMessages(messages, pendingMessages, userID),
      [messages, pendingMessages, userID]
    )

    // Tối ưu item renderer với stable references
    const stableCallbacks = useMemo(
      () => ({
        onReplyMessageClick,
        setEditMessage: editActions.setEditMessage,
        replyToMessage,
        setForwardMessage: forwardActions.setForwardMessage,
        setAttachDocument: attachDocActions.setAttachDocument,
        setDeleteMessage: deleteActions.setDeleteMessage,
        setReactionMessage: reactionActions.setReactionMessage,
        sendOnePendingMessage: sendOnePendingMessage as any,
        removePendingMessage: removePendingMessage as any
      }),
      [
        onReplyMessageClick,
        editActions.setEditMessage,
        replyToMessage,
        forwardActions.setForwardMessage,
        attachDocActions.setAttachDocument,
        deleteActions.setDeleteMessage,
        reactionActions.setReactionMessage,
        sendOnePendingMessage,
        removePendingMessage
      ]
    )

    const itemRenderer = useCallback(
      (index: number) => {
        // Safety checks for index and data
        if (!Array.isArray(combinedMessages) || index < 0 || index >= combinedMessages.length) {
          return null
        }
        
        const message = combinedMessages[index]
        if (!message || !message.name) return null

        return (
          <MemoizedMessageRow
            key={message.name}
            index={index}
            message={message}
            highlightedMessage={highlightedMessage}
            showThreadButton={showThreadButton}
            seenUsers={seenUsers}
            channel={channel}
            callbacks={stableCallbacks}
          />
        )
      },
      [combinedMessages, highlightedMessage, showThreadButton, seenUsers, channel, stableCallbacks]
    )

    // Tối ưu event handlers
    const handleAtTopStateChange = useCallback(
      (atTop: boolean) => {
        if (atTop && hasOlderMessages && chatState.isInitialLoadComplete && !chatState.isLoadingMessages) {
          dispatch({
            type: 'BULK_UPDATE',
            payload: { isScrolling: true, isLoadingMessages: true }
          })

          loadOlderMessages().finally(() => {
            safeSetTimeout(() => {
              dispatch({
                type: 'BULK_UPDATE',
                payload: { isLoadingMessages: false, isScrolling: false }
              })
            }, 300)
          })
        }
      },
      [
        hasOlderMessages,
        loadOlderMessages,
        chatState.isInitialLoadComplete,
        chatState.isLoadingMessages,
        safeSetTimeout
      ]
    )

    const handleAtBottomStateChange = useCallback(
      (atBottom: boolean) => {
        dispatch({ type: 'SET_AT_BOTTOM', payload: atBottom })
        if (atBottom) {
          scheduleFrame(() => clearAllNewMessages())
        }
      },
      [clearAllNewMessages, scheduleFrame]
    )

    const handleRangeChangedWithCheck = useCallback(
      (range: any) => {
        if (!Array.isArray(messages) || !chatState.isInitialLoadComplete || !chatState.isVirtuosoReady) return
        
        // Additional safety check for range
        if (!range || typeof range.startIndex !== 'number' || typeof range.endIndex !== 'number') return

        if (initialRenderRef.current) {
          initialRenderRef.current = false
          return
        }

        handleRangeChanged(range)
      },
      [messages, chatState.isInitialLoadComplete, chatState.isVirtuosoReady, handleRangeChanged]
    )

    const handleGoToLatestMessages = useCallback(() => {
      scheduleFrame(() => {
        clearAllNewMessages()
        goToLatestMessages()
      })
    }, [clearAllNewMessages, goToLatestMessages, scheduleFrame])

    // Stable virtuoso components
    const virtuosoComponents = useMemo(
      () => ({
        Header:
          chatState.isInitialLoadComplete && hasOlderMessages
            ? () => <MemoizedHeader hasOlderMessages={hasOlderMessages} isLoading={isLoading} />
            : undefined,
        Footer: hasNewMessages ? () => <MemoizedFooter hasNewMessages={hasNewMessages} /> : undefined
      }),
      [chatState.isInitialLoadComplete, hasOlderMessages, hasNewMessages, isLoading]
    )

    const scrollActionToBottom = useCallback(() => {
      if (!virtuosoRef.current || !combinedMessages?.length) return;
      const tryScroll = () => {
        const totalMessages = Array.isArray(messages) ? messages.length : 0;
        if (combinedMessages.length < totalMessages && hasOlderMessages) {
          loadOlderMessages().finally(() => {
            setTimeout(tryScroll, 100);
          });
        } else {
          scheduleFrame(() => {
            virtuosoRef.current?.scrollToIndex({
              index: combinedMessages.length - 1,
              behavior: 'smooth',
              align: 'end'
            });
            // Sau khi scroll, scrollToIndex lại lần nữa để đảm bảo luôn ở đáy
            setTimeout(() => {
              virtuosoRef.current?.scrollToIndex({
                index: combinedMessages.length - 1,
                behavior: 'smooth',
                align: 'end'
              });
            }, 150);
          });
        }
      };
      tryScroll();
    }, [combinedMessages?.length, messages, hasOlderMessages, loadOlderMessages, scheduleFrame]);

    const computeItemKey = useCallback((index: number, item: any) => {
      // Ensure we have valid index and item
      if (typeof index !== 'number' || index < 0) {
        return `fallback-invalid-${Math.random()}`
      }
      
      if (!item || typeof item !== 'object') {
        return `fallback-no-item-${index}`
      }
      
      return item.name || `fallback-${index}`
    }, [])

    // Tối ưu styles với stable reference
    const virtuosoStyles = useMemo(
      () => ({
        height: '100%',
        willChange: 'transform',
        opacity: chatState.initialRenderComplete ? 1 : 0,
        transform: chatState.initialRenderComplete ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        scrollbarWidth: chatState.initialRenderComplete ? 'thin' : 'none',
        scrollbarColor: chatState.initialRenderComplete
          ? 'rgba(155, 155, 155, 0.5) transparent'
          : 'transparent transparent'
      }),
      [chatState.initialRenderComplete]
    )

    const isMobile = useIsMobile()
    const hasMessages = Array.isArray(combinedMessages) && combinedMessages.length > 0
    const safeInitialIndex = useMemo(() => {
      if (!hasMessages) return 0
      
      if (isSavedMessage && typeof targetIndex === 'number' && targetIndex >= 0) {
        return Math.min(targetIndex, combinedMessages.length - 1)
      }
      
      return Math.max(0, combinedMessages.length - 1)
    }, [hasMessages, isSavedMessage, targetIndex, combinedMessages?.length])

    return (
      <div className={`relative h-full flex flex-col overflow-hidden ${isMobile ? 'pb-4' : 'pb-16'} sm:pb-0`}>
        {!isLoading && !hasOlderMessages && <ChannelHistoryFirstMessage channelID={channelID ?? ''} />}

        {isLoading && <ChatStreamLoader />}

        {error && <ErrorBanner error={error} />}

        {hasMessages && (
          <Virtuoso
            ref={virtuosoRef}
            data={combinedMessages}
            itemContent={itemRenderer}
            followOutput={chatState.isAtBottom || !chatState.initialRenderComplete ? 'auto' : false}
            initialTopMostItemIndex={safeInitialIndex}
            atTopStateChange={handleAtTopStateChange}
            atBottomStateChange={handleAtBottomStateChange}
            rangeChanged={handleRangeChangedWithCheck}
            computeItemKey={computeItemKey}
            style={virtuosoStyles as any}
            {...virtuosoSettings}
            components={virtuosoComponents}
            useWindowScroll={false}
            totalListHeightChanged={() => {
              if (!chatState.isContentMeasured) {
                safeSetTimeout(() => {
                  dispatch({ type: 'SET_CONTENT_MEASURED', payload: true })
                }, 100)
              }
            }}
          />
        )}

        <ScrollToBottomButtons
          hasNewMessages={hasNewMessages}
          newMessageCount={newMessageCount}
          onGoToLatestMessages={handleGoToLatestMessages}
          onScrollToBottom={scrollActionToBottom}
          isAtBottom={chatState.isAtBottom}
          hasMessageId={!!messageId}
        />

        <ChatDialogs
          deleteProps={deleteActions}
          editProps={editActions}
          forwardProps={forwardActions}
          attachDocProps={attachDocActions}
          reactionProps={reactionActions}
        />

        {isInitialMounting && (
          <div className='absolute inset-0 z-50 flex items-center justify-start bg-white dark:bg-gray-2 transition-opacity duration-300'>
            <ChatStreamLoader />
          </div>
        )}
      </div>
    )
  }
)

ChatStream.displayName = 'ChatStream'

export default memo(ChatStream)