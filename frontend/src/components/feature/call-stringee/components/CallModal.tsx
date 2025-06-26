import { useRef } from 'react'
import { 
  FiPhone, FiPhoneCall, FiPhoneOff, 
  FiVideo, FiVideoOff, FiMic, FiMicOff
} from 'react-icons/fi'
import { useTheme } from '@/ThemeProvider'
import { getIconColor, getBackgroundColor } from '../utils/themeUtils'
import { formatCallDuration } from '../utils/callHelpers'
import { CallStatus } from '../types'

interface CallModalProps {
  // Call state
  call: any
  incoming: any
  isGlobalCall: boolean
  callStatus: CallStatus
  isCallConnected: boolean
  isVideoCall: boolean
  hasRemoteVideo: boolean
  hasRemoteAudio: boolean
  isLocalVideoEnabled: boolean
  isRemoteVideoEnabled: boolean
  isEndingCall: boolean
  forceRender: number
  
  // User info
  displayName: string
  userAvatar: string
  avatarInitials: string
  
  // Call duration
  callDuration: number
  
  // Network stats
  networkStats: any
  showDetailedStats: boolean
  setShowDetailedStats: (show: boolean) => void
  
  // Audio state
  isMuted: boolean
  
  // Progress animation
  progressKey: number
  
  // Actions
  onAnswer: () => void
  onReject: () => void
  onHangup: () => void
  onToggleMute: () => void
  onToggleLocalVideo: () => void
  onUpgradeToVideo: () => void
  onInitAudioContext: () => void
}

export default function CallModal(props: CallModalProps) {
  const { appearance } = useTheme()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  if (!props.call && !props.incoming && !props.isGlobalCall) {
    return null
  }

  return (
    <div 
      key={`call-modal-${props.forceRender}-${props.callStatus}`} 
      onClick={() => props.onInitAudioContext()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{
        width: '420px',
        height: '650px',
        backgroundColor: getBackgroundColor('modal', appearance),
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: appearance === 'light' 
          ? '0 20px 60px rgba(0, 0, 0, 0.15)' 
          : '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: appearance === 'light' ? '1px solid #e5e7eb' : 'none'
      }}>
        {/* Video Area - Simplified */}
        <div style={{ 
          flex: 1, 
          position: 'relative',
          background: appearance === 'light' 
            ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            : 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          {/* Remote Video */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            controls={false}
            muted={false}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              display: props.isRemoteVideoEnabled ? 'block' : 'none'
            }} 
          />
          
          {/* Avatar và User Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: getIconColor('white', appearance)
          }}>
            {/* Avatar */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: props.userAvatar ? 'transparent' : getBackgroundColor('button', appearance),
              backgroundImage: props.userAvatar ? `url(${props.userAvatar})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: '600',
              border: `4px solid ${getIconColor('gray', appearance)}`,
              marginBottom: '24px'
            }}>
              {!props.userAvatar && props.avatarInitials}
            </div>
            
            {/* User Name */}
            <h2 style={{ 
              margin: '0 0 12px', 
              fontSize: '28px', 
              fontWeight: '600'
            }}>
              {props.displayName}
            </h2>
            
            {/* Status */}
            <p style={{ 
              margin: '0 0 16px', 
              fontSize: '18px', 
              color: getIconColor('gray', appearance)
            }}>
              {props.callStatus === 'ended' 
                ? 'Cuộc gọi đã kết thúc'
                : props.callStatus === 'rejected'
                  ? 'Cuộc gọi bị từ chối'
                  : props.incoming 
                    ? 'Cuộc gọi đến...' 
                    : props.call 
                      ? (props.callStatus === 'connected' ? 'Đang nói chuyện' : 'Đang gọi...')
                      : 'Đang kết nối...'
              }
            </p>
            
            {/* Call Duration */}
            {props.callDuration > 0 && (
              <div style={{
                fontSize: '20px',
                color: getIconColor('green', appearance),
                fontWeight: '600'
              }}>
                {formatCallDuration(props.callDuration)}
              </div>
            )}
          </div>
          
          {/* Local Video PiP */}
          {props.isVideoCall && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '100px',
              height: '140px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '3px solid #404040',
              backgroundColor: '#2a2a2a'
            }}>
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }} 
              />
            </div>
          )}
        </div>

        {/* Controls - Simplified */}
        <div style={{
          padding: '30px 24px',
          backgroundColor: appearance === 'light' ? '#f8f9fa' : '#0d0d0d',
          borderTop: appearance === 'light' ? '1px solid #e5e7eb' : '1px solid #333',
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          alignItems: 'center'
        }}>
          {props.incoming && !props.call ? (
            // Incoming call controls
            <>
              <button onClick={props.onReject} style={{
                width: '64px', height: '64px', borderRadius: '50%', border: 'none',
                backgroundColor: getIconColor('red', appearance), color: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FiPhoneOff size={24} />
              </button>
              <button onClick={props.onAnswer} style={{
                width: '64px', height: '64px', borderRadius: '50%', border: 'none',
                backgroundColor: getIconColor('green', appearance), color: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FiPhone size={24} />
              </button>
            </>
          ) : (
            // In-call controls
            <>
              {props.callStatus === 'connected' && (
                <button onClick={props.onToggleMute} style={{
                  width: '54px', height: '54px', borderRadius: '50%', border: 'none',
                  backgroundColor: props.isMuted ? getIconColor('red', appearance) : getBackgroundColor('button', appearance),
                  color: props.isMuted ? 'white' : getIconColor('white', appearance),
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {props.isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                </button>
              )}
              
              <button onClick={props.onHangup} style={{
                width: '64px', height: '64px', borderRadius: '50%', border: 'none',
                backgroundColor: getIconColor('red', appearance), color: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FiPhoneOff size={24} />
              </button>
            </>
          )}
        </div>
      </div>
      
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
    </div>
  )
} 