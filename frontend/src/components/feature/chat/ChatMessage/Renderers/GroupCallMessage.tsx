import { Box, Button, Flex, Text, Badge, Avatar } from '@radix-ui/themes'
import { BiPhone, BiPhoneOff } from 'react-icons/bi'
import { BsFillPersonFill } from 'react-icons/bs'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Message } from '../../../../../../../types/Messaging/Message'
import { UserFields } from '@/utils/users/UserListProvider'
import { UserAvatar } from '@/components/common/UserAvatar'

interface GroupCallMessageProps {
  message: Message
  user?: UserFields
  currentUser?: string | null
}

interface Participant {
  user_id: string
  full_name: string
  user_image?: string
}

export const GroupCallMessage = ({ message, user, currentUser }: GroupCallMessageProps) => {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [callStatus, setCallStatus] = useState<string>(message.group_call_status || 'active')
  const [isJoining, setIsJoining] = useState(false)
  
  const { call: joinCall } = useFrappePostCall('raven.api.group_call.join_group_call')
  const { call: leaveCall } = useFrappePostCall('raven.api.group_call.leave_group_call')
  const { call: getParticipants } = useFrappePostCall('raven.api.group_call.get_group_call_participants')

  // Kiểm tra xem user hiện tại có đang trong cuộc gọi không
  const isUserInCall = participants.some(p => p.user_id === currentUser)

  // Tải danh sách participants khi component mount
  useEffect(() => {
    loadParticipants()
  }, [message.name])

  const loadParticipants = async () => {
    try {
      const result = await getParticipants({ message_id: message.name })
      console.log('Load participants result:', result)
      
      if (result?.message?.success) {
        setParticipants(result.message.participants || [])
        setCallStatus(result.message.status || 'active')
      }
    } catch (error) {
      console.error('Error loading participants:', error)
    }
  }

  const handleJoinCall = async () => {
    if (callStatus !== 'active') {
      toast.error('Cuộc gọi đã kết thúc')
      return
    }

    setIsJoining(true)
    try {
      const result = await joinCall({ message_id: message.name })
      console.log('Join call result:', result)
      
      if (result?.message?.success) {
        toast.success('Đã tham gia cuộc gọi nhóm')
        loadParticipants() // Refresh participants list
        
        // Mở giao diện group call
        openGroupCallInterface(result.message.room_id)
      } else {
        toast.error(result?.message?.error || 'Không thể tham gia cuộc gọi')
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi tham gia cuộc gọi')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveCall = async () => {
    try {
      const result = await leaveCall({ message_id: message.name })
      console.log('Leave call result:', result)
      
      if (result?.message?.success) {
        toast.success('Đã rời khỏi cuộc gọi')
        loadParticipants() // Refresh participants list
        
        if (result.message.call_ended) {
          setCallStatus('ended')
          toast.info('Cuộc gọi nhóm đã kết thúc')
        }
      } else {
        toast.error(result?.message?.error || 'Không thể rời khỏi cuộc gọi')
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra')
    }
  }

  const openGroupCallInterface = (roomId: string) => {
    // Tạo event để mở giao diện group call
    const eventDetail = {
      roomId: roomId,
      messageId: message.name,
      channelId: message.channel_id
    }
    console.log('Dispatching openGroupCall event from message:', eventDetail)
    
    const event = new CustomEvent('openGroupCall', {
      detail: eventDetail
    })
    window.dispatchEvent(event)
  }

  if (callStatus === 'ended') {
    return (
      <Box className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-w-sm">
        <Flex align="center" gap="3">
          <div className="bg-gray-300 dark:bg-gray-600 rounded-full p-2">
            <BiPhoneOff size="20" className="text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <Text size="2" weight="medium" className="text-gray-700 dark:text-gray-200">
              {message.text}
            </Text>
            <Text size="1" className="text-gray-500 dark:text-gray-400">
              Cuộc gọi đã kết thúc
            </Text>
          </div>
        </Flex>
      </Box>
    )
  }

  return (
    <Box className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 max-w-sm border border-blue-200 dark:border-blue-800">
      <Flex direction="column" gap="3">
        {/* Header */}
        <Flex align="center" gap="3">
          <div className="bg-blue-500 rounded-full p-2 animate-pulse">
            <BiPhone size="20" className="text-white" />
          </div>
          <div className="flex-1">
            <Text size="2" weight="medium" className="text-gray-800 dark:text-gray-100">
              {message.text}
            </Text>
            <Flex align="center" gap="1" mt="1">
              <BsFillPersonFill size="12" className="text-gray-500" />
              <Text size="1" className="text-gray-600 dark:text-gray-400">
                {participants.length} người tham gia
              </Text>
            </Flex>
          </div>
        </Flex>

        {/* Participants */}
        {participants.length > 0 && (
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="1" className="text-gray-600 dark:text-gray-400">
              Đang tham gia:
            </Text>
            <Flex align="center" gap="1">
              {participants.slice(0, 3).map((participant) => (
                <UserAvatar
                  key={participant.user_id}
                  src={participant.user_image}
                  alt={participant.full_name}
                  size="1"
                />
              ))}
              {participants.length > 3 && (
                <Badge variant="soft" size="1">
                  +{participants.length - 3}
                </Badge>
              )}
            </Flex>
          </Flex>
        )}

        {/* Action Buttons */}
        <Flex gap="2">
          {!isUserInCall ? (
            <Button
              size="2"
              className="flex-1"
              onClick={handleJoinCall}
              disabled={isJoining || callStatus !== 'active'}
              style={{ backgroundColor: '#10B981', color: 'white' }}
            >
              <BiPhone size="16" />
              {isJoining ? 'Đang tham gia...' : 'Nhấn để vào cuộc gọi'}
            </Button>
          ) : (
            <Button
              size="2"
              className="flex-1"
              onClick={handleLeaveCall}
              style={{ backgroundColor: '#EF4444', color: 'white' }}
            >
              <BiPhoneOff size="16" />
              Rời cuộc gọi
            </Button>
          )}
        </Flex>

        {/* Call Status */}
        <Flex justify="center">
          <Badge
            variant="soft"
            color={callStatus === 'active' ? 'green' : 'gray'}
          >
            {callStatus === 'active' ? '🟢 Đang hoạt động' : '⚫ Đã kết thúc'}
          </Badge>
        </Flex>
      </Flex>
    </Box>
  )
} 