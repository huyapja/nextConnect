import { useFrappeGetCall } from 'frappe-react-sdk'
import { useEffect, useState } from 'react'

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
  const PAGE_SIZE = 10
  const [offset, setOffset] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const getFilterConfig = (tab: string): Partial<SearchParams> => {
    switch (tab) {
      case 'Messages':
        return { filter_type: 'Message', message_type: 'Text' }
      case 'Files':
        return { filter_type: 'File' }
      case 'Images & Videos':
        return { filter_type: 'Media', file_type: 'image' }
      case 'Links':
        return { filter_type: 'Link', message_type: 'Text' }
      default:
        return { filter_type: 'Message' }
    }
  }

  const filters: SearchParams | Partial<SearchParams> = {
    ...getFilterConfig(tab),
    search_text: searchQuery,
    in_channel: channelId,
    limit: PAGE_SIZE,
    offset
  }

  // reset when search query or tab changes
  useEffect(() => {
    setOffset(0)
    setResults([])
    setHasMore(true)
  }, [searchQuery, tab])

  const { data, isLoading, error } = useFrappeGetCall('raven.api.search.get_search_result', filters)

  useEffect(() => {
    if (data?.message) {
      const newData = data.message
      if (offset === 0) {
        setResults(newData)
      } else {
        setResults((prev) => [...prev, ...newData])
      }
      if (newData.length < PAGE_SIZE) {
        setHasMore(false)
      }
    }
  }, [data])

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }

  return {
    results,
    isLoading,
    error,
    loadMore,
    hasMore
  }
}
