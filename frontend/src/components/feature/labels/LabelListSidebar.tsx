import { useEnrichedSortedChannels } from '@/utils/channel/ChannelAtom'
import { useSidebarMode } from '@/utils/layout/sidebar'
import { truncateText } from '@/utils/textUtils/truncateText'
import clsx from 'clsx'
import { useMemo } from 'react'
import { MdLabelOutline } from 'react-icons/md'
import { useLabelListValue } from './conversations/atoms/labelAtom'
import { ScrollArea } from '@radix-ui/themes'

type Props = {
  visible: boolean
  onClickLabel: (label: { labelId: string; labelName: string }) => void
}

export default function LabelList({ visible, onClickLabel }: Props) {
  const labelList = useLabelListValue()
  const { title, setLabelID } = useSidebarMode()

  const enrichedChannels = useEnrichedSortedChannels()

  const labelUnreadMap = useMemo(() => {
    const map = new Map<string, number>()

    for (const ch of enrichedChannels) {
      if (Array.isArray(ch.user_labels)) {
        ch.user_labels.forEach((label) => {
          const labelId = label.label_id
          const prev = map.get(labelId) ?? 0
          map.set(labelId, prev + (ch.unread_count ?? 0))
        })
      }
    }

    return map
  }, [enrichedChannels])

  if (!visible) return null

  return (
    <ScrollArea type='hover' className={clsx(labelList?.length > 5 && 'max-h-40 sidebar-scroll')}>
      <ul className='mt-1 space-y-1'>
        {labelList?.map((item) => {
          const unread = labelUnreadMap.get(item.label_id) ?? 0

          return (
            <li
              key={item.label_id}
              onClick={() => {
                onClickLabel({
                  labelName: item.label,
                  labelId: item.label_id
                })
                setLabelID(item.label_id)
              }}
              className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-2 cursor-pointer',
                typeof title === 'object' && title.labelName === item.label && 'bg-gray-3 font-semibold pl-5'
              )}
            >
              <MdLabelOutline className='w-4 h-4 text-gray-11 shrink-0' />
              <div className='flex justify-between items-center w-full'>
                <span className='truncate'>{truncateText(item.label, 15)}</span>
                {unread > 0 && (
                  <span className='ml-auto bg-red-500 text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center'>
                    {unread > 10 ? '9+' : unread}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </ScrollArea>
  )
}
