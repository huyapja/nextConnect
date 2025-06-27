import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { GroupCallInterface } from './GroupCallInterface'

interface GroupCallState {
  isOpen: boolean
  roomId?: string
  messageId?: string
  channelId?: string
}

interface GroupCallContextType {
  openGroupCall: (roomId: string, messageId: string, channelId: string) => void
  closeGroupCall: () => void
  groupCallState: GroupCallState
}

const GroupCallContext = createContext<GroupCallContextType | undefined>(undefined)

interface GroupCallProviderProps {
  children: ReactNode
}

export const GroupCallProvider = ({ children }: GroupCallProviderProps) => {
  const [groupCallState, setGroupCallState] = useState<GroupCallState>({
    isOpen: false
  })

  const openGroupCall = useCallback((roomId: string, messageId: string, channelId: string) => {
    console.log('Opening group call:', { roomId, messageId, channelId })
    setGroupCallState({
      isOpen: true,
      roomId,
      messageId,
      channelId
    })
  }, [])

  const closeGroupCall = useCallback(() => {
    console.log('Closing group call')
    setGroupCallState({
      isOpen: false,
      roomId: undefined,
      messageId: undefined,
      channelId: undefined
    })
  }, [])

  useEffect(() => {
    // Lắng nghe event để mở group call
    const handleOpenGroupCall = (event: CustomEvent) => {
      console.log('Received openGroupCall event:', event.detail)
      const { roomId, messageId, channelId } = event.detail
      openGroupCall(roomId, messageId, channelId)
    }

    // Lắng nghe event để đóng group call
    const handleCloseGroupCall = () => {
      closeGroupCall()
    }

    // Thêm event listeners
    window.addEventListener('openGroupCall', handleOpenGroupCall as EventListener)
    window.addEventListener('closeGroupCall', handleCloseGroupCall)

    console.log('Group call event listeners registered')

    // Cleanup
    return () => {
      window.removeEventListener('openGroupCall', handleOpenGroupCall as EventListener)
      window.removeEventListener('closeGroupCall', handleCloseGroupCall)
      console.log('Group call event listeners cleaned up')
    }
  }, [openGroupCall, closeGroupCall])

  const contextValue: GroupCallContextType = {
    openGroupCall,
    closeGroupCall,
    groupCallState
  }

  console.log('GroupCallProvider render:', groupCallState)
  
  return (
    <GroupCallContext.Provider value={contextValue}>
      {children}
      
      {/* Group Call Interface */}
      {groupCallState.isOpen && groupCallState.roomId && groupCallState.messageId && groupCallState.channelId && (
        <GroupCallInterface
          roomId={groupCallState.roomId}
          messageId={groupCallState.messageId}
          channelId={groupCallState.channelId}
          isOpen={groupCallState.isOpen}
          onClose={closeGroupCall}
        />
      )}
    </GroupCallContext.Provider>
  )
}

// Hook để sử dụng GroupCallContext
export const useGroupCall = () => {
  const context = useContext(GroupCallContext)
  if (context === undefined) {
    throw new Error('useGroupCall must be used within a GroupCallProvider')
  }
  return context
} 