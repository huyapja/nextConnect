import { Tabs } from '@radix-ui/themes'
import clsx from 'clsx'

export interface TabConfig {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count: number
}
interface SearchTabsProps {
  tabs: TabConfig[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export const SearchTabs = ({ tabs }: SearchTabsProps) => {
  return (
    <div className='px-6 py-2 border-b border-gray-50 dark:border-gray-800'>
      <Tabs.List className='flex gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-1'>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Tabs.Trigger
              key={tab.key}
              value={tab.key}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
                'hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm',
                'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm',
                'text-gray-600 dark:text-gray-300 cursor-pointer'
              )}
            >
              <Icon className='w-4 h-4' />
              <span>{tab.label}</span>
            </Tabs.Trigger>
          )
        })}
      </Tabs.List>
    </div>
  )
}
