import { useFrappeGetCall } from 'frappe-react-sdk'

export type ChannelDetail = {
  name: string
  channel_name: string
  is_direct_message: number
  is_group: number
  is_private: number
  creation: string
  last_message_timestamp: string
  group_type: 'dm' | 'channel'
  last_message_content: string
  last_message_sender_name: string
  user_labels: { label_id: string; label: string }[]
}

const useChannelDetail = (channelID?: string) => {
  const { data, mutate, error, isValidating } = useFrappeGetCall<{ message: ChannelDetail }>(
    'raven.api.raven_channel.get_channel_info',
    { channel_id: channelID },
    ['channel_detail', channelID],
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      revalidateOnReconnect: true
    }
  )

  return {
    channelDetail: data?.message,
    mutate,
    error,
    isLoading: isValidating && !data
  }
}

export default useChannelDetail
