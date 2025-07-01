import { IconButton } from '@radix-ui/themes'
import { BiPhone } from 'react-icons/bi'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { useState } from 'react'

interface GroupCallButtonProps {
  channelId: string
  isDisabled?: boolean
}

export const GroupCallButton = ({ channelId, isDisabled = false }: GroupCallButtonProps) => {
  const [isCreating, setIsCreating] = useState(false)
  const { call: createGroupCall } = useFrappePostCall('raven.api.group_call.create_group_call')

  const handleCreateGroupCall = async () => {
    if (isDisabled || isCreating) return

    setIsCreating(true)
    try {
      const result = await createGroupCall({ channel_id: channelId })
      console.log('Create group call result:', result)
      
      if (result?.message?.success) {
        toast.success('Đã tạo phòng gọi nhóm')
        
        // Tự động tham gia cuộc gọi sau khi tạo
        const eventDetail = {
          roomId: result.message.room_id,
          messageId: result.message.message_id,
          channelId: channelId
        }
        console.log('Dispatching openGroupCall event:', eventDetail)
        
        const event = new CustomEvent('openGroupCall', {
          detail: eventDetail
        })
        window.dispatchEvent(event)
      } else {
        toast.error(result?.message?.error || 'Không thể tạo phòng gọi nhóm')
      }
    } catch (error: any) {
      console.error('Error creating group call:', error)
      toast.error(error.message || 'Có lỗi xảy ra khi tạo phòng gọi nhóm')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <IconButton
      variant="ghost"
      size="2"
      onClick={handleCreateGroupCall}
      disabled={isDisabled || isCreating}
      className="hover:bg-gray-100 dark:hover:bg-gray-800"
      title="Tạo cuộc gọi nhóm"
    >
      <BiPhone size="18" className={isCreating ? 'animate-pulse' : ''} />
    </IconButton>
  )
} 