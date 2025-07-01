import { useFrappeEventListener } from 'frappe-react-sdk'
import { useCallback, useRef } from 'react'

interface SocketEventHandlers {
  onMessageCreated?: (event: any) => void
  onMessageEdited?: (event: any) => void
  onMessageDeleted?: (event: any) => void
  onMessageReacted?: (event: any) => void
  onMessageSaved?: (event: any) => void
  onMessageRetracted?: (event: any) => void
}

/**
 * Hook để quản lý socket events với khả năng filter theo channel/thread
 * Giúp tránh conflicts khi mở đồng thời chat và thread windows
 */
export const useSocketEventManager = (
  channelID: string,
  handlers: SocketEventHandlers,
  options?: {
    enableLogging?: boolean
    debugMode?: boolean
  }
) => {
  const lastProcessedEvent = useRef<Map<string, number>>(new Map())
  const { enableLogging = false, debugMode = false } = options || {}

  // Utility function để log events
  const logEvent = useCallback((eventName: string, event: any, action: 'received' | 'processed' | 'ignored') => {
    if (enableLogging || debugMode) {
      const timestamp = new Date().toLocaleTimeString()
      const logPrefix = debugMode ? '🔍 [DEBUG]' : '📡 [Socket]'
      console.log(`${logPrefix} ${timestamp} ${eventName} ${action}:`, {
        targetChannel: channelID,
        eventChannel: event.channel_id,
        eventData: event
      })
    }
  }, [channelID, enableLogging, debugMode])

  // Helper để kiểm tra duplicate events
  const isDuplicateEvent = useCallback((eventName: string, event: any): boolean => {
    const eventKey = `${eventName}_${event.channel_id}_${event.message_id || event.message_details?.name}`
    const eventTime = Date.now()
    const lastTime = lastProcessedEvent.current.get(eventKey)
    
    // Nếu event giống nhau được xử lý trong vòng 1 giây thì coi là duplicate
    if (lastTime && (eventTime - lastTime) < 1000) {
      return true
    }
    
    lastProcessedEvent.current.set(eventKey, eventTime)
    return false
  }, [])

  // Helper để validate channel
  const isValidChannelEvent = useCallback((event: any): boolean => {
    return event.channel_id === channelID
  }, [channelID])

  // Message Created Handler
  useFrappeEventListener('message_created', (event) => {
    logEvent('message_created', event, 'received')
    
    if (!isValidChannelEvent(event)) {
      logEvent('message_created', event, 'ignored')
      return
    }
    
    if (isDuplicateEvent('message_created', event)) {
      logEvent('message_created', event, 'ignored')
      return
    }
    
    logEvent('message_created', event, 'processed')
    handlers.onMessageCreated?.(event)
  })

  // Message Edited Handler
  useFrappeEventListener('message_edited', (event) => {
    logEvent('message_edited', event, 'received')
    
    if (!isValidChannelEvent(event)) {
      logEvent('message_edited', event, 'ignored')
      return
    }
    
    if (isDuplicateEvent('message_edited', event)) {
      logEvent('message_edited', event, 'ignored')
      return
    }
    
    logEvent('message_edited', event, 'processed')
    handlers.onMessageEdited?.(event)
  })

  // Message Deleted Handler
  useFrappeEventListener('message_deleted', (event) => {
    logEvent('message_deleted', event, 'received')
    
    if (!isValidChannelEvent(event)) {
      logEvent('message_deleted', event, 'ignored')
      return
    }
    
    if (isDuplicateEvent('message_deleted', event)) {
      logEvent('message_deleted', event, 'ignored')
      return
    }
    
    logEvent('message_deleted', event, 'processed')
    handlers.onMessageDeleted?.(event)
  })

  // Message Reacted Handler
  useFrappeEventListener('message_reacted', (event) => {
    logEvent('message_reacted', event, 'received')
    
    if (!isValidChannelEvent(event)) {
      logEvent('message_reacted', event, 'ignored')
      return
    }
    
    if (isDuplicateEvent('message_reacted', event)) {
      logEvent('message_reacted', event, 'ignored')
      return
    }
    
    logEvent('message_reacted', event, 'processed')
    handlers.onMessageReacted?.(event)
  })

  // Message Saved Handler
  useFrappeEventListener('message_saved', (event) => {
    logEvent('message_saved', event, 'received')
    
    if (!isValidChannelEvent(event)) {
      logEvent('message_saved', event, 'ignored')
      return
    }
    
    if (isDuplicateEvent('message_saved', event)) {
      logEvent('message_saved', event, 'ignored')
      return
    }
    
    logEvent('message_saved', event, 'processed')
    handlers.onMessageSaved?.(event)
  })

  // Message Retracted Handler
  useFrappeEventListener('raven_message_retracted', (event) => {
    logEvent('raven_message_retracted', event, 'received')
    
    if (!isValidChannelEvent(event)) {
      logEvent('raven_message_retracted', event, 'ignored')
      return
    }
    
    if (isDuplicateEvent('raven_message_retracted', event)) {
      logEvent('raven_message_retracted', event, 'ignored')
      return
    }
    
    logEvent('raven_message_retracted', event, 'processed')
    handlers.onMessageRetracted?.(event)
  })

  return {
    // Return methods để enable/disable logging từ bên ngoài
    enableDebugMode: () => logEvent('debug', { channelID }, 'processed'),
    getStats: () => ({
      channelID,
      eventsProcessed: lastProcessedEvent.current.size,
      lastEventTimes: Object.fromEntries(lastProcessedEvent.current)
    })
  }
} 