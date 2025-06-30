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
import ToggleThemeCommand from './ToggleThemeCommand'
import UserList from './UserList'

export const commandMenuOpenAtom = atom(false)

const CommandMenu = () => {
  const [open, setOpen] = useAtom(commandMenuOpenAtom)

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content className={clsx(DIALOG_CONTENT_CLASS, 'p-4 rounded-md')}>
          <VisuallyHidden>
            <Dialog.Title>Command Menu</Dialog.Title>
            <Dialog.Description>Tìm kiếm hoặc gõ lệnh...</Dialog.Description>
          </VisuallyHidden>
          <CommandList />
        </Dialog.Content>
      </Dialog.Root>
    )
  } else {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className='min-h-[80vh]'>
            <CommandList />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }
}

export const CommandList = () => {
  const isDesktop = useIsDesktop()

  /** Use a custom filter instead of the default one - ignore very low scores in results */
  const customFilter = (value: string, search: string, keywords?: string[]) => {
    const score = defaultFilter ? defaultFilter(value, search, keywords) : 1

    if (score <= 0.1) {
      return 0
    }
    return score
  }

  return (
    <Command label='Global Command Menu' className='command-menu' filter={customFilter}>
      <Command.Input autoFocus={isDesktop} placeholder='Tìm kiếm hoặc gõ lệnh...' />
      <Command.List>
        <Command.Empty>Không tìm thấy kết quả tìm kiếm</Command.Empty>
        <ChannelList />
        <UserList />
        {/* <SettingsList /> */}
        <Command.Group heading='Commands'>
          <ToggleThemeCommand />
        </Command.Group>
      </Command.List>
    </Command>
  )
}

export default CommandMenu
