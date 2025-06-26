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

export const SearchTabs = ({ tabs, onTabChange }: SearchTabsProps) => {
  return (
    <div className='px-3 sm:px-4 lg:px-6 py-2 border-b border-gray-50 dark:border-gray-800'>
      <div className='overflow-x-auto'>
        <Tabs.List className='flex gap-1 min-w-max sm:min-w-0'>
          {tabs.map((tab) => {
            const Icon = tab.icon

            return (
              <Tabs.Trigger
                key={tab.key}
                value={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={clsx(
                  'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2',
                  'text-xs sm:text-sm font-medium rounded-lg transition-all duration-200',
                  'whitespace-nowrap flex-shrink-0',
                  'cursor-pointer select-none'
                )}
              >
                <Icon className='w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mr-2' />
                <span className='hidden xs:block sm:hidden lg:block'>{tab.label}</span>
              </Tabs.Trigger>
            )
          })}
        </Tabs.List>
      </div>
    </div>
  )
}
