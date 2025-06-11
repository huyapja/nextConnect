import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Tooltip } from '@radix-ui/themes'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { FaUsers } from 'react-icons/fa6'
import { IoTriangle } from 'react-icons/io5'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import { useChannelActions } from '@/hooks/useChannelActions'
import { useGetUser } from '@/hooks/useGetUser'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { setSelectedChannels } from '@/store/slices/channelSlice'
import { RootState } from '@/store'

interface Props {
  channel: any
  isActive?: boolean
  onActivate?: () => void
}

// components hiển thị danh sách kéo thả circle user
const SortableCircleUserItem = ({ channel, onActivate }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: channel.name })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    minWidth: 50,
    minHeight: 50
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CircleUserItem channel={channel} onActivate={onActivate} />
    </div>
  )
}

const CircleUserItem = ({ channel, onActivate }: Props) => {
  const navigate = useNavigate()
    const channelID = useParams().channelID || ''
  const isDM = channel.is_direct_message === 1
  const userInfo = useGetUser(channel?.peer_user_id)
  const displayName = isDM ? userInfo?.full_name : channel.channel_name
  const { clearManualMark } = useChannelActions()
  const { workspaceID } = useParams()
  const isMobile = useIsMobile()
  const [dragging, setDragging] = useState(false)

  const isActive = channelID === channel.name


  const handleClick = (e: React.MouseEvent) => {
    if (e.button !== 0 || dragging) return
    clearManualMark(channel.name)
    onActivate?.()
    navigate(`/${workspaceID}/${channel.name}`)
  }

  const shortName = useMemo(() => {
    const firstWord = displayName?.split(' ')[0] || ''
    return firstWord.length > 6 ? firstWord.slice(0, 6) + '...' : firstWord
  }, [displayName, isMobile])

  return (
    <Tooltip content={displayName} side='bottom'>
      <div
        className={clsx(
          'flex flex-col items-center space-y-1 cursor-pointer text-center p-1 rounded-md w-full',
          isActive ? 'bg-gray-300 dark:bg-gray-700' : !isMobile && 'hover:bg-gray-200 dark:hover:bg-gray-600'
        )}
        onMouseDown={() => setDragging(false)}
        onMouseMove={() => setDragging(true)}
        onMouseUp={handleClick}
      >
        <div className='flex flex-col items-center space-y-1'>
          <div className='relative'>
            <div
              className={clsx(
                'rounded-full flex items-center justify-center',
                isDM
                  ? 'w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 text-white'
                  : 'border-2 border-teal-400 text-teal-600 w-7 h-7'
              )}
            >
              {isDM ? (
                <span className='text-[12px] font-semibold'>{displayName?.slice(0, 2).toUpperCase()}</span>
              ) : (
                <FaUsers className='w-4 h-4 text-teal-500' />
              )}
            </div>

            {channel.unread_count > 0 && (
              <div className='absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white'>
                {channel.unread_count > 9 ? '9+' : channel.unread_count}
              </div>
            )}
          </div>
          <div className='text-xs truncate max-w-full h-[16px] leading-[16px] text-center'>{shortName}</div>
        </div>
      </div>
    </Tooltip>
  )
}

