import useFetchChannelMembers from '@/hooks/fetchers/useFetchChannelMembers'
import { useBoolean } from '@/hooks/useBoolean'
import { UserContext } from '@/utils/auth/UserProvider'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DropdownMenu, Flex, IconButton } from '@radix-ui/themes'
import { useContext, useMemo } from 'react'
import { BiDotsVerticalRounded, BiFile, BiSearch } from 'react-icons/bi'
import { SlSettings } from 'react-icons/sl'
import { TbUsersPlus } from 'react-icons/tb'
import { useParams } from 'react-router-dom'
import AddChannelMembersModal from '../channel-member-details/add-members/AddChannelMembersModal'
import ViewChannelDetailsModal from '../channels/ViewChannelDetailsModal'
import { ViewFilesButton } from '../files/ViewFilesButton'
import { SearchButton } from '../search-channel/SearchButton'

type Props = {
  channelData: ChannelListItem
}

const ICON_SIZE = '16'

const ChannelHeaderMenu = ({ channelData }: Props) => {
  const { channelID } = useParams()

  const { currentUser } = useContext(UserContext)
  const { channelMembers } = useFetchChannelMembers(channelData.name)

  const [isFileOpen, { on: onFileOpen }, onFileChange] = useBoolean(false)
  const [isSearchOpen, { on: onSearchOpen }, onSearchChange] = useBoolean(false)
  const [isAddMembersOpen, { on: onAddMembersOpen }, onAddMembersChange] = useBoolean(false)
  const [isChannelDetailsOpen, { on: onChannelDetailsOpen }, onChannelDetailsChange] = useBoolean(false)
  // const [isMeetingModalOpen, onMeetingModalChange] = useBoolean(false)

  const canAddMembers = useMemo(() => {
    if (channelData.type === 'Open') return false
    if (channelData.is_archived === 1) return false
    if (channelData.is_direct_message === 1) return false

    return channelMembers[currentUser] ? true : false
  }, [channelData, channelMembers, currentUser])

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton color='gray' className='bg-transparent text-gray-12 hover:bg-gray-3'>
            <BiDotsVerticalRounded />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content className='min-w-48'>
          <DropdownMenu.Item onClick={onSearchOpen}>
            <Flex gap='2' align='center'>
              <BiSearch size={ICON_SIZE} />
              Tìm kiếm
            </Flex>
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={onFileOpen}>
            <Flex gap='2' align='center'>
              <BiFile size={ICON_SIZE} />
              Xem tập tin
            </Flex>
          </DropdownMenu.Item>
          {channelData.is_direct_message === 0 && (
            <>
              <DropdownMenu.Separator />
              {canAddMembers && (
                <DropdownMenu.Item onClick={onAddMembersOpen}>
                  <Flex gap='2' align='center'>
                    <TbUsersPlus size={ICON_SIZE} />
                    Thêm thành viên
                  </Flex>
                </DropdownMenu.Item>
              )}

              <DropdownMenu.Item onClick={onChannelDetailsOpen}>
                <Flex gap='2' align='center'>
                  <SlSettings size={ICON_SIZE} />
                  Cài đặt kênh
                </Flex>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <ViewFilesButton open={isFileOpen} setOpen={onFileChange} />
      <SearchButton open={isSearchOpen} setOpen={onSearchChange} />
      <AddChannelMembersModal open={isAddMembersOpen} setOpen={onAddMembersChange} />

      <ViewChannelDetailsModal open={isChannelDetailsOpen} setOpen={onChannelDetailsChange} channelData={channelData} />
    </>
  )
}

export default ChannelHeaderMenu
