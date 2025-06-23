import { Dialog, Flex, Button, Text, Avatar, Box } from '@radix-ui/themes'
import { BiPhone, BiPhoneOff, BiVideo, BiVideoOff } from 'react-icons/bi'
import { useSimpleStringeeCall } from '@/hooks/useSimpleStringeeCall'
import { useGetUser } from '@/hooks/useGetUser'
import { useState } from 'react'

interface SimpleCallComponentProps {
  toUserId: string
  className?: string
}

export const SimpleCallComponent = ({ toUserId, className }: SimpleCallComponentProps) => {
  const {
    call,
    incoming,
    isConnected,
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    upgradeToVideo,
    localVideoRef,
    remoteVideoRef
  } = useSimpleStringeeCall()

  const [showCallModal, setShowCallModal] = useState(false)
  const peerUser = useGetUser(toUserId)

  const handleMakeCall = (isVideoCall: boolean) => {
    makeCall(toUserId, isVideoCall)
    setShowCallModal(true)
  }

  const handleAnswerCall = () => {
    answerCall()
  }

  const handleRejectCall = () => {
    rejectCall()
    setShowCallModal(false)
  }

  const handleHangupCall = () => {
    hangupCall()
    setShowCallModal(false)
  }

  const handleCloseModal = () => {
    if (call) {
      hangupCall()
    } else if (incoming) {
      rejectCall()
    }
    setShowCallModal(false)
  }

  // Hiển thị modal khi có cuộc gọi hoặc incoming call
  const shouldShowModal = showCallModal || call || incoming

  return (
    <>
      {/* Call Buttons */}
      <Flex gap="2" className={className}>
        <Button
          onClick={() => handleMakeCall(false)}
          disabled={!isConnected}
          size="2"
          variant="ghost"
          color="gray"
          className="hover:bg-gray-3"
        >
          <BiPhone size="16" />
        </Button>
        <Button
          onClick={() => handleMakeCall(true)}
          disabled={!isConnected}
          size="2"
          variant="ghost"
          color="gray"
          className="hover:bg-gray-3"
        >
          <BiVideo size="16" />
        </Button>
      </Flex>

      {/* Call Modal */}
      <Dialog.Root open={shouldShowModal} onOpenChange={handleCloseModal}>
        <Dialog.Content className="max-w-2xl w-full">
          <div className="relative h-96 bg-gray-900 rounded-lg overflow-hidden">
            {/* Video containers */}
            <div className="relative w-full h-full">
              {/* Remote video (full screen) */}
              <video 
                ref={remoteVideoRef}
                className="w-full h-full object-cover bg-gray-800"
                autoPlay
                playsInline
              />
              
              {/* Local video (picture-in-picture) */}
              <div className="absolute top-4 right-4 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 border-white">
                <video 
                  ref={localVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </div>

            {/* Call info overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-between p-6">
              {/* Top section - User info */}
              <div className="flex flex-col items-center text-white">
                <Avatar
                  src={peerUser?.user_image}
                  fallback={peerUser?.full_name?.charAt(0) || toUserId.charAt(0)}
                  size="6"
                  className="mb-4"
                />
                <Text size="5" weight="bold" className="text-center">
                  {peerUser?.full_name || toUserId}
                </Text>
                <Text size="2" className="text-gray-300 mt-1">
                  {incoming 
                    ? 'Cuộc gọi đến...' 
                    : call 
                      ? 'Đang gọi...'
                      : 'Kết nối...'
                  }
                </Text>
                
                {/* Connection status */}
                <Text size="1" className={`mt-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? '● Đã kết nối' : '● Đang kết nối...'}
                </Text>
              </div>

              {/* Bottom section - Call controls */}
              <div className="flex justify-center items-center space-x-6">
                {incoming && !call ? (
                  // Incoming call controls
                  <>
                    <Button
                      onClick={handleRejectCall}
                      size="4"
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16"
                    >
                      <BiPhoneOff size="24" />
                    </Button>
                    <Button
                      onClick={handleAnswerCall}
                      size="4"
                      className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16"
                    >
                      <BiPhone size="24" />
                    </Button>
                  </>
                ) : (
                  // In-call or outgoing call controls
                  <>
                    {call && (
                      <Button
                        onClick={upgradeToVideo}
                        size="3"
                        variant="soft"
                        className="rounded-full w-12 h-12 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <BiVideo size="20" />
                      </Button>
                    )}

                    {/* End call button */}
                    <Button
                      onClick={handleHangupCall}
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

          {/* Debug info (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <Box className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <Text size="1">
                Connected: {isConnected ? 'Yes' : 'No'} | 
                Call: {call ? 'Active' : 'None'} | 
                Incoming: {incoming ? 'Yes' : 'None'}
              </Text>
            </Box>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </>
  )
} 