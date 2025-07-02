import { useFrappeEventListener, useSWRConfig } from 'frappe-react-sdk'

export const useAddChannelRealtimeListener = () => {
  const { mutate } = useSWRConfig()

  useFrappeEventListener('raven:new_channel_added', async () => {
    try {
      // Gọi lại SWR để fetch dữ liệu
      mutate('channel_list')
    } catch (err) {
      console.error('Failed to fetch new channel info:', err)
    }
  })
}