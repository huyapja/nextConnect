import { Loader } from '@/components/common/Loader'
import { Drawer, DrawerContent } from '@/components/layout/Drawer'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { DIALOG_CONTENT_CLASS } from '@/utils/layout/dialog'
import { Dialog, Flex } from '@radix-ui/themes'
import { Suspense } from 'react'
import { SearchPanel } from './SearchPanel'

export const SearchButton = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content
          className={`${DIALOG_CONTENT_CLASS} min-w-[56rem] max-w-[64rem] h-[80vh] max-h-[600px] p-0 overflow-hidden`}
          style={{
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            border: 'none'
          }}
        >
          <Suspense
            fallback={
              <Flex align='center' justify='center' className='h-full bg-white dark:bg-gray-900'>
                <div className='text-center'>
                  <Loader />
                  <p className='text-sm text-gray-500 dark:text-gray-400 mt-3'>Loading search...</p>
                </div>
              </Flex>
            }
          >
            <SearchPanel />
          </Suspense>
        </Dialog.Content>
      </Dialog.Root>
    )
  } else {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className='h-[85vh] max-h-[600px]'>
          <Suspense
            fallback={
              <Flex align='center' justify='center' className='h-full bg-white dark:bg-gray-900'>
                <div className='text-center'>
                  <Loader />
                  <p className='text-sm text-gray-500 dark:text-gray-400 mt-3'>Loading search...</p>
                </div>
              </Flex>
            }
          >
            <SearchPanel />
          </Suspense>
        </DrawerContent>
      </Drawer>
    )
  }
}
