// SearchPanel.tsx
import { Tabs } from '@radix-ui/themes'
import { useState } from 'react'
import { BiFolder, BiImage, BiLink, BiMessageRounded } from 'react-icons/bi'
import { useParams } from 'react-router-dom'
import { EmptyState } from './EmptyState'
import { SearchHeader } from './SearchHeader'
import { SearchResults } from './SearchResults'
import { SearchTabs, TabConfig } from './SearchTabs'
import { useSearchResults } from './useSearchResults'

const TABS: TabConfig[] = [
  { key: 'Messages', label: 'Messages', icon: BiMessageRounded, count: 0 },
  { key: 'Files', label: 'Files', icon: BiFolder, count: 0 },
  { key: 'Images & Videos', label: 'Media', icon: BiImage, count: 0 },
  { key: 'Links', label: 'Links', icon: BiLink, count: 0 }
]

export const SearchPanel = () => {
  const { channelID } = useParams<{ channelID: string }>()
  const [activeTab, setActiveTab] = useState('Messages')
  const [searchQuery, setSearchQuery] = useState('')

  const { results, isLoading, error } = useSearchResults(activeTab, searchQuery, channelID)

  return (
    <div className='flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden'>
      <SearchHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className='flex-1 flex flex-col min-h-0'>
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className='flex-1 flex flex-col min-h-0'>
          <div className='flex-shrink-0'>
            <SearchTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          <div className='flex-1 overflow-y-auto min-h-0'>
            <div className='p-6'>
              {isLoading ? (
                <div className='text-sm text-gray-500 dark:text-gray-400'>Loading...</div>
              ) : error ? (
                <div className='text-sm text-red-500'>Error: {error.message}</div>
              ) : !results || results.length === 0 ? (
                <EmptyState type={searchQuery ? 'no-results' : 'no-search'} />
              ) : (
                <SearchResults results={results} activeTab={activeTab} />
              )}
            </div>
          </div>
        </Tabs.Root>
      </div>
    </div>
  )
}
