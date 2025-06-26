import { Tabs } from '@radix-ui/themes'
import { useMemo, useState } from 'react'
import { BiFolder, BiImage, BiLink, BiMessageRounded } from 'react-icons/bi'
import { HiOutlineDocumentText } from 'react-icons/hi'
import { EmptyState } from './EmptyState'
import { SearchHeader } from './SearchHeader'
import { SearchResults } from './SearchResults'
import { SearchTabs, TabConfig } from './SearchTabs'

const TABS: TabConfig[] = [
  { key: 'Messages', label: 'Messages', icon: BiMessageRounded, count: 2 },
  { key: 'Docs', label: 'Documents', icon: HiOutlineDocumentText, count: 2 },
  { key: 'Files', label: 'Files', icon: BiFolder, count: 2 },
  { key: 'Images & Videos', label: 'Media', icon: BiImage, count: 2 },
  { key: 'Links', label: 'Links', icon: BiLink, count: 2 }
]

// Mock data - move to separate file or context
const MOCK_DATA = {
  Messages: [
    {
      id: 1,
      sender: 'Alice Johnson',
      content: 'Meeting at 10am tomorrow for project review',
      time: '2 hours ago',
      avatar: 'AJ',
      channel: '#general'
    },
    {
      id: 2,
      sender: 'Bob Smith',
      content: 'Could you please check the Q3 report when you have a moment?',
      time: '1 day ago',
      avatar: 'BS',
      channel: '#development'
    }
  ],
  Docs: [
    {
      id: 1,
      title: 'Q3 Project Planning Document',
      excerpt: 'Comprehensive overview of project goals, timeline, and resource allocation for the third quarter',
      lastModified: '2 days ago',
      author: 'Sarah Wilson',
      type: 'Document'
    },
    {
      id: 2,
      title: 'Employee Onboarding Guide 2024',
      excerpt: 'Complete guide for new team members including company policies, tools, and procedures',
      lastModified: '1 week ago',
      author: 'HR Team',
      type: 'Guide'
    }
  ],
  Files: [
    {
      id: 1,
      name: 'Q3_Budget_Analysis.xlsx',
      size: '2.4 MB',
      type: 'Excel',
      uploadedBy: 'Finance Team',
      uploadDate: '3 days ago'
    },
    {
      id: 2,
      name: 'Company_Logo_2024.svg',
      size: '185 KB',
      type: 'Vector',
      uploadedBy: 'Design Team',
      uploadDate: '1 week ago'
    }
  ],
  'Images & Videos': [
    {
      id: 1,
      name: 'Team_Retreat_2024.jpg',
      type: 'Image',
      size: '4.2 MB',
      dimensions: '1920x1080',
      uploadDate: '5 days ago'
    },
    {
      id: 2,
      name: 'Product_Demo_Final.mp4',
      type: 'Video',
      size: '125 MB',
      duration: '12:34',
      uploadDate: '2 days ago'
    }
  ],
  Links: [
    {
      id: 1,
      url: 'https://notion.so/project-planning',
      label: 'Project Planning - Notion Workspace',
      description: 'Main project planning and documentation hub',
      sharedBy: 'Project Manager',
      sharedDate: '1 day ago'
    },
    {
      id: 2,
      url: 'https://github.com/company/main-repo',
      label: 'Main Repository - GitHub',
      description: 'Primary codebase for the application',
      sharedBy: 'Development Team',
      sharedDate: '3 days ago'
    }
  ]
} as any

export const SearchPanel = () => {
  const [activeTab, setActiveTab] = useState('Messages')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_DATA[activeTab]

    const lowerQuery = searchQuery.toLowerCase()
    return MOCK_DATA[activeTab].filter((item: any) =>
      Object.values(item).some((val) => typeof val === 'string' && val.toLowerCase().includes(lowerQuery))
    )
  }, [activeTab, searchQuery])

  const hasSearch = Boolean(searchQuery.trim())
  const hasResults = filteredResults.length > 0

  return (
    <div className='flex flex-col h-full bg-white dark:bg-gray-900'>
      <SearchHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className='flex-1 flex flex-col'>
        <SearchTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className='flex-1 overflow-y-auto'>
          <div className='p-6'>
            {!hasSearch ? (
              <EmptyState type='no-search' />
            ) : !hasResults ? (
              <EmptyState type='no-results' />
            ) : (
              <SearchResults results={filteredResults} activeTab={activeTab} />
            )}
          </div>
        </div>
      </Tabs.Root>
    </div>
  )
}
