import React, { useState, useEffect, useRef } from 'react'
import { FiMic, FiMicOff, FiPhoneOff } from 'react-icons/fi'

import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { useTheme } from '@/ThemeProvider'

// Import utilities from CallStringee
import { getIconColor, getBackgroundColor } from '../call-stringee/utils/themeUtils'

interface GroupCallInterfaceProps {
  roomId: string
  messageId: string
  channelId: string
  isOpen: boolean
  onClose: () => void
}

interface Participant {
  user_id: string
  full_name: string
  user_image?: string
  isMuted?: boolean
  isSpeaking?: boolean
}

export const GroupCallInterface = ({ 
  roomId, 
  messageId, 
  channelId, 
  isOpen, 
  onClose 
}: GroupCallInterfaceProps) => {
  console.log('GroupCallInterface rendered:', { roomId, messageId, channelId, isOpen })
  
  const { appearance } = useTheme()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isEndingCall, setIsEndingCall] = useState(false)
  
  const callStartTime = useRef<Date>(new Date())
  
  const { call: leaveCall } = useFrappePostCall('raven.api.group_call.leave_group_call')
  const { call: getParticipants } = useFrappePostCall('raven.api.group_call.get_group_call_participants')

  useEffect(() => {
    const interval = setInterval(() => {
      const duration = Math.floor((new Date().getTime() - callStartTime.current.getTime()) / 1000)
      setCallDuration(duration)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadParticipants()
      const interval = setInterval(loadParticipants, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, messageId])

  const loadParticipants = async () => {
    try {
      const result = await getParticipants({ message_id: messageId })
      console.log('Load participants result:', result)
      
      if (result?.message?.success) {
        setParticipants(result.message.participants || [])
      }
    } catch (error) {
      console.error('Error loading participants:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleLeaveCall = async () => {
    if (isEndingCall) return
    
    setIsEndingCall(true)
    try {
      const result = await leaveCall({ message_id: messageId })
      console.log('Leave call result:', result)
      
      onClose()
      toast.success('Đã rời khỏi cuộc gọi nhóm')
    } catch (error: any) {
      console.error('Error leaving call:', error)
      toast.error('Có lỗi xảy ra khi rời cuộc gọi')
    } finally {
      setIsEndingCall(false)
    }
  }

  const toggleMute = () => setIsMuted(!isMuted)

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* CSS Animation for pulse effects */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(46, 213, 115, 0.4), 0 0 0 0px rgba(46, 213, 115, 0.3);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 8px 32px rgba(46, 213, 115, 0.4), 0 0 0 12px rgba(46, 213, 115, 0.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(46, 213, 115, 0.4), 0 0 0 0px rgba(46, 213, 115, 0.3);
            opacity: 1;
          }
        }
      `}</style>

      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: '420px', height: '650px',
          backgroundColor: getBackgroundColor('modal', appearance),
          borderRadius: '20px', overflow: 'hidden', position: 'relative',
          display: 'flex', flexDirection: 'column',
          boxShadow: appearance === 'light' ? '0 20px 60px rgba(0, 0, 0, 0.15)' : '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: appearance === 'light' ? '1px solid #e5e7eb' : 'none'
        }}>
          {/* Main Content Area */}
          <div style={{ 
            flex: 1, position: 'relative',
            background: appearance === 'light' ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' : 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)'
          }}>
            {/* User Info Overlay */}
            <div style={{
              position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: appearance === 'light'
                ? 'linear-gradient(135deg, rgba(248, 249, 250, 0.95) 0%, rgba(233, 236, 239, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)',
              color: getIconColor('white', appearance)
            }}>
              {/* Group Call Icon */}
              <div style={{ width: '120px', height: '120px', margin: '0 auto 24px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  backgroundColor: getIconColor('green', appearance),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `4px solid ${getIconColor('green', appearance)}`,
                  boxShadow: `0 8px 32px ${getIconColor('green', appearance)}66, 0 0 0 8px ${getIconColor('green', appearance)}1a`,
                  animation: 'pulse 2s infinite'
                }}>
                  <div style={{
                    fontSize: '48px', fontWeight: '600', color: 'white'
                  }}>
                    👥
                  </div>
                </div>
              </div>
              
              {/* Title */}
              <h2 style={{ 
                margin: '0 0 12px', fontSize: '28px', fontWeight: '600',
                color: getIconColor('white', appearance),
                textShadow: appearance === 'light' ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>
                Cuộc gọi thoại nhóm
              </h2>
              
              {/* Status */}
              <p style={{ margin: '0 0 16px', fontSize: '18px', color: getIconColor('gray', appearance), fontWeight: '400' }}>
                {participants.length} người tham gia
              </p>
              
              {/* Call Duration */}
              {callDuration > 0 && (
                <div style={{
                  marginTop: '12px', fontSize: '16px',
                  color: getIconColor('green', appearance),
                  fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: getIconColor('green', appearance), animation: 'pulse 1s infinite'
                  }}></div>
                  <span>{formatDuration(callDuration)}</span>
                </div>
              )}

              {/* Participants List */}
              {participants.length > 0 && (
                <div style={{ 
                  marginTop: '24px', 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  width: '100%',
                  padding: '0 24px'
                }}>
                  {participants.map((participant) => (
                    <div key={participant.user_id} style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      padding: '8px 16px',
                      marginBottom: '8px',
                      backgroundColor: appearance === 'light' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '12px',
                      border: participant.isSpeaking ? `2px solid ${getIconColor('green', appearance)}` : 'none'
                    }}>
                      {/* Participant Avatar */}
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: participant.user_image ? 'transparent' : getBackgroundColor('button', appearance),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundImage: participant.user_image ? `url(${participant.user_image})` : 'none',
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        border: participant.isSpeaking ? `2px solid ${getIconColor('green', appearance)}` : `2px solid ${getIconColor('gray', appearance)}`
                      }}>
                        {!participant.user_image && (
                                                     <div style={{
                             fontSize: '16px', fontWeight: '600', color: getIconColor('white', appearance)
                           }}>
                             {participant.full_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                           </div>
                        )}
                      </div>
                      
                      {/* Participant Name */}
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '500',
                          color: getIconColor('white', appearance)
                        }}>
                          {participant.full_name}
                        </div>
                        {participant.isSpeaking && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: getIconColor('green', appearance)
                          }}>
                            Đang nói...
                          </div>
                        )}
                      </div>
                      
                      {/* Mute indicator */}
                      {participant.isMuted && (
                        <div style={{
                          backgroundColor: getIconColor('red', appearance),
                          borderRadius: '50%',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <FiMicOff size={12} style={{ color: 'white' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{
            padding: '30px 24px',
            backgroundColor: appearance === 'light' ? '#f8f9fa' : '#0d0d0d',
            borderTop: appearance === 'light' ? '1px solid #e5e7eb' : '1px solid #333',
            display: 'flex', justifyContent: 'center', gap: '30px', alignItems: 'center'
          }}>
            {/* Mute Button */}
            <button onClick={toggleMute} style={{
              width: '54px', height: '54px', borderRadius: '50%', border: 'none',
              backgroundColor: isMuted ? getIconColor('red', appearance) : getBackgroundColor('button', appearance),
              color: isMuted ? 'white' : getIconColor('white', appearance), cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              boxShadow: isMuted ? '0 3px 12px rgba(255, 107, 107, 0.4)' : `0 3px 12px ${getIconColor('gray', appearance)}33`,
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.opacity = '0.8' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1' }}
            title={isMuted ? "Bật tiếng" : "Tắt tiếng"}>
              {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
            </button>

            {/* Hangup Button */}
            <button onClick={handleLeaveCall} disabled={isEndingCall} style={{
              width: '64px', height: '64px', borderRadius: '50%', border: 'none',
              backgroundColor: isEndingCall ? getIconColor('gray', appearance) : getIconColor('red', appearance),
              color: 'white',
              cursor: isEndingCall ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
              boxShadow: '0 4px 16px rgba(255, 71, 87, 0.3)',
              transition: 'all 0.2s ease',
              opacity: isEndingCall ? '0.6' : '1'
            }}
            onMouseOver={(e) => {
              if (!isEndingCall) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseOut={(e) => {
              if (!isEndingCall) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title={isEndingCall ? 'Đang kết thúc cuộc gọi...' : 'Rời cuộc gọi'}>
              <FiPhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

 