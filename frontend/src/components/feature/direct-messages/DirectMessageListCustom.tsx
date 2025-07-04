/* eslint-disable react-hooks/rules-of-hooks */
import { UserAvatar } from '@/components/common/UserAvatar'
import { useGetUser } from '@/hooks/useGetUser'
import { useIsUserActive } from '@/hooks/useIsUserActive'
import { Box, ContextMenu, Flex, Text, Tooltip } from '@radix-ui/themes'
import { useContext, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserContext } from '../../../utils/auth/UserProvider'

import { ChannelWithUnreadCount, DMChannelWithUnreadCount } from '@/components/layout/Sidebar/useGetChannelUnreadCounts'
import { useChannelActions } from '@/hooks/useChannelActions'
import { useChannelDone } from '@/hooks/useChannelDone'
import { useIsLaptop, useIsTablet } from '@/hooks/useMediaQuery'
import { useRemoveChannelFromLabel } from '@/hooks/useRemoveChannelFromLabel'
import { manuallyMarkedAtom } from '@/utils/atoms/manuallyMarkedAtom'
import { LabelType, useEnrichedSortedChannels, useUpdateChannelLabels } from '@/utils/channel/ChannelAtom'
import { useFormattedLastMessageParts } from '@/utils/channel/useFormatLastMessage'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { useSidebarMode } from '@/utils/layout/sidebar'
import { truncateText } from '@/utils/textUtils/truncateText'
import clsx from 'clsx'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useAtomValue, useSetAtom } from 'jotai'
import { GoPlus } from 'react-icons/go'
import { HiCheck } from 'react-icons/hi'
import { MdLabelOutline } from 'react-icons/md'
import { toast } from 'sonner'
import { SidebarBadge, SidebarGroup, SidebarIcon } from '../../layout/Sidebar/SidebarComp'
import { DoneChannelList } from '../channels/DoneChannelList'
import UserChannelList from '../channels/UserChannelList'
import MentionList from '../chat/ChatInput/MentionListCustom'
import ChatbotAIStream from '../chatbot-ai/ChatbotAIStream'
import { labelListAtom, useLabelListValue } from '../labels/conversations/atoms/labelAtom'
import { createLabelModalAtom } from '../labels/CreateLabelModal'
import LabelByUserList from '../labels/LabelByUserList'
import ThreadsCustom from '../threads/ThreadsCustom'
import { MessageSaved } from './DirectMessageSaved'

import { pinnedChannelsAtom, togglePinnedChannelAtom } from '@/utils/atoms/PinnedAtom'

type UnifiedChannel = ChannelWithUnreadCount | DMChannelWithUnreadCount | any

export const DirectMessageList = () => {
  const { labelID } = useSidebarMode()

  const enriched = useEnrichedSortedChannels(labelID ? undefined : 0)

  return (
    <SidebarGroup pb='4'>
      <SidebarGroup>
        <DirectMessageItemList channel_list={enriched} />
      </SidebarGroup>
    </SidebarGroup>
  )
}

export const DirectMessageItemList = ({ channel_list }: any) => {
  const { title, labelID } = useSidebarMode()

  // Ưu tiên các component đặc biệt trước
  if (title === 'Đã gắn cờ') return <MessageSaved />
  if (title === 'Nhắc đến') return <MentionList />
  if (title === 'Xong') return <DoneChannelList key='done-list' />
  if (title === 'Chủ đề') return <ThreadsCustom />
  if (title === 'Thành viên') return <UserChannelList />
  if (title === 'Chatbot AI') return <ChatbotAIStream />
  if (title === 'Nhãn') return <LabelByUserList />

  // Nếu có nhãn ID thì lọc theo nhãn
  if (labelID) {
    const filtered = channel_list.filter((c: { user_labels: { label_id: string; label: string }[] }) => {
      return c.user_labels?.some((label: { label_id: string; label: string }) => label.label_id === labelID)
    })

    if (filtered?.length === 0) {
      return <div className='text-gray-500 text-sm italic p-4 text-center'>Không có kênh nào gắn nhãn này</div>
    }

    return (
      <>
        {filtered?.map((channel: DMChannelWithUnreadCount) => (
          <DirectMessageItem key={channel.name} dm_channel={channel} />
        ))}
      </>
    )
  }

  // Trường hợp không có nhãn → lọc theo các filter thông thường
  const getFilteredChannels = (): DMChannelWithUnreadCount[] => {
    switch (title) {
      case 'Trò chuyện nhóm':
        return channel_list.filter((c: { group_type: string }) => c.group_type === 'channel')
      case 'Trò chuyện 1-1':
        return channel_list.filter((c: { group_type: string }) => c.group_type === 'dm')
      case 'Chưa đọc':
        return channel_list.filter((c: { unread_count: number }) => c.unread_count > 0)
      default:
        return channel_list
    }
  }

  const filteredChannels = getFilteredChannels()

  if (filteredChannels.length === 0) {
    return <div className='text-gray-500 text-sm italic p-4 text-center'>Không có cuộc trò chuyện nào</div>
  }

  return <>{filteredChannels?.map((channel) => <DirectMessageItem key={channel.name} dm_channel={channel} />)}</>
}

