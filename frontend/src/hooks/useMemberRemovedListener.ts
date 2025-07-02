import { useFrappeEventListener, useSWRConfig } from 'frappe-react-sdk'

export const useMemberRemovedListener = () => {
  const { mutate } = useSWRConfig()

  useFrappeEventListener('raven:member_removed', (event) => {
    const { channel_id, removed_user } = event || {}

    if (!channel_id || !removed_user) return

    mutate(
      'channel_list',
      (prev: { message: any } | undefined) => {
        if (!prev) return prev
        const { channels, dm_channels } = prev.message

        const newChannels = channels.filter((c: any) => c.name !== channel_id)
        const newDMChannels = dm_channels.filter((c: any) => c.name !== channel_id)

        return {
          message: {
            channels: newChannels,
            dm_channels: newDMChannels
          }
        }
      },
      { revalidate: false }
    )
  })
}