import { Drawer, DrawerContent } from '@/components/layout/Drawer'
import useFetchActiveUsers from '@/hooks/fetchers/useFetchActiveUsers'
import useFetchChannelMembers from '@/hooks/fetchers/useFetchChannelMembers'
import { useIsDesktop, useIsMobile } from '@/hooks/useMediaQuery'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { DIALOG_CONTENT_CLASS } from '@/utils/layout/dialog'
import { Box, Dialog, Flex, Tabs, Text } from '@radix-ui/themes'
import { useCallback, useContext, useMemo } from 'react'
import { UserContext } from '../../../utils/auth/UserProvider'
import { ChannelDetails } from '../channel-details/ChannelDetails'
import { ChannelMemberDetails } from '../channel-member-details/ChannelMemberDetails'
import { ChannelSettings } from '../channel-settings/ChannelSettings'
import { useFetchWorkspaceMembers } from '../workspaces/WorkspaceMemberManagement'
import { UserFields, UserListContext } from '@/utils/users/UserListProvider'
import { GroupImageUploadManager } from '../channel-details/change-image-channel/ImageChannelUpload'
import { ImageChannelDelete } from '../channel-details/change-image-channel/ImageChannelDelete'

interface ViewChannelDetailsModalContentProps {
  open: boolean
  setOpen: (open: boolean) => void
  channelData: ChannelListItem
  defaultTab?: string
}

const ViewChannelDetailsModal = ({ open, setOpen, channelData, defaultTab }: ViewChannelDetailsModalContentProps) => {
  const isDesktop = useIsDesktop()
  const isMobile = useIsMobile()

  return (
    <>
      {isDesktop ? (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Content className={DIALOG_CONTENT_CLASS}>
            <ViewChannelDetailsModalContent
              open={open}
              setOpen={setOpen}
              channelData={channelData}
              defaultTab={defaultTab}
            />
          </Dialog.Content>
        </Dialog.Root>
      ) : isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <ViewChannelDetailsModalContent
              open={open}
              setOpen={setOpen}
              channelData={channelData}
              defaultTab={defaultTab}
            />
          </DrawerContent>
        </Drawer>
      ) : null}

      <GroupImageUploadManager />
      <ImageChannelDelete />
    </>
  )
}
export default ViewChannelDetailsModal

const ViewChannelDetailsModalContent = ({
  setOpen,
  channelData,
  defaultTab = 'About'
}: ViewChannelDetailsModalContentProps) => {
  const { data } = useFetchActiveUsers()

  const activeUsers = data?.message ?? []

  const { channelMembers, mutate: updateMembers } = useFetchChannelMembers(channelData.name)
  const { data: workspaceMembers } = useFetchWorkspaceMembers(channelData.workspace as string)

  const memberCount = Object.keys(channelMembers)?.length
  const { currentUser } = useContext(UserContext)
  const type = channelData.type

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  // channel settings are only available for admins
  const allowSettingChange = channelMembers[currentUser]?.is_admin == 1 || false

  const users = useContext(UserListContext)

  //Options for dropdown
  const nonChannelMembers = useMemo(() => {
    // console.log(workspaceMembers)

    // Only workspace members are eligible to be added to the channel
    const eligibleUsers: { [key: string]: string } = {}
    workspaceMembers?.message?.forEach((m) => {
      eligibleUsers[m.user] = m.name
    })

    // Filter out users that are already in the channel and are eligible to be added
    return users.enabledUsers?.filter((m: UserFields) => !channelMembers?.[m.name] && eligibleUsers[m.name]) ?? []
  }, [users.enabledUsers, channelMembers, workspaceMembers])

  /** Function to filter users */
  const getFilteredUsers = useCallback(
    (selectedUsers: UserFields[], inputValue: string) => {
      const lowerCasedInputValue = inputValue.toLowerCase()

      return nonChannelMembers.filter((user) => {
        if (selectedUsers.some((u) => u.name === user.name)) return false
        if (inputValue === '') return true // không lọc gì cả

        return (
          user.full_name.toLowerCase().includes(lowerCasedInputValue) ||
          user.name.toLowerCase().includes(lowerCasedInputValue)
        )
      })
    },
    [nonChannelMembers]
  )
  return (
    <>
      <Dialog.Title>
        <Flex align='center' gap='2'>
          <ChannelIcon groupImage={channelData.group_image} className={'mt-1'} type={type} />
          <Text>{channelData.channel_name}</Text>
        </Flex>
      </Dialog.Title>

      <Tabs.Root defaultValue={defaultTab}>
        <Flex direction={'column'} gap='4'>
          <Tabs.List>
            <Tabs.Trigger className='cursor-pointer' value='About'>
              Thông tin
            </Tabs.Trigger>
            <Tabs.Trigger className='cursor-pointer' value='Members'>
              <Flex gap='2'>
                <Text>Thành viên</Text>
                <Text>{memberCount}</Text>
              </Flex>
            </Tabs.Trigger>
            <Tabs.Trigger className='cursor-pointer' value='Settings'>
              Cài đặt
            </Tabs.Trigger>
          </Tabs.List>
          <Box>
            <Tabs.Content value='About'>
              <ChannelDetails
                channelData={channelData}
                channelMembers={channelMembers}
                onClose={onClose}
                allowSettingChange={allowSettingChange}
              />
            </Tabs.Content>
            <Tabs.Content value='Members'>
              <ChannelMemberDetails
                channelData={channelData}
                channelMembers={channelMembers}
                activeUsers={activeUsers}
                updateMembers={updateMembers}
              />
            </Tabs.Content>
            <Tabs.Content value='Settings'>
              <ChannelSettings channelData={channelData} onClose={onClose} allowSettingChange={allowSettingChange} />
            </Tabs.Content>
          </Box>
        </Flex>
      </Tabs.Root>
    </>
  )
}