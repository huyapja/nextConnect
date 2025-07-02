import { useFrappeEventListener, useSWRConfig } from 'frappe-react-sdk'

function updateChannelFields<T extends { name: string }>(list: T[], channel_id: string, updates: Partial<T>): T[] {
  return list.map((item) =>
    item.name === channel_id
      ? {
          ...item,
          ...updates
        }
      : item
  )
}

export const useUpdateChannelListener = () => {
  const { mutate } = useSWRConfig()

  useFrappeEventListener('channel_updated', (event) => {
    if (!event?.channel_id) return

    mutate(
      'channel_list',
      (prev: { message: any } | undefined) => {
        if (!prev) return prev

        const { channels, dm_channels } = prev.message

        const updatedFields = {
          ...(event.channel_name && { channel_name: event.channel_name }),
          ...(event.group_image && { group_image: event.group_image })
        }

        return {
          message: {
            channels: updateChannelFields(channels, event.channel_id, updatedFields),
            dm_channels: updateChannelFields(dm_channels, event.channel_id, updatedFields)
          }
        }
      },
      { revalidate: false }
    )
  })
}