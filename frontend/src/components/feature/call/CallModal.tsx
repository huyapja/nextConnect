import { Dialog, Flex, Button, Text, Avatar, Box } from '@radix-ui/themes'
import { BiPhone, BiPhoneOff, BiMicrophone, BiMicrophoneOff, BiVideo, BiVideoOff } from 'react-icons/bi'
import { useStringeeCall } from '@/hooks/useStringeeCall'
import { useGetUser } from '@/hooks/useGetUser'
import { useState, useEffect } from 'react'

interface CallModalProps {
  isOpen: boolean
  onClose: () => void
  peerUserId?: string
  isIncoming?: boolean
  callType?: 'audio' | 'video'
}

export const CallModal = ({ 
  isOpen, 
  onClose, 
  peerUserId, 
  isIncoming = false,
  callType = 'video'
}: CallModalProps) => {
  const { 
    currentCall, 
    answerCall, 
    endCall, 
    rejectCall, 
    toggleMute, 
    toggleVideo, 
    isMuted, 
    isVideoEnabled,
    isInCall 
  } = useStringeeCall()
  
  const peerUser = useGetUser(peerUserId || '')
  const [callDuration, setCallDuration] = useState(0)
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null)

  // Timer cho thời gian cuộc gọi
  useEffect(() => {
    if (isInCall && !callTimer) {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      setCallTimer(timer)
    } else if (!isInCall && callTimer) {
      clearInterval(callTimer)
      setCallTimer(null)
      setCallDuration(0)
    }

    return () => {
      if (callTimer) {
        clearInterval(callTimer)
      }
    }
  }, [isInCall, callTimer])

  // Format thời gian cuộc gọi
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = () => {
    if (currentCall) {
      answerCall(currentCall)
    }
  }

  const handleReject = () => {
    if (currentCall) {
      rejectCall(currentCall)
    }
    onClose()
  }

  const handleEndCall = () => {
    endCall()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content className="max-w-md w-full">
        <div className="relative h-96 bg-gray-900 rounded-lg overflow-hidden">
          {/* Video containers */}
          {callType === 'video' && (
            <>
              {/* Remote video (full screen) */}
              <video 
                id="remoteVideo" 
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
              
              {/* Local video (picture-in-picture) */}
              <div className="absolute top-4 right-4 w-24 h-32 bg-gray-800 rounded-lg overflow-hidden">
                <video 
                  id="localVideo" 
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </>
          )}

          {/* Call info overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-between p-6">
            {/* Top section - User info */}
            <div className="flex flex-col items-center text-white">
              <Avatar
                src={peerUser?.user_image}
                fallback={peerUser?.full_name?.charAt(0) || '?'}
                size="6"
                className="mb-4"
              />
              <Text size="5" weight="bold" className="text-center">
                {peerUser?.full_name || peerUserId}
              </Text>
              <Text size="2" className="text-gray-300 mt-1">
                {isInCall 
                  ? formatDuration(callDuration)
                  : isIncoming 
                    ? 'Incoming call...' 
                    : 'Calling...'
                }
              </Text>
            </div>

            {/* Bottom section - Call controls */}
            <div className="flex justify-center items-center space-x-6">
              {isIncoming && !isInCall ? (
                // Incoming call controls
                <>
                  <Button
                    onClick={handleReject}
                    size="4"
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16"
                  >
                    <BiPhoneOff size="24" />
                  </Button>
                  <Button
                    onClick={handleAnswer}
                    size="4"
                    className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16"
                  >
                    <BiPhone size="24" />
                  </Button>
                </>
              ) : (
                // In-call controls
                <>
                  {/* Mute button */}
                  <Button
                    onClick={toggleMute}
                    size="3"
                    variant="soft"
                    className={`rounded-full w-12 h-12 ${
                      isMuted ? 'bg-red-500 text-white' : 'bg-gray-600 text-white'
                    }`}
                  >
                    {isMuted ? <BiMicrophoneOff size="20" /> : <BiMicrophone size="20" />}
                  </Button>

                  {/* Video toggle (only for video calls) */}
                  {callType === 'video' && (
                    <Button
                      onClick={toggleVideo}
                      size="3"
                      variant="soft"
                      className={`rounded-full w-12 h-12 ${
                        !isVideoEnabled ? 'bg-red-500 text-white' : 'bg-gray-600 text-white'
                      }`}
                    >
                      {isVideoEnabled ? <BiVideo size="20" /> : <BiVideoOff size="20" />}
                    </Button>
                  )}

                  {/* End call button */}
                  <Button
                    onClick={handleEndCall}
                    size="4"
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16"
                  >
                    <BiPhoneOff size="24" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
} 