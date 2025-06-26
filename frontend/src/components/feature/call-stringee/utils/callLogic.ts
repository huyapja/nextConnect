import { toast } from 'sonner'
import { CallType, CallHistoryStatus } from '../types'

export async function getDMChannelId(
  data: any,
  toUserId: string,
  incoming: any,
  findDMChannel: any
): Promise<string | null> {
  const currentUserId = data?.message?.user_id
  
  // Xác định caller và callee dựa trên loại cuộc gọi
  let callerId: string | undefined
  let calleeId: string | undefined
  
  if (incoming) {
    // Cuộc gọi đến: fromNumber là caller, toNumber (current user) là callee
    callerId = incoming.fromNumber
    calleeId = incoming.toNumber || currentUserId
  } else {
    // Cuộc gọi đi: current user là caller, toUserId là callee
    callerId = currentUserId
    calleeId = toUserId
  }
  
  if (!callerId || !calleeId) {
    console.error('❌ Missing caller or callee ID for channel lookup')
    return null
  }
  
  try {
    console.log('📝 Finding DM channel between:', callerId, '<->', calleeId)
    console.log('📝 Call direction:', incoming ? 'incoming' : 'outgoing')
    
    // Gọi API để tìm channel ID đúng
    const result = await findDMChannel({
      user1: callerId,
      user2: calleeId
    })
    
    const channelId = result?.message || result
    console.log('📝 Found DM channel ID:', channelId)
    return channelId
  } catch (error) {
    console.error('❌ Failed to find DM channel:', error)
    return null
  }
}

export async function saveCallHistoryToChat(
  callType: CallType,
  callStatus: CallHistoryStatus,
  duration: number | undefined,
  callHistorySaved: boolean,
  setCallHistorySaved: (saved: boolean) => void,
  getDMChannelId: () => Promise<string | null>,
  saveCallHistory: any
): Promise<void> {
  // Double check để tránh duplicate
  if (callHistorySaved) {
    console.log('⚠️ Call history already saved - skipping duplicate save attempt')
    return
  }
  
  // Set flag ngay lập tức để prevent race conditions
  setCallHistorySaved(true)
  
  try {
    const dmChannelId = await getDMChannelId()
    if (!dmChannelId) {
      console.error('❌ Cannot save call history - no valid channel ID')
      // Reset flag nếu failed
      setCallHistorySaved(false)
      return
    }
    
    console.log('💾 Saving call history to channel:', dmChannelId, 'Call type:', callType, 'Status:', callStatus, 'Duration:', duration)
    
    await saveCallHistory({
      channel_id: dmChannelId,
      call_type: callType,
      call_status: callStatus,
      duration: duration
    })
    
    console.log('✅ Call history saved successfully to:', dmChannelId)
  } catch (error) {
    console.error('❌ Failed to save call history:', error)
    // Reset flag nếu failed để có thể retry
    setCallHistorySaved(false)
  }
}

export async function checkDeviceAvailability(isVideoCall: boolean): Promise<boolean> {
  try {
    console.log('🎥 Checking device availability for', isVideoCall ? 'video' : 'audio', 'call...')
    
    const constraints = isVideoCall 
      ? { audio: true, video: true }
      : { audio: true }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    // Test successful - clean up immediately
    stream.getTracks().forEach(track => {
      console.log('🔴 Stopping test track:', track.kind, track.readyState)
      track.stop()
    })
    
    console.log('✅ Device availability check passed')
    return true
  } catch (error) {
    console.error('❌ Device availability check failed:', error)
    
    // Show user-friendly error message
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        toast.error(isVideoCall 
          ? 'Bạn cần cho phép truy cập camera và microphone để thực hiện cuộc gọi video'
          : 'Bạn cần cho phép truy cập microphone để thực hiện cuộc gọi')
      } else if (error.name === 'NotFoundError') {
        toast.error(isVideoCall 
          ? 'Không tìm thấy camera hoặc microphone'
          : 'Không tìm thấy microphone')
      } else {
        toast.error('Không thể truy cập thiết bị. Vui lòng kiểm tra lại camera/microphone.')
      }
    }
    
    return false
  }
}

export function performCleanup(
  localStreamRef: React.MutableRefObject<MediaStream | null>,
  localVideoRef: React.RefObject<HTMLVideoElement>,
  remoteVideoRef: React.RefObject<HTMLVideoElement>,
  remoteAudioRef: React.RefObject<HTMLAudioElement>,
  callTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  performAudioCleanup: () => void,
  stopNetworkMonitoring: () => void
): void {
  console.log('🧹 Performing comprehensive cleanup...')
  
  // Clear call timeout
  if (callTimeoutRef.current) {
    clearTimeout(callTimeoutRef.current)
    callTimeoutRef.current = null
    console.log('⏰ Call timeout cleared')
  }
  
  // Stop local media stream
  if (localStreamRef.current) {
    console.log('🔴 Stopping local media stream tracks:', localStreamRef.current.getTracks().length)
    localStreamRef.current.getTracks().forEach((track, index) => {
      console.log(`🔴 Stopping track ${index}:`, track.kind, track.readyState)
      track.stop()
    })
    localStreamRef.current = null
  }
  
  // Clear video/audio elements
  if (localVideoRef.current) {
    localVideoRef.current.srcObject = null
    console.log('📹 Local video cleared')
  }
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = null
    console.log('📹 Remote video cleared')
  }
  if (remoteAudioRef.current) {
    remoteAudioRef.current.srcObject = null
    console.log('🔊 Remote audio cleared')
  }
  
  // Stop network monitoring
  stopNetworkMonitoring()
  
  // Audio cleanup
  performAudioCleanup()
  
  console.log('✅ Cleanup completed')
} 