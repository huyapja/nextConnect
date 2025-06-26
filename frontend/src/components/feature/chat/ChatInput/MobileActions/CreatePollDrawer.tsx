import { Loader } from '@/components/common/Loader'
import { Drawer, DrawerContent } from '@/components/layout/Drawer'
import { Dialog } from '@radix-ui/themes'
import { Suspense, lazy } from 'react'

const CreatePollContent = lazy(() => import('@/components/feature/polls/CreatePoll'))

const CreatePollDrawer = ({
  isOpen,
  setIsOpen,
  channelID
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  channelID: string
}) => {
  const onClose = () => {
    setIsOpen(false)
  }

  return (
    <Drawer open={isOpen} onClose={onClose}>
      <DrawerContent>
        <div className='pb-16 min-h-64 px-1 overflow-auto'>
          <Dialog.Title>Tạo cuộc bình chọn</Dialog.Title>
          <Dialog.Description size='2'>
            Tạo một cuộc bình chọn nhanh để lấy ý kiến của mọi người về một chủ đề.
          </Dialog.Description>
          <Suspense fallback={<Loader />}>
            <CreatePollContent setIsOpen={setIsOpen} channelID={channelID} />
          </Suspense>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default CreatePollDrawer
