import { Loader } from '@/components/common/Loader'
import { useDebounce } from '@/hooks/useDebounce'
import { Tabs } from '@radix-ui/themes'
import { useState } from 'react'
import { BiFolder, BiImage, BiLink, BiMessageRounded } from 'react-icons/bi'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useParams } from 'react-router-dom'
import { EmptyState } from './EmptyState'
import { SearchHeader } from './SearchHeader'
import { SearchResults } from './SearchResults'
import { SearchTabs, TabConfig } from './SearchTabs'
import { useSearchResults } from './useSearchResults'

const TABS: TabConfig[] = [
  { key: 'Messages', label: 'Tin nhắn', icon: BiMessageRounded, count: 0 },
  { key: 'Files', label: 'Tệp', icon: BiFolder, count: 0 },
  { key: 'Images & Videos', label: 'Ảnh', icon: BiImage, count: 0 },
  { key: 'Links', label: 'Liên kết', icon: BiLink, count: 0 }
]

export const SearchPanel = ({ onClose }: { onClose: () => void }) => {
  const { channelID } = useParams<{ channelID: string }>()
  const [activeTab, setActiveTab] = useState('Messages')
  const [searchQuery, setSearchQuery] = useState('')

  const debouncedQuery = useDebounce(searchQuery, 500)
  const { results, isLoading, error, loadMore, hasMore } = useSearchResults(activeTab, debouncedQuery, channelID)

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <SearchHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* ✅ Tabs & Content */}
      <div className='flex-1 flex flex-col min-h-0'>
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className='flex-1 flex flex-col min-h-0'>
          <div className='flex-shrink-0'>
            <SearchTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* ✅ Scroll container with fixed height & overflow */}
          <div
            id='search-scroll-container'
            className='flex-1 overflow-y-auto min-h-0 h-full'
            style={{ height: '100%' }} // 💡 đảm bảo scroll height tồn tại
          >
            <div className='sm:p-4 lg:p-6'>
              {isLoading && results.length === 0 ? (
                <div className='flex items-center justify-center py-8'>
                  <div className='text-sm text-gray-500 dark:text-gray-400'>Searching...</div>
                </div>
              ) : error ? (
                <div className='text-sm text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg'>
                  Error: {error.message}
                </div>
              ) : !results || results.length === 0 ? (
                <EmptyState type={searchQuery ? 'no-results' : 'no-search'} />
              ) : (
                <InfiniteScroll
                  dataLength={results.length}
                  next={loadMore}
                  hasMore={hasMore}
                  loader={
                    <div className='text-xs text-center text-gray-400'>
                      <Loader />
                    </div>
                  }
                  scrollableTarget='search-scroll-container' // ✅ đúng target
                  scrollThreshold={0.9}
                >
                  <SearchResults results={results} activeTab={activeTab} onClose={onClose} />
                </InfiniteScroll>
              )}
            </div>
          </div>
        </Tabs.Root>
      </div>
    </div>
  )
}
