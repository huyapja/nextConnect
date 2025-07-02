import { useFrappeEventListener, useSWRConfig } from 'frappe-react-sdk'

/**
 * Cập nhật danh sách kênh với các trường mới theo channel_id
 */
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

    // Đảm bảo cập nhật cả giá trị rỗng (""), không bỏ qua như trước
    const updatedFields: Record<string, any> = {}
    if (Object.prototype.hasOwnProperty.call(event, 'channel_name')) {
      updatedFields.channel_name = event.channel_name
    }
    if (Object.prototype.hasOwnProperty.call(event, 'group_image')) {
      updatedFields.group_image = event.group_image
    }

    // Nếu không có gì cần cập nhật thì bỏ qua luôn
    if (Object.keys(updatedFields).length === 0) return

    mutate(
      'channel_list',
      (prev: { message: { channels: any[]; dm_channels: any[] } } | undefined) => {
        if (!prev) return prev

        const { channels, dm_channels } = prev.message

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
