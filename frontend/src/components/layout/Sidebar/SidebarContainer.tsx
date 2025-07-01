import { useSidebarMode } from '@/utils/layout/sidebar'
import { Tooltip } from '@radix-ui/themes'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiPhoneMissed } from 'react-icons/fi'
import {
  HiOutlineAtSymbol,
  HiOutlineChatAlt2,
  HiOutlineCheckCircle,
  HiOutlineChip,
  HiOutlineFlag,
  HiOutlineHashtag,
  HiOutlineInbox,
  HiOutlineTag,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineUsers
} from 'react-icons/hi'

import { CreateLabelButton } from '@/components/feature/labels/CreateLabelModal'
import LabelList from '@/components/feature/labels/LabelListSidebar'
import { useMissedCallCount } from '@/hooks/useMissedCallCount'
import { useSavedMessageCount } from '@/hooks/useSavedMessageCount'
import useUnreadThreadsCount from '@/hooks/useUnreadThreadsCount'
import { useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import clsx from 'clsx'
import { useFrappeEventListener, useFrappeGetCall } from 'frappe-react-sdk'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { useIsLaptop } from '@/hooks/useMediaQuery'
import { BsBoxArrowLeft, BsBoxArrowRight } from 'react-icons/bs'

export const useMentionUnreadCount = () => {
  const { data: mentionsCount, mutate } = useFrappeGetCall<{ message: number }>(
    'raven.api.mentions.get_unread_mention_count',
    undefined,
    undefined,
    {
      revalidateOnFocus: true,
      focusThrottleInterval: 1000 * 60 * 5
    }
  )

  useFrappeEventListener('raven_mention', () => {
    mutate()
  })

  const resetMentions = () => {
    mutate({ message: 0 }, { revalidate: false })
  }

  return { mentionUnreadCount: mentionsCount?.message || 0, resetMentions }
}

export const filterItems = [
  { label: 'Trò chuyện', icon: HiOutlineChatAlt2 },
  { label: 'Chưa đọc', icon: HiOutlineInbox },
  { label: 'Cuộc gọi nhỡ', icon: FiPhoneMissed },
  { label: 'Đã gắn cờ', icon: HiOutlineFlag },
  { label: 'Nhắc đến', icon: HiOutlineAtSymbol },
  { label: 'Nhãn', icon: HiOutlineTag },
  { label: 'Trò chuyện 1-1', icon: HiOutlineUser },
  { label: 'Trò chuyện nhóm', icon: HiOutlineUsers },
  { label: 'Chatbot AI', icon: HiOutlineChip },
  // { label: 'Docs', icon: HiOutlineDocumentText },
  { label: 'Chủ đề', icon: HiOutlineHashtag },
  { label: 'Xong', icon: HiOutlineCheckCircle },
  { label: 'Thành viên', icon: HiOutlineUserGroup }
]

export default function SidebarContainer({ sidebarRef }: { sidebarRef: React.RefObject<any> }) {
  const { mode, setMode, tempMode } = useSidebarMode()

  const isCollapsed = false
  const isIconOnly = tempMode === 'show-only-icons'
  const sidebarMinWidth = 3
  const sidebarDefaultExpandedWidth = 15

  const timerRef = useRef<number>()

  const clearTimer = () => clearTimeout(timerRef.current)

  useEffect(() => {
    if (!sidebarRef?.current) return

    if (mode === 'show-only-icons') {
      sidebarRef?.current.resize(sidebarMinWidth)
    } else if (mode === 'default') {
      sidebarRef?.current.resize(sidebarDefaultExpandedWidth)
    }
  }, [mode, sidebarRef])

  const handleToggleIconMode = () => {
    setMode(isIconOnly ? 'default' : 'show-only-icons')
  }

  useEffect(() => clearTimer, [])

  return (
    <div
      className={`relative transition-all duration-300 ease-in-out
        dark:bg-gray-1`}
    >
      <div className={`flex items-center ${isIconOnly ? 'justify-center' : 'justify-between'}`}>
        <div className='flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300'>
          <span className='relative inline-block cursor-pointer py-3 group' style={{ zIndex: 999 }}>
            {isIconOnly ? (
              <BsBoxArrowRight
                onClick={handleToggleIconMode}
                className='w-5 h-5 p-1 rounded transition-transform duration-200 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
              />
            ) : (
              <BsBoxArrowLeft
                onClick={handleToggleIconMode}
                className='w-5 h-5 p-1 ml-3 mr-2 rounded transition-transform duration-200 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
              />
            )}
          </span>
          {!isCollapsed && !isIconOnly && <span className='text-base'>Bộ lọc</span>}
        </div>
      </div>

      {tempMode === 'default' && <FilterList />}
      {isIconOnly && <FilterList />}
    </div>
  )
}

export const FilterList = React.memo(({ onClose }: { onClose?: () => void }) => {
  const isLaptop = useIsLaptop()
  const [isLabelOpen, setIsLabelOpen] = useState(false)
  const navigate = useNavigate()
  const { workspaceID, channelID } = useParams()
  const { title, setTitle, tempMode, setLabelID } = useSidebarMode()
  const isIconOnly = tempMode === 'show-only-icons'
  const { mentionUnreadCount, resetMentions } = useMentionUnreadCount()
  // const { unreadMissedCallCount } = useMissedCallCount()
  const { data: unreadThreads } = useUnreadThreadsCount()
  const totalSaved = useSavedMessageCount()

  const enrichedChannels = useEnrichedSortedChannels(0) // chỉ lấy channel chưa xong
  const enrichedDoneChannels = useEnrichedSortedChannels(1) // lấy channel đã xong

  const totalUnreadCountFiltered = useMemo(() => {
    return enrichedChannels.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
  }, [enrichedChannels])

  const totalDoneCount = useMemo(() => {
    return enrichedDoneChannels.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
  }, [enrichedDoneChannels])

  const labelChannelsUnreadCount = useMemo(() => {
    const seen = new Set<string>()
    let total = 0
    for (const ch of enrichedChannels) {
      if (Array.isArray(ch.user_labels) && ch.user_labels?.length > 0 && !seen.has(ch.name)) {
        seen.add(ch.name)
        total += ch.unread_count ?? 0
      }
    }
    return total
  }, [enrichedChannels])

  const handleClick = useCallback(
    (label: string) => {
      setTitle(label)
      setLabelID('')

      if (onClose) onClose()
      if (channelID) navigate(`/${workspaceID}`)
    },
    [setTitle, setLabelID, resetMentions, onClose, channelID, workspaceID, navigate]
  )

  const renderedFilterItems = useMemo(() => {
    const getBadgeCount = (label: string): number => {
      switch (label) {
        case 'Trò chuyện':
        case 'Chưa đọc':
          return totalUnreadCountFiltered
        case 'Nhắc đến':
          return mentionUnreadCount
        case 'Đã gắn cờ':
          return totalSaved as unknown as number
        case 'Nhãn':
          return labelChannelsUnreadCount
        case 'Chủ đề':
          return unreadThreads?.message.total_unread_threads ?? 0
        case 'Xong':
          return totalDoneCount
        default:
          return 0
      }
    }

    return filterItems.map((item, idx) => {
      const isActive = item.label === title
      const badgeCount = getBadgeCount(item.label)

      if (item.label === 'Nhãn') {
        return (
          <div key={idx}>
            <div className='group relative'>
              <li
                className={clsx(
                  'flex items-center gap-2 justify-center',
                  !isIconOnly && 'pl-1 justify-between',
                  'py-1.5 px-2 rounded-md cursor-pointer hover:bg-gray-3',
                  isActive && 'bg-gray-4 font-semibold'
                )}
                onClick={() => {
                  setIsLabelOpen((prev) => !prev)
                  handleClick(item.label)
                  if (title !== item.label) {
                    setTitle(item.label)
                    setLabelID('')
                  }
                }}
              >
                <div className='flex items-center gap-2'>
                  <item.icon className='w-5 h-5' />
                  {!isIconOnly && <span className='truncate flex-1 min-w-0 font-medium text-[13px]'>{item.label}</span>}
                </div>

                {!isIconOnly && (
                  <div className='flex items-center gap-2'>
                    <div onClick={(e) => e.stopPropagation()}>
                      <CreateLabelButton />
                    </div>
                    <div
                      className='relative w-4 h-4'
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsLabelOpen((prev) => !prev)
                      }}
                    >
                      {isLabelOpen ? (
                        <FiChevronDown className='absolute inset-0 m-auto' size={16} />
                      ) : (
                        <FiChevronRight className='absolute inset-0 m-auto' size={16} />
                      )}
                    </div>
                  </div>
                )}
              </li>
            </div>

            {!isIconOnly && isLabelOpen && (
              <LabelList
                visible={isLabelOpen}
                onClickLabel={(label) => {
                  setTitle(label.labelName)
                  setLabelID(label.labelId)
                  onClose?.()
                  if (channelID) navigate(`/${workspaceID}`)
                }}
              />
            )}
          </div>
        )
      }

      return (
        <li
          key={idx}
          onClick={() => handleClick(item.label)}
          className={clsx(
            `flex ${isIconOnly ? 'justify-center' : 'justify-between'} relative items-center gap-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-3`,
            isActive && 'bg-gray-4 font-semibold'
          )}
        >
          <div className='flex items-center gap-2'>
            <Tooltip content={item.label} side='right' delayDuration={300}>
              <div className='w-6 h-6 flex items-center justify-center shrink-0'>
                <item.icon className='w-5 h-5' />
              </div>
            </Tooltip>
            {!isIconOnly && <span className='truncate flex-1 min-w-0 font-medium text-[13px]'>{item.label}</span>}
          </div>

          {badgeCount > 0 && (
            <span
              className={clsx(
                'font-medium rounded-full text-white text-[10px] flex items-center justify-center',
                isIconOnly
                  ? `absolute bottom-0 ${isLaptop ? 'right-[-5px]' : 'right-0'}  bg-red-500 p-1 w-[8px] h-[8px]`
                  : 'bg-gray-700 mr-4 px-[6px] w-[14px] h-[14px]'
              )}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </li>
      )
    })
  }, [
    filterItems,
    totalUnreadCountFiltered,
    totalDoneCount,
    labelChannelsUnreadCount,
    mentionUnreadCount,
    unreadThreads?.message.total_unread_threads,
    isIconOnly,
    title,
    isLabelOpen,
    handleClick,
    setTitle,
    setLabelID,
    onClose,
    channelID,
    workspaceID,
    navigate
  ])

  return (
    <ul className={clsx('space-y-1 text-sm text-gray-12', isIconOnly ? 'px-1' : 'px-3 py-2')}>{renderedFilterItems}</ul>
  )
})
