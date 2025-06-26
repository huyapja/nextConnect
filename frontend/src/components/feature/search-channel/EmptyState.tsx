import { BiSearch } from 'react-icons/bi'

interface EmptyStateProps {
  type: 'no-search' | 'no-results'
}

export const EmptyState = ({ type }: EmptyStateProps) => {
  return (
    <div className='text-center py-12'>
      <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4'>
        <BiSearch className='w-8 h-8 text-gray-400 dark:text-gray-500' />
      </div>
      {type === 'no-search' ? (
        <>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>Start searching</h3>
          <p className='text-gray-500 dark:text-gray-400 max-w-sm mx-auto'>
            Type in the search box above to find messages, documents, files, and more across your workspace.
          </p>
        </>
      ) : (
        <>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>No results found</h3>
          <p className='text-gray-500 dark:text-gray-400'>
            Try adjusting your search terms or browse different categories.
          </p>
        </>
      )}
    </div>
  )
}
