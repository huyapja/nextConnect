import { IconButton, Tooltip } from '@radix-ui/themes'
import { BiPhone, BiVideo } from 'react-icons/bi'
import { useStringeeCall } from '@/hooks/useStringeeCall'

interface CallButtonProps {
  peerUserId: string
  isVideoCall?: boolean
  size?: '1' | '2' | '3' | '4'
  disabled?: boolean
}

export const CallButton = ({ 
  peerUserId, 
  isVideoCall = false, 
  size = '2',
  disabled = false 
}: CallButtonProps) => {
  const { makeCall, isConnected, isInCall } = useStringeeCall()

  const handleCall = async () => {
    if (!isConnected) {
      return
    }
    
    await makeCall(peerUserId, isVideoCall)
  }

  const isDisabled = disabled || !isConnected || isInCall

  return (
    <Tooltip content={isVideoCall ? 'Video Call' : 'Audio Call'}>
      <IconButton
        onClick={handleCall}
        disabled={isDisabled}
        size={size}
        variant="ghost"
        color="gray"
        className="hover:bg-gray-3"
      >
        {isVideoCall ? (
          <BiVideo size="16" />
        ) : (
          <BiPhone size="16" />
        )}
      </IconButton>
    </Tooltip>
  )
} 