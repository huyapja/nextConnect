import React, { useCallback, useState } from 'react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useGetUser } from '@/hooks/useGetUser'
import { useMissedCallCount, MissedCall } from '@/hooks/useMissedCallCount'
import { Box, Flex, Text, Tooltip } from '@radix-ui/themes'
import { FiPhone, FiVideo, FiPhoneMissed } from 'react-icons/fi'
import { useFrappePostCall } from 'frappe-react-sdk'
import { toast } from 'sonner'
import { useNavigate, useParams } from 'react-router-dom'
import { useIsTablet } from '@/hooks/useMediaQuery'
import { useTheme } from '@/ThemeProvider'
import clsx from 'clsx'

export const MissedCallsList = () => {
  const { missedCalls, mutate } = useMissedCallCount()
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const { appearance } = useTheme()
  const isTablet = useIsTablet()

  if (missedCalls.length === 0) {
    return (
      <div className='text-gray-500 text-sm italic p-8 text-center'>
        <FiPhoneMissed size={32} className='mx-auto mb-4 opacity-50' />
        <p>Không có cuộc gọi nhỡ nào</p>
        <p className='text-xs mt-2 opacity-75'>Cuộc gọi nhỡ sẽ hiển thị ở đây</p>
      </div>
    )
  }

  return (
    <div className='space-y-2 p-2'>
      {missedCalls.map((call) => (
        <MissedCallItem 
          key={call.name} 
          call={call}
          isExpanded={expandedCall === call.name}
          onToggleExpand={() => setExpandedCall(expandedCall === call.name ? null : call.name)}
          onUpdate={() => mutate()}
        />
      ))}
    </div>
  )
}

interface MissedCallItemProps {
  call: MissedCall
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: () => void
}

const MissedCallItem = ({ call, isExpanded, onToggleExpand, onUpdate }: MissedCallItemProps) => {
  const callerUser = useGetUser(call.caller_id)
  const navigate = useNavigate()
  const { workspaceID } = useParams()
  const { appearance } = useTheme()
  
  const { call: markAsRead } = useFrappePostCall('raven.api.missed_calls.mark_as_read')
  const { call: createDMChannel } = useFrappePostCall<{ message: string }>('raven.api.raven_channel.create_direct_message_channel')

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Vừa xong'
    if (diffMinutes < 60) return `${diffMinutes} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays} ngày trước`
    
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const handleMarkAsRead = useCallback(async () => {
    try {
      await markAsRead({ call_id: call.name })
      onUpdate()
    } catch (error) {
      console.error('Error marking call as read:', error)
    }
  }, [call.name, markAsRead, onUpdate])

  const handleCallBack = useCallback(async (isVideo: boolean) => {
    try {
      console.log('📞 [MissedCallsList] Starting callback for:', { 
        callerId: call.caller_id, 
        callerName: call.caller_name,
        isVideo 
      })

      if (!call.is_read) {
        await handleMarkAsRead()
      }



      // 🎯 Sử dụng logic call 1-1 thông thường:
      // 1. Tạo/tìm DM channel với user đó
      const dmChannelResponse = await createDMChannel({
        user_id: call.caller_id
      })

      // 2. Lưu thông tin cuộc gọi cần trigger vào sessionStorage
      sessionStorage.setItem('pendingCall', JSON.stringify({
        toUserId: call.caller_id,
        isVideoCall: isVideo,
        callerName: call.caller_name,
        timestamp: Date.now()
      }))

      // 3. Navigate đến DM channel
      const channelId = dmChannelResponse?.message
      if (channelId) {
        if (workspaceID) {
          navigate(`/${workspaceID}/${channelId}`)
        } else {
          navigate(`/channel/${channelId}`)
        }
        
        console.log('📞 [MissedCallsList] Navigated to DM channel:', channelId)
      } else {
        throw new Error('Failed to get channel ID')
      }
      
    } catch (error) {
      console.error('📞 [MissedCallsList] Error calling back:', error)
      toast.error('Không thể tạo cuộc trò chuyện. Vui lòng thử lại.')
    }
  }, [call, handleMarkAsRead, createDMChannel, navigate, workspaceID])

  const handleItemClick = useCallback(() => {
    onToggleExpand()
    if (!call.is_read) {
      handleMarkAsRead()
    }
  }, [call.is_read, onToggleExpand, handleMarkAsRead])

  return (
    <div 
      className={clsx(
        'border rounded-lg transition-all duration-200',
        appearance === 'light' 
          ? 'border-gray-200 bg-white hover:bg-gray-50' 
          : 'border-gray-700 bg-gray-800 hover:bg-gray-700',
        !call.is_read && 'ring-2 ring-red-200 dark:ring-red-800'
      )}
    >
      <div 
        onClick={handleItemClick}
        className='cursor-pointer p-3'
      >
        <Flex align='center' gap='3'>
          <Box className='relative'>
            <UserAvatar
              src={callerUser?.user_image}
              alt={call.caller_name}
              isBot={callerUser?.type === 'Bot'}
              size='2'
            />
            <div className={clsx(
              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
              call.call_type === 'video' ? 'bg-blue-500' : 'bg-red-500'
            )}>
              {call.call_type === 'video' ? (
                <FiVideo size={10} className='text-white' />
              ) : (
                <FiPhone size={10} className='text-white' />
              )}
            </div>
          </Box>

          <Flex direction='column' className='flex-1 min-w-0'>
            <Text 
              size='2' 
              className={clsx(
                'truncate',
                !call.is_read ? 'font-bold' : 'font-medium'
              )}
            >
              {call.caller_name}
            </Text>
            <Text size='1' className='text-gray-500 truncate'>
              Cuộc gọi {call.call_type === 'video' ? 'video' : 'thoại'} nhỡ • {formatTime(call.creation)}
            </Text>
          </Flex>

          {!call.is_read && (
            <div className='w-2 h-2 bg-red-500 rounded-full shrink-0' />
          )}
        </Flex>
      </div>

      {isExpanded && (
        <div className={clsx(
          'border-t px-3 py-3',
          appearance === 'light' ? 'border-gray-200 bg-gray-50' : 'border-gray-600 bg-gray-700'
        )}>
          <Flex justify='between' align='center'>
            <Text size='1' className='text-gray-500'>
              Gọi lại {call.caller_name}:
            </Text>
            
            <Flex gap='2'>
              <Tooltip content='Gọi thoại'>
                <button
                  onClick={() => handleCallBack(false)}
                  className='w-10 h-10 rounded-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white transition-colors'
                >
                  <FiPhone size={16} />
                </button>
              </Tooltip>

              <Tooltip content='Gọi video'>
                <button
                  onClick={() => handleCallBack(true)}
                  className='w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white transition-colors'
                >
                  <FiVideo size={16} />
                </button>
              </Tooltip>
            </Flex>
          </Flex>
        </div>
      )}
    </div>
  )
} 