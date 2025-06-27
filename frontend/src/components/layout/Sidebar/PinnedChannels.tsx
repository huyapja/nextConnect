import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as ContextMenu from '@radix-ui/react-context-menu'
import clsx from 'clsx'
import { useAtomValue, useSetAtom } from 'jotai'
import { useMemo, useState } from 'react'
import { FaAngleDown, FaAngleUp, FaUsers } from 'react-icons/fa6'
import { useNavigate, useParams } from 'react-router-dom'

import { pinnedChannelsAtom, togglePinnedChannelAtom } from '@/utils/atoms/PinnedAtom'
import { useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { useGetUser } from '@/hooks/useGetUser'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { FaAngleDoubleDown, FaAngleDoubleUp, FaRegTimesCircle } from 'react-icons/fa'

export const useClickWithoutDrag = (onClick: () => void, threshold = 5) => {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return // Chỉ bắt sự kiện click chuột trái
    setStart({ x: e.clientX, y: e.clientY })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.button !== 0 || !start) return // Chỉ xử lý chuột trái
    const dx = Math.abs(e.clientX - start.x)
    const dy = Math.abs(e.clientY - start.y)
    if (dx < threshold && dy < threshold) {
      onClick()
    }
    setStart(null)
  }

  return { onPointerDown, onPointerUp }
}

const SortablePinnedItem = ({ channel }: { channel: any }) => {
  const togglePin = useSetAtom(togglePinnedChannelAtom)

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: channel.name
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    minWidth: 50,
    minHeight: 50,
    touchAction: 'manipulation',
    cursor: 'grab'
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
          <PinnedChannelItem channel={channel} />
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className='z-50 bg-white dark:bg-gray-800 text-black dark:text-white rounded shadow-md p-1'>
          <ContextMenu.Item
            className='px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer'
            onClick={() => togglePin(channel.name)}
          >
            bỏ ghim khỏi danh sách
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

type Props = {
  channel: any
}

const PinnedChannelItem = ({ channel }: Props) => {
  const isDM = channel.is_direct_message === 1
  const userInfo = useGetUser(channel.peer_user_id)
  const displayName = isDM ? userInfo?.full_name : channel.channel_name
  const { workspaceID, channelID } = useParams()
  const navigate = useNavigate()
  const isActive = channel.name === channelID
  const isMobile = useIsMobile()
  const togglePin = useSetAtom(togglePinnedChannelAtom)

  const shortName = useMemo(() => {
    const w = displayName?.split(' ')[0] || ''
    return w.length > 6 ? w.slice(0, 6) + '...' : w
  }, [displayName])

  const { onPointerUp, onPointerDown } = useClickWithoutDrag(() => {
    navigate(`/${workspaceID}/${channel.name}`)
  })

  return (
    <div
      className={clsx(
        'flex flex-col items-center space-y-1 text-center p-1 rounded-md w-[50px] cursor-pointer select-none',
        isActive ? 'bg-gray-300 dark:bg-gray-700' : !isMobile && 'hover:bg-gray-200 dark:hover:bg-gray-600'
      )}
    >
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} className='w-full flex flex-col items-center'>
        <div className='relative'>
          {/* Nút X riêng, tách khỏi phần onPointerDown/up */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              togglePin(channel.name)
            }}
            className='absolute -top-2 -right-2 z-10'
          >
            <FaRegTimesCircle
              className='bg-white dark:bg-gray-800 text-[10px] font-bold w-4 h-4 flex items-center justify-center 
             rounded-full border border-white dark:border-gray-800 text-gray-800 dark:text-gray-100'
              size={8}
            />
          </div>

          {/* Avatar */}
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

          {/* Noti */}
          {channel.unread_count > 0 && (
            <div className='absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white'>
              {channel.unread_count > 9 ? '9+' : channel.unread_count}
            </div>
          )}
        </div>

        {/* Tên */}
        <div className='text-xs mt-1 truncate max-w-full h-[16px] leading-[16px]'>{shortName}</div>
      </div>
    </div>
  )
}

export default PinnedChannelItem

export const PinnedChannels = () => {
  const pinnedIDs = useAtomValue(pinnedChannelsAtom)
  const setPinned = useSetAtom(pinnedChannelsAtom)
  const enrichedSorted = useEnrichedSortedChannels()
  const pinnedChannels = pinnedIDs.map((id) => enrichedSorted.find((c) => c.name === id)).filter(Boolean)

  const [showAll, setShowAll] = useState(false)
  const maxVisible = 6
  const topRowCount = maxVisible - 1

  const topRowChannels = pinnedChannels.slice(0, topRowCount)
  const extraChannels = pinnedChannels.slice(topRowCount)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = pinnedIDs.indexOf(active?.id)
    const newIdx = pinnedIDs.indexOf(over?.id)
    if (oldIdx < 0 || newIdx < 0) return

    const next = arrayMove(pinnedIDs, oldIdx, newIdx)
    setPinned(next)
    localStorage.setItem('raven_pinned_channels', JSON.stringify(next))
  }

  if (pinnedChannels.length === 0) return null

  return (
    <div className='mb-2'>
      <div className='text-xs text-gray-500 px-2 mb-1'>Đã ghim</div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pinnedChannels.map((c) => c.name)} strategy={rectSortingStrategy}>
          {/* Hàng đầu tiên: topRowChannels + toggle */}
          <div
            className={`grid ${pinnedChannels.length > 5 ? 'grid-cols-6' : 'grid-cols-5'} gap-3 px-2 justify-items-center`}
          >
            {topRowChannels.map((channel) => (
              <SortablePinnedItem key={channel.name} channel={channel} />
            ))}

            {pinnedChannels.length > 5 && (
              <div
                onClick={() => setShowAll((prev) => !prev)}
                className='w-[32px] h-[32px] rounded-full flex items-center justify-center cursor-pointer
             bg-gray-100 dark:bg-white-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600
             place-self-center'
              >
                {showAll ? <FaAngleUp className='text-dark-600' /> : <FaAngleDown className='text-dark-600' />}
              </div>
            )}
          </div>

          {/* Hàng thứ 2 nếu showAll */}
          {showAll && extraChannels.length > 0 && (
            <div className='grid grid-cols-6 gap-3 px-2 mt-2'>
              {extraChannels.map((channel) => (
                <SortablePinnedItem key={channel.name} channel={channel} />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  )
}
