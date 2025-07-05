import { ChannelMembers } from '@/hooks/fetchers/useFetchChannelMembers'
import { useGetUser } from '@/hooks/useGetUser'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { DateMonthYear } from '@/utils/dateConversions'
import { ChannelIcon } from '@/utils/layout/channelIcon'
import { Box, Flex, Separator, Text } from '@radix-ui/themes'
import { useContext, useMemo } from 'react'
import { UserContext } from '../../../utils/auth/UserProvider'
import ChannelPushNotificationToggle from './ChannelPushNotificationToggle'
import { EditDescriptionButton } from './edit-channel-description/EditDescriptionButton'
import { LeaveChannelButton } from './leave-channel/LeaveChannelButton'
import { EditChannelNameButton } from './rename-channel/EditChannelNameButton'
import { groupImageUploadAtom } from './change-image-channel/ImageChannelUpload'
import { useSetAtom } from 'jotai'
import { useParams } from 'react-router-dom'
import { CiCamera } from 'react-icons/ci'
import { CgTrash } from 'react-icons/cg'
import { imageChannelDeleteAtom } from './change-image-channel/ImageChannelDelete'

interface ChannelDetailsProps {
  allowSettingChange?: boolean
  channelData: ChannelListItem
  channelMembers: ChannelMembers
  onClose: () => void
}

export const ChannelDetails = ({ channelData, channelMembers, allowSettingChange, onClose }: ChannelDetailsProps) => {
  const { currentUser } = useContext(UserContext)
  const { channelID: groupID } = useParams()
  const channelOwner = useGetUser(channelData.owner)

  const { channelMember, isAdmin } = useMemo(() => {
    const channelMember = channelMembers[currentUser]
    return {
      channelMember,
      isAdmin: channelMember?.is_admin == 1
    }
  }, [channelMembers, currentUser])

  const setUploadState = useSetAtom(groupImageUploadAtom)
  const setDeleteState = useSetAtom(imageChannelDeleteAtom)

  return (
    <Flex direction='column' gap='4' className={'h-[60vh]'}>
      <Box className={'p-4 rounded-md border border-gray-6'}>
        <Flex align={'center'} justify={'between'}>
          <Text weight='medium' size='2'>
            Ảnh group
          </Text>
          <Flex gap='2' pt='1' align='center'>
            <ChannelIcon groupImage={channelData.group_image} type={channelData.type} size='18' />
            {allowSettingChange && (
              <>
                <CiCamera
                  className='cursor-pointer text-gray-11 hover:text-gray-12'
                  size={16}
                  onClick={() => setUploadState({ open: true, groupID })}
                  title='Cập nhật ảnh đại diện'
                />
                {channelData.group_image && (
                  <CgTrash
                    onClick={() => setDeleteState({ open: true, groupID })}
                    className='cursor-pointer text-gray-11 hover:text-gray-12'
                    title='Xoá ảnh đại diện'
                    size={16}
                  />
                )}
              </>
            )}
          </Flex>
        </Flex>
      </Box>
      <Box className={'p-4 rounded-md border border-gray-6'}>
        <Flex justify={'between'}>
          <Flex direction={'column'}>
            <Text weight='medium' size='2'>
              Tên group
            </Text>
            <Flex gap='1' pt='1' align='center'>
              <ChannelIcon groupImage={channelData.group_image} type={channelData.type} size='14' />
              <Text size='2'>{channelData?.channel_name}</Text>
            </Flex>
          </Flex>
          {allowSettingChange && (
            <EditChannelNameButton
              channelID={channelData.name}
              channel_name={channelData.channel_name}
              className=''
              channelType={channelData.type}
              disabled={channelData.is_archived == 1 && !isAdmin}
            />
          )}
        </Flex>
      </Box>
      {/* Commented out to hide Push Notifications */}
      {/* <ChannelPushNotificationToggle channelID={channelData.name} channelMember={channelMember} /> */}

      <Box className={'p-4 rounded-md border border-gray-6'}>
        <Flex direction='column' gap='4'>
          <Flex justify={'between'}>
            <Flex direction={'column'} gap='1'>
              <Text weight='medium' size='2'>
                Mô tả kênh
              </Text>
              <Text size='1' color='gray'>
                {channelData && channelData.channel_description && channelData.channel_description?.length > 0
                  ? channelData.channel_description
                  : 'Không có mô tả'}
              </Text>
            </Flex>
            {allowSettingChange && (
              <EditDescriptionButton
                channelData={channelData}
                is_in_box={true}
                disabled={channelData.is_archived == 1 && !isAdmin}
              />
            )}
          </Flex>

          <Separator className={'w-full'} />

          <Flex direction={'column'} gap='1'>
            <Text weight='medium' size='2'>
              Được tạo bởi
            </Text>
            <Flex gap='1'>
              {channelData?.owner && <Text size='1'>{channelOwner?.full_name ?? channelData?.owner}</Text>}
              {channelData.creation && (
                <Text size='1' color='gray' as='span'>
                  vào <DateMonthYear date={channelData?.creation} />
                </Text>
              )}
            </Flex>
          </Flex>

          {/* users can only leave channels they are members of */}
          {/* users cannot leave open channels */}
          {channelMember &&
            Object.keys(channelMembers)?.length > 1 &&
            channelData?.type != 'Open' &&
            channelData.is_archived == 0 && (
              <>
                <Separator className={'w-full'} />
                <LeaveChannelButton channelData={channelData} onClose={onClose} />
              </>
            )}
        </Flex>
      </Box>
    </Flex>
  )
}
