import { atom, useAtomValue, useSetAtom } from 'jotai'
import { useMemo } from 'react'
import { useUnreadCount } from '../layout/sidebar'
import { channelIsDoneAtom } from './channelIsDoneAtom'

export type ChannelWithGroupType = {
  name: string
  channel_name?: string
  last_message_timestamp?: string
  unread_count?: number
  group_type: 'channel' | 'dm'
  user_labels?: LabelType[]
  [key: string]: any
}

export type LabelType = { label_id: string; label: string }

export const sortedChannelsAtom = atom<ChannelWithGroupType[]>([])
export const sortedChannelsLoadingAtom = atom<boolean>(false)

export const setSortedChannelsAtom = atom(
  null,
  (get, set, next: ChannelWithGroupType[] | ((prev: ChannelWithGroupType[]) => ChannelWithGroupType[])) => {
    const prev = get(sortedChannelsAtom) ?? []
    const resolved = typeof next === 'function' ? (next as Function)(prev) : (next ?? [])
    set(sortedChannelsAtom, resolved)
  }
)

export const setSortedChannelsLoadingAtom = atom(null, (get, set, next: boolean) => {
  set(sortedChannelsLoadingAtom, next)
})

export const prepareSortedChannels = (
  newChannels: any[] = [],
  newDmChannels: any[] = [],
  currentChannelIsDone: Record<string, number> = {},
  prev: ChannelWithGroupType[] = []
): ChannelWithGroupType[] => {
  const prevMap = new Map((prev ?? []).map((c) => [c.name, c]))

  const mergeChannel = (newC: any, group_type: 'channel' | 'dm'): ChannelWithGroupType => {
    const old = prevMap.get(newC.name)
    const is_done = Object.prototype.hasOwnProperty.call(currentChannelIsDone, newC.name)
      ? currentChannelIsDone[newC.name]
      : typeof newC.is_done === 'number'
        ? newC.is_done
        : 0

    return {
      ...(old ?? {}),
      ...newC,
      group_type,
      is_done,
      user_labels: old?.user_labels ?? newC.user_labels ?? []
    }
  }

  const merged = [
    ...(newChannels ?? []).map((c) => mergeChannel(c, 'channel')),
    ...(newDmChannels ?? []).map((c) => mergeChannel(c, 'dm'))
  ]

  return merged.sort((a, b) => {
    const getTime = (x: any) => {
      const t1 = x.last_message_timestamp ? new Date(x.last_message_timestamp).getTime() : 0
      const t2 = x.creation ? new Date(x.creation).getTime() : 0
      return Math.max(t1, t2)
    }
    return getTime(b) - getTime(a)
  })
}

export const useEnrichedSortedChannels = (filter?: 0 | 1 | string) => {
  const channels = useAtomValue(sortedChannelsAtom) ?? []
  const channelIsDone = useAtomValue(channelIsDoneAtom) ?? {}
  const { message: unreadList = [] } = useUnreadCount() ?? {}

  const enriched = useMemo(() => {
    return (channels ?? [])
      .map((channel) => {
        const resolvedIsDone = Object.prototype.hasOwnProperty.call(channelIsDone, channel.name)
          ? channelIsDone[channel.name]
          : channel.is_done

        const unread = unreadList.find((u) => u.name === channel.name)

        return {
          ...channel,
          is_done: resolvedIsDone,
          unread_count: unread?.unread_count ?? channel.unread_count ?? 0,
          last_message_content: unread?.last_message_content ?? channel.last_message_content,
          last_message_sender_name: unread?.last_message_sender_name ?? channel.last_message_sender_name,
          user_labels: channel.user_labels ?? []
        }
      })
      .filter((channel) => {
        if (typeof filter === 'string') {
          return Array.isArray(channel.user_labels) && channel.user_labels.some((l) => l.label_id === filter)
        }

        if (filter === 0) return channel.is_done === 0
        if (filter === 1) return channel.is_done === 1

        return true
      })
  }, [channels, channelIsDone, unreadList, filter])

  return enriched
}

export const useEnrichedLabelChannels = (labelID: string): ChannelWithGroupType[] => {
  const channels = useAtomValue(sortedChannelsAtom) ?? []
  const { message: unreadList = [] } = useUnreadCount() ?? {}

  const enriched = useMemo(() => {
    return (channels ?? [])
      .map((channel) => {
        const unread = unreadList.find((u) => u.name === channel.name)
        const user_labels = channel.user_labels ?? []

        return {
          ...channel,
          unread_count: unread?.unread_count ?? channel.unread_count ?? 0,
          last_message_content: unread?.last_message_content ?? channel.last_message_content,
          last_message_sender_name: unread?.last_message_sender_name ?? channel.last_message_sender_name,
          user_labels
        }
      })
      .filter(
        (channel) => Array.isArray(channel.user_labels) && channel.user_labels.some((l) => l.label_id === labelID)
      )
  }, [channels, unreadList, labelID])

  return enriched
}

export const useUpdateChannelLabels = () => {
  const setSortedChannels = useSetAtom(setSortedChannelsAtom)

  const updateChannelLabels = (channelID: string, updateFn: (prevLabels: LabelType[]) => LabelType[]) => {
    setSortedChannels((prev = []) =>
      (prev ?? []).map((channel) =>
        channel.name === channelID
          ? {
              ...channel,
              user_labels: updateFn(Array.isArray(channel.user_labels) ? channel.user_labels : [])
            }
          : channel
      )
    )
  }

  const addLabelToChannel = (channelID: string, newLabel: LabelType) => {
    updateChannelLabels(channelID, (prev) => {
      if (prev.some((l) => l.label_id === newLabel.label_id)) return prev
      return [...prev, newLabel]
    })
  }

  const removeLabelFromChannel = (channelID: string | '*', labelID: string) => {
    if (channelID === '*') {
      setSortedChannels((prev = []) =>
        (prev ?? []).map((channel) => {
          if (!Array.isArray(channel.user_labels)) return channel
          const updatedLabels = channel.user_labels.filter((l) => l.label_id !== labelID)
          return {
            ...channel,
            user_labels: updatedLabels
          }
        })
      )
    } else {
      updateChannelLabels(channelID, (prev) => prev.filter((l) => l.label_id !== labelID))
    }
  }

  const renameLabel = (oldLabelID: string, newLabel: string) => {
    setSortedChannels((prev = []) =>
      (prev ?? []).map((channel) => {
        if (!Array.isArray(channel.user_labels)) return channel
        const updatedLabels = channel.user_labels.map((l) =>
          l.label_id === oldLabelID ? { ...l, label: newLabel } : l
        )
        return {
          ...channel,
          user_labels: updatedLabels
        }
      })
    )
  }

  return {
    updateChannelLabels,
    addLabelToChannel,
    removeLabelFromChannel,
    renameLabel
  }
}
