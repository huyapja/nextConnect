export interface CallStringeeProps {
  toUserId: string
  channelId?: string
  globalClient?: any // Global Stringee client
  globalIncomingCall?: any // Global incoming call
  isGlobalCall?: boolean // Flag để biết đây là global call
  onClose?: () => void // Callback để đóng global modal
}

export type CallStatus = 'connecting' | 'connected' | 'ended' | 'rejected' | null

export interface VideoUpgradeRequest {
  fromUser: string
  fromUserName?: string
  sessionId: string
}

export type CallType = 'audio' | 'video'
export type CallHistoryStatus = 'completed' | 'missed' | 'rejected' | 'ended'

export interface CallState {
  client: any
  call: any
  incoming: any
  sdkLoaded: boolean
  isCallConnected: boolean
  hasRemoteVideo: boolean
  hasRemoteAudio: boolean
  isVideoCall: boolean
  callStatus: CallStatus
  currentSessionId: string | null
  forceRender: number
  videoUpgradeRequest: VideoUpgradeRequest | null
  callerUserName: string
  isLocalVideoEnabled: boolean
  isRemoteVideoEnabled: boolean
  callHistorySaved: boolean
  isEndingCall: boolean
  showCallMenu: boolean
  progressKey: number
}

export interface CallRefs {
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  remoteAudioRef: React.RefObject<HTMLAudioElement>
  callTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}

export interface CallActions {
  makeCall: (isVideoCall: boolean) => Promise<void>
  answerCall: () => Promise<void>
  hangupCall: () => Promise<void>
  rejectCall: () => Promise<void>
  upgradeToVideo: () => Promise<void>
  acceptVideoUpgrade: () => Promise<void>
  rejectVideoUpgrade: () => Promise<void>
  toggleLocalVideo: () => Promise<void>
  saveCallHistoryToChat: (callType: CallType, callStatus: CallHistoryStatus, duration?: number) => Promise<void>
  getDMChannelId: () => Promise<string | null>
  checkDeviceAvailability: (isVideoCall: boolean) => Promise<boolean>
  setupCallEvents: (callObj: any) => void
  performCleanup: () => void
} 