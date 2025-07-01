import { Drawer, DrawerContent } from '@/components/layout/Drawer'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { DIALOG_CONTENT_CLASS } from '@/utils/layout/dialog'
import { Dialog, VisuallyHidden } from '@radix-ui/themes'
import clsx from 'clsx'
import { Command, defaultFilter } from 'cmdk'
import { atom, useAtom } from 'jotai'
import { useEffect } from 'react'
import ChannelList from './ChannelList'
import './commandMenu.styles.css'
import SettingsList from './SettingsList'
import UserList from './UserList'

export const commandMenuOpenAtom = atom(false)
export const settingsDrawerOpenAtom = atom(false)

const CommandMenu = () => {
  const [open, setOpen] = useAtom(commandMenuOpenAtom)
  const [settingsOpen, setSettingsOpen] = useAtom(settingsDrawerOpenAtom)

  // ⌘K toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const isDesktop = useIsDesktop()

  const onClose = () => {
    setOpen(false)
    setSettingsOpen(false)
  }

  const content = (
    <div className='min-h-[80vh]'>
      <CommandList showSettings={settingsOpen} />
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog.Root open={open || settingsOpen} onOpenChange={onClose}>
        <Dialog.Content className={clsx(DIALOG_CONTENT_CLASS, 'p-4 rounded-md')}>
          <VisuallyHidden>
            <Dialog.Title>Command Menu</Dialog.Title>
            <Dialog.Description>Tìm kiếm hoặc gõ lệnh...</Dialog.Description>
          </VisuallyHidden>
          {content}
        </Dialog.Content>
      </Dialog.Root>
    )
  }

  return (
    <Drawer open={open || settingsOpen} onOpenChange={onClose}>
      <DrawerContent>{content}</DrawerContent>
    </Drawer>
  )
}

export const CommandList = ({ showSettings = false }: { showSettings?: boolean }) => {
  const isDesktop = useIsDesktop()

  const customFilter = (value: string, search: string, keywords?: string[]) => {
    const score = defaultFilter ? defaultFilter(value, search, keywords) : 1
    return score <= 0.1 ? 0 : score
  }

  return (
    <Command label='Global Command Menu' className='command-menu' filter={customFilter}>
      <Command.List>
        {showSettings ? (
          <SettingsList />
        ) : (
          <>
            <Command.Input
              autoFocus={isDesktop}
              placeholder='Tìm kiếm...'
              className='border bg-gray-12 text-white px-3 py-2 rounded w-full'
            />
            <ChannelList />
            <UserList />
          </>
        )}
        <Command.Empty>Không tìm thấy kết quả tìm kiếm</Command.Empty>
      </Command.List>
    </Command>
  )
}

export default CommandMenu