export const CircleUserList = () => {
  const dispatch = useDispatch()
  const channelID = useParams().channelID || ''
  const selectedChannels = useSelector((state: RootState) => state.channel.selectedChannels)

  const { markAsUnread, isManuallyMarked } = useChannelActions()
  const [items, setItems] = useState(selectedChannels.map((c) => c.name))
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setItems(selectedChannels.map((c) => c.name))
  }, [selectedChannels])

  const sensors = useSensors(useSensor(PointerSensor))
  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.indexOf(active.id)
    const newIndex = items.indexOf(over.id)
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)

    const reordered = newItems.map((name) => selectedChannels.find((c) => c.name === name)).filter(Boolean)

    dispatch(setSelectedChannels(reordered))
  }

  const isMobile = useIsMobile()
  const [showExtraList, setShowExtraList] = useState(false)
  const [rows, setRows] = useState<string[][]>([])
  const itemsPerRow = 5

  useEffect(() => {
    if (!isMobile) return
    const tempRows: string[][] = []

    for (let i = 0; i < items.length; i += itemsPerRow) {
      tempRows.push(items.slice(i, i + itemsPerRow))
    }

    if (tempRows.length > 1 && tempRows[0]) {
      tempRows[0].push('__TOGGLE__')
    }

    setRows(tempRows)
  }, [items, isMobile])

  if (!selectedChannels.length) return null

  return (
    <div className='w-full overflow-hidden'>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={rectSortingStrategy}>
          {isMobile ? (
            <div className='flex flex-col gap-5 w-full'>
              {rows.map((row, rowIndex) => {
                if (rowIndex > 0 && !showExtraList) return null

                return (
                  <div key={rowIndex} className='flex gap-3 w-full items-start'>
                    {row.map((channelName) => {
                      if (channelName === '__TOGGLE__') {
                        return (
                          <div key='__TOGGLE__' className='flex flex-col items-center space-y-1 ml-auto'>
                            <button className="bg-transparent" onClick={() => setShowExtraList((prev) => !prev)}>
                              <div className='w-8 h-8 border-2 rounded-full flex items-center justify-center'>
                                <IoTriangle
                                  className={`w-3 h-3 transition-transform duration-200 dark:text-gray-200 ${
                                    showExtraList ? '' : '-rotate-180'
                                  }`}
                                />
                              </div>
                              <span className='text-xs mt-1 dark:text-gray-200'>
                                {showExtraList ? 'Ẩn' : 'Hiển t..'}
                              </span>
                            </button>
                          </div>
                        )
                      }

                      const channel = selectedChannels.find((c) => c.name === channelName)
                      if (!channel) return null

                      return (
                        <ContextMenu.Root key={channel.name}>
                          <ContextMenu.Trigger asChild>
                            <div className='select-none'>
                              <SortableCircleUserItem
                                channel={channel}
                                // isActive={channel.name === channelID}
                                onActivate={() => {}}
                              />
                            </div>
                          </ContextMenu.Trigger>
                          <ContextMenu.Portal>
                            <ContextMenu.Content className='z-50 bg-white dark:bg-gray-800 text-black dark:text-white rounded shadow-md p-1'>
                              <ContextMenu.Item
                                className='px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer'
                                onClick={() => {
                                  markAsUnread(channel)
                                  dispatch(setSelectedChannels([...selectedChannels]))
                                }}
                              >
                                {channel.unread_count > 0 || isManuallyMarked(channel.name)
                                  ? 'Đánh dấu đã đọc'
                                  : 'Đánh dấu chưa đọc'}
                              </ContextMenu.Item>
                              <ContextMenu.Item
                                className='px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer'
                                // onClick={() => togglePin(channel)}
                              >
                                {/* {isPinned(channel.name) ? 'Bỏ ghim khỏi danh sách' : 'Ghim lên đầu'} */}
                              </ContextMenu.Item>
                            </ContextMenu.Content>
                          </ContextMenu.Portal>
                        </ContextMenu.Root>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : (
            <div>
              <div
                className={clsx(
                  'flex flex-wrap gap-3 p-2 mb-5 transition-all duration-300 ease-in-out',
                  showAll ? 'max-h-[1000px]' : 'max-h-[120px]'
                )}
              >
                {items.map((channelName) => {
                  const channel = selectedChannels.find((c) => c.name === channelName)
                  if (!channel) return null

                  return (
                    <ContextMenu.Root key={channel.name}>
                      <ContextMenu.Trigger asChild>
                        <div className='w-[50px] h-[50px]'>
                          <SortableCircleUserItem
                            channel={channel}
                            isActive={channel.name === channelID}
                            onActivate={() => {}}
                          />
                        </div>
                      </ContextMenu.Trigger>
                      <ContextMenu.Portal>
                        <ContextMenu.Content className='z-50 bg-white dark:bg-gray-800 text-black dark:text-white rounded shadow-md p-1'>
                          <ContextMenu.Item
                            className='px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer'
                            onClick={() => {
                              markAsUnread(channel)
                              dispatch(setSelectedChannels([...selectedChannels]))
                            }}
                          >
                            {channel.unread_count > 0 || isManuallyMarked(channel.name)
                              ? 'Đánh dấu đã đọc'
                              : 'Đánh dấu chưa đọc'}
                          </ContextMenu.Item>
                          <ContextMenu.Item
                            className='px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer'
                            // onClick={() => togglePin(channel)}
                          >
                            {/* {isPinned(channel.name) ? 'Bỏ ghim khỏi danh sách' : 'Ghim lên đầu'} */}
                          </ContextMenu.Item>
                        </ContextMenu.Content>
                      </ContextMenu.Portal>
                    </ContextMenu.Root>
                  )
                })}
              </div>

              {items.length > 10 && (
                <button
                  onClick={() => setShowAll((prev) => !prev)}
                  className='text-xs mt-2 text-blue-500 hover:underline'
                >
                  {showAll ? 'Ẩn bớt' : 'Hiện thêm'}
                </button>
              )}
            </div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default CircleUserList
