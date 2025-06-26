// hooks/useSearchResults.ts
import { useFrappeGetCall } from 'frappe-react-sdk'

interface SearchParams {
  filter_type: string
  search_text?: string
  from_user?: string
  in_channel?: string
  saved?: boolean | string
  date?: string
  file_type?: string
  message_type?: string
  channel_type?: string
  my_channel_only?: boolean | string
  limit?: number
  offset?: number
  channelId?: string
}

export const useSearchResults = (tab: string, searchQuery: string, channelId?: string) => {
  const getFilterConfig = (tab: string): Partial<SearchParams> => {
    switch (tab) {
      case 'Messages':
        return { filter_type: 'Message', message_type: 'Text' }
      case 'Files':
        return { filter_type: 'File' }
      case 'Images & Videos':
        return { filter_type: 'Media', file_type: 'image' }
      case 'Links':
        return { filter_type: 'Links', message_type: 'Link' }
      default:
        return { filter_type: 'Message' }
    }
  }

  const filters: SearchParams | Partial<SearchParams> = {
    ...getFilterConfig(tab),
    search_text: searchQuery,
    in_channel: channelId,
    limit: 20,
    offset: 0
  }

  const { data, isLoading, error } = useFrappeGetCall('raven.api.search.get_search_result', filters)

  return {
    results: data?.message || [],
    isLoading,
    error
  }
}