export const DirectMessageItem = ({ dm_channel }: { dm_channel: DMChannelWithUnreadCount }) => {
  const labelList = useLabelListValue()
  const setLabelList = useSetAtom(labelListAtom)
  const setShowCreateLabel = useSetAtom(createLabelModalAtom)

  const { removeChannel } = useRemoveChannelFromLabel()
  const { addLabelToChannel, removeLabelFromChannel } = useUpdateChannelLabels()
  const { call: callCreateOrAssignLabel } = useFrappePostCall(
    'raven.api.user_channel_label.add_label_to_multiple_channels'
  )

  const selectedChannelRef = useRef<UnifiedChannel | null>(dm_channel)
  const channelID = dm_channel.name

  // 👇 Pin state
  const pinnedIDs = useAtomValue(pinnedChannelsAtom)
  const togglePin = useSetAtom(togglePinnedChannelAtom)
  const isPinned = pinnedIDs.includes(channelID)

  // Actions đánh dấu đọc/chưa đọc
  const { markAsUnread, markAsRead, isManuallyMarked } = useChannelActions()

  const handleToggleLabel = async (label: LabelType, isAssigned: boolean) => {
    const labelID = label.label_id
    try {
      if (isAssigned) {
        await removeChannel(labelID, channelID)
        removeLabelFromChannel(channelID, labelID)
        setLabelList((prev) =>
          prev?.map((l) =>
            l.label_id === labelID ? { ...l, channels: l.channels.filter((c) => c.channel_id !== channelID) } : l
          )
        )
        toast.success(`Đã xoá nhãn "${label.label}" khỏi kênh`)
      } else {
        const res = await callCreateOrAssignLabel({
          label_id: labelID,
          channel_ids: JSON.stringify([channelID])
        })

        if (res?.message?.status === 'success') {
          addLabelToChannel(channelID, { label_id: labelID, label: label.label })
          toast.success(`Đã gán nhãn "${label.label}" cho kênh`)
        } else {
          toast.error('Không thể gán nhãn')
        }
      }
    } catch (err) {
      console.error('Xử lý nhãn thất bại:', err)
      toast.error('Không thể cập nhật nhãn')
    }
  }

  const renderLabelMenu = () => {
    if (labelList.length === 0) {
      return (
        <ContextMenu.Item
          onClick={() =>
            setShowCreateLabel({
              isOpen: true,
              addUserToLabel: true,
              selectedChannel: selectedChannelRef.current?.name
            })
          }
          className='cursor-pointer dark:hover:bg-gray-700 px-2 py-1 rounded flex items-center gap-2'
        >
          <MdLabelOutline size={14} />
          <span>Tạo nhãn</span>
          <span className='ml-auto'>
            <GoPlus size={14} />
          </span>
        </ContextMenu.Item>
      )
    }

    return (
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger className='cursor-pointer dark:hover:bg-gray-700 px-2 py-1 rounded flex items-center gap-2'>
          <MdLabelOutline size={14} />
          <span>Nhãn</span>
        </ContextMenu.SubTrigger>

        <ContextMenu.SubContent className='dark:bg-gray-800 rounded px-1 py-1 w-48 z-50'>
          {labelList?.map((label) => {
            const isAssigned = dm_channel.user_labels?.some((l) => l.label_id === label.label_id)
            return (
              <ContextMenu.Item
                key={label.label_id}
                onSelect={(e) => e.preventDefault()}
                onClick={() => handleToggleLabel(label, isAssigned)}
                className='cursor-pointer dark:hover:bg-gray-700 px-2 py-1 rounded flex items-center justify-between'
              >
                <div className='flex items-center gap-2'>
                  <MdLabelOutline size={14} />
                  <span className='truncate max-w-[70px]'>{label.label}</span>
                </div>
                {isAssigned && <HiCheck size={14} className='text-green-500' />}
              </ContextMenu.Item>
            )
          })}

          <ContextMenu.Separator className='h-px bg-gray-600 my-2' />

          <ContextMenu.Item
            onClick={() =>
              setTimeout(() => {
                setShowCreateLabel({
                  isOpen: true,
                  addUserToLabel: true,
                  selectedChannel: dm_channel.name
                })
              }, 0)
            }
            className='cursor-pointer dark:hover:bg-gray-700 px-2 py-1 rounded flex items-center gap-2'
          >
            <GoPlus size={14} />
            <span>Nhãn mới</span>
          </ContextMenu.Item>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>
    )
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className='select-none'>
          <DirectMessageItemElement
            channel={dm_channel}
            onContextMenu={() => {
              selectedChannelRef.current = dm_channel
            }}
          />
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Content className='z-50 bg-white dark:bg-gray-800 border dark:border-gray-600 shadow rounded p-1 text-black dark:text-white'>
        {/* Đánh dấu đã đọc / chưa đọc */}
        <ContextMenu.Item
          onClick={() => {
            // Nếu đang có unread → đánh dấu đã đọc, ngược lại đánh dấu chưa đọc
            const hasUnread = dm_channel.unread_count > 0 || isManuallyMarked(dm_channel.name)
            hasUnread ? markAsRead(dm_channel) : markAsUnread(dm_channel)
          }}
          className='dark:hover:bg-gray-700 px-2 py-1 rounded cursor-pointer'
        >
          {dm_channel.unread_count > 0 || isManuallyMarked(dm_channel.name) ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
        </ContextMenu.Item>

        {/* Ghim / Bỏ ghim */}
        <ContextMenu.Item
          onClick={() => togglePin(dm_channel.name)}
          className='cursor-pointer dark:hover:bg-gray-700 px-2 py-1 rounded'
        >
          {isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn lên đầu'}
        </ContextMenu.Item>

        {renderLabelMenu()}
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}

const isDMChannel = (c: UnifiedChannel): c is DMChannelWithUnreadCount => {
  return 'peer_user_id' in c && typeof c.peer_user_id === 'string'
}

export const DirectMessageItemElement = ({
  channel,
  onContextMenu
}: {
  channel: UnifiedChannel
  onContextMenu?: (channel: UnifiedChannel) => void
}) => {
  const isLaptop = useIsLaptop()
  const isTablet = useIsTablet()
  const { currentUser } = useContext(UserContext)
  const navigate = useNavigate()
  const { workspaceID, channelID } = useParams<{ workspaceID: string; channelID: string }>()

  const manuallyMarked = useAtomValue(manuallyMarkedAtom)
  const { clearManualMark } = useChannelActions()
  const { markAsDone, markAsNotDone } = useChannelDone()

  const isDM = isDMChannel(channel)
  const isGroupChannel = !channel.is_direct_message && !channel.is_self_message
  const peerUserId = isDM ? channel.peer_user_id : ''
  const peerUser = useGetUser(peerUserId || '')
  const isActive = peerUserId ? useIsUserActive(peerUserId) : false
  const isSelectedChannel = channelID === channel.name
  const isManuallyMarked = manuallyMarked.has(channel.name)
  const isChannelDone = channel.is_done === 1

  const { title, labelID } = useSidebarMode()

  // Loại bỏ nếu không render được
  if (!(isGroupChannel || (isDM && peerUserId && peerUser?.enabled))) return null

  const lastOwner = useMemo(() => {
    try {
      const raw =
        typeof channel.last_message_details === 'string'
          ? JSON.parse(channel.last_message_details)
          : channel.last_message_details
      return raw?.owner ?? ''
    } catch {
      return ''
    }
  }, [channel.last_message_details])

  const lastUser = useGetUser(lastOwner)
  const { senderLabel, contentLabel } = useFormattedLastMessageParts(channel, currentUser, lastUser?.full_name)

  const rawName = peerUser
    ? peerUserId !== currentUser
      ? peerUser.full_name
      : `${peerUser.full_name} (You)`
    : channel.channel_name || channel.name

  const displayName = truncateText(rawName, isLaptop ? 20 : 28)
  const shouldShowBadge = channel.unread_count > 0 || isManuallyMarked

  const handleNavigate = () => {
    // const lastRead = lastReadStorage.get(channel.name)

    // const params = new URLSearchParams()

    // if (lastRead) {
    //   params.set('message_id', lastRead)
    //   params.set('message_source', 'read') // 👈 phân biệt nguồn
    // }

    navigate(`/${workspaceID}/${channel.name}`)
    clearManualMark(channel.name)
  }

  const handleMarkToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isChannelDone ? markAsNotDone(channel.name) : markAsDone(channel.name)
  }

  const showDoneButton =
    (isTablet && !channel.last_message_details) || (channel.last_message_details && !(title === 'Nhãn' || labelID))

  return (
    <div
      onClick={handleNavigate}
      onContextMenu={() => onContextMenu?.(channel)}
      className={clsx(
        'group relative cursor-pointer flex items-center p-1 mb-2',
        !isTablet && 'overflow-y-hidden',
        isSelectedChannel ? 'bg-gray-300 dark:bg-gray-700' : '',
        !isTablet && 'hover:bg-gray-100 dark:hover:bg-gray-600'
      )}
    >
      <SidebarIcon>
        <Box className='relative'>
          {peerUser ? (
            <UserAvatar
              src={peerUser.user_image}
              alt={peerUser.full_name}
              isBot={peerUser.type === 'Bot'}
              isActive={isActive}
              size={{ initial: '2', md: '1' }}
              availabilityStatus={peerUser.availability_status}
            />
          ) : (
            <ChannelIcon type={channel.type} className={isTablet ? 'w-[32px] h-[32px]' : 'w-[24px] h-[24px]'} />
          )}
          {shouldShowBadge && (
            <SidebarBadge className='absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[8px] rounded-full bg-red-500 text-white flex items-center justify-center'>
              {channel.unread_count > 99 ? '99+' : channel.unread_count}
            </SidebarBadge>
          )}
        </Box>
      </SidebarIcon>

      <Flex direction='column' justify='center' className='flex-1 ml-2'>
        <Flex justify='between' align='center'>
          <Text size='2' as='span' className={clsx(shouldShowBadge ? 'font-bold' : 'font-medium', 'truncate')}>
            {displayName}
          </Text>
        </Flex>
        <Text size='1' className='truncate flex items-center gap-1'>
          {senderLabel && <span>{senderLabel}:</span>}
          <span>{contentLabel}</span>
        </Text>
      </Flex>

      {showDoneButton && (
        <Tooltip content={isChannelDone ? 'Đánh dấu chưa xong' : 'Đánh dấu đã xong'} side='bottom'>
          <button
            onClick={handleMarkToggle}
            className={clsx(
              'absolute z-99 right-2 top-1/2 transform -translate-y-1/2',
              isTablet ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              'p-1 rounded-full bg-gray-200 hover:bg-gray-300 h-[20px] w-[20px] flex items-center justify-center cursor-pointer'
            )}
            title={isChannelDone ? 'Chưa xong' : 'Đã xong'}
          >
            <HiCheck
              className={clsx(
                'h-3 w-3 transition-colors duration-150',
                isChannelDone ? 'text-green-600' : 'text-gray-800'
              )}
            />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
