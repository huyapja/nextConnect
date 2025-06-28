import { UserAvatar } from '@/components/common/UserAvatar'
import { ChannelMembers } from '@/hooks/fetchers/useFetchChannelMembers'
import { ChannelListItem } from '@/utils/channel/ChannelListProvider'
import { Box, Flex, Text, TextField } from '@radix-ui/themes'
import { useContext, useMemo, useState } from 'react'
import { BiSearch, BiSolidCrown } from 'react-icons/bi'
import { useDebounce } from '../../../hooks/useDebounce'
import { UserContext } from '../../../utils/auth/UserProvider'
import { AddMembersButton } from './add-members/AddMembersButton'
import { UserActionsMenu } from './UserActions/UserActionsMenu'
import { UserFields } from '@/utils/users/UserListProvider'
import clsx from 'clsx'
import { useCombobox, useMultipleSelection } from 'downshift'

interface MemberDetailsProps {
  channelData: ChannelListItem
  channelMembers: ChannelMembers
  activeUsers: string[]
  updateMembers: () => void
  getFilteredUsers?: (selectedUsers: UserFields[], inputValue: string) => UserFields[]
}

export const ChannelMemberDetails = ({
  channelData,
  channelMembers,
  activeUsers,
  updateMembers,
  getFilteredUsers
}: MemberDetailsProps) => {
  const [inputValue, setInputValue] = useState('')
  const debouncedInput = useDebounce(inputValue, 50)

  const { currentUser } = useContext(UserContext)

  const isCurrentMember = useMemo(() => {
    return !!channelMembers[currentUser]
  }, [currentUser, channelMembers])

  const {
    getSelectedItemProps,
    getDropdownProps,
    addSelectedItem,
    removeSelectedItem,
    selectedItems,
    setSelectedItems
  } = useMultipleSelection<UserFields>()

  const items = useMemo(() => {
    if (!getFilteredUsers) return []
    return getFilteredUsers(selectedItems, debouncedInput)
  }, [getFilteredUsers, debouncedInput, selectedItems])

  const { isOpen, getMenuProps, getInputProps, getItemProps, highlightedIndex } = useCombobox<UserFields>({
    inputValue,
    items,
    selectedItem: null,
    onInputValueChange: ({ inputValue }) => {
      setInputValue(inputValue || '')
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) addSelectedItem(selectedItem)
      setInputValue('')
    },
    stateReducer: (state, actionAndChanges) => {
      const { changes, type } = actionAndChanges
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          return {
            ...changes,
            isOpen: true,
            highlightedIndex: 0
          }
        default:
          return changes
      }
    }
  })

  return (
    <Flex direction='column' gap='4' className='h-[66vh] pb-2 sm:h-96'>
      <Flex gap='2' justify='between'>
        <div className='w-full relative'>
          <TextField.Root>
            <TextField.Slot side='left'>
              <BiSearch />
            </TextField.Slot>
            <input
              className='bg-transparent w-full outline-none'
              placeholder='Find members'
              {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
            />
          </TextField.Root>

          <ul
            {...getMenuProps()}
            className={clsx(
              isOpen && items.length > 0
                ? 'absolute sm:w-[550px] w-[24rem] bg-background mt-1 shadow z-[9999] max-h-96 overflow-y-auto border border-gray-3 dark:border-gray-6 rounded-md'
                : 'hidden'
            )}
          >
            {items.map((item, index) => (
              <li
                key={item.name}
                {...getItemProps({ item, index })}
                className={clsx(
                  'px-3 py-2 cursor-pointer flex items-center gap-2',
                  highlightedIndex === index && 'bg-accent-2 dark:bg-accent-8'
                )}
              >
                <UserAvatar src={item.user_image ?? ''} alt={item.full_name} size='2' />
                <div className='flex flex-col'>
                  <Text size='2' weight='medium'>
                    {item.full_name}
                  </Text>
                  <Text size='1' color='gray'>
                    {item.name}
                  </Text>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {isCurrentMember && channelData.type !== 'Open' && channelData.is_archived == 0 && (
          <AddMembersButton channelData={channelData} variant='soft' size='2' />
        )}
      </Flex>

      <MemberList
        channelData={channelData}
        channelMembers={channelMembers}
        activeUsers={activeUsers}
        updateMembers={updateMembers}
        input={debouncedInput}
      />
    </Flex>
  )
}
interface MemberListProps extends MemberDetailsProps {
  input: string
}
const MemberList = ({ channelData, channelMembers, activeUsers, updateMembers, input }: MemberListProps) => {
  const { currentUser } = useContext(UserContext)

  const filteredMembers = useMemo(() => {
    const channelMembersArray = Object.values(channelMembers)
    if (!input) return channelMembersArray

    const i = input.toLowerCase()
    return channelMembersArray.filter((member) => member?.full_name?.toLowerCase().includes(i))
  }, [input, channelMembers])

  return (
    <Box className={'overflow-hidden overflow-y-scroll'}>
      <Flex direction='column' gap='2'>
        {filteredMembers?.length > 0 ? (
          <Flex direction='column'>
            {filteredMembers?.map((member) => (
              <Box key={member.name} className={'hover:bg-slate-3 rounded-md'}>
                <Flex justify='between' className={'pr-3'}>
                  <Flex className={'p-2'} gap='3'>
                    <UserAvatar
                      src={member.user_image ?? ''}
                      alt={member.full_name}
                      size='2'
                      isActive={activeUsers.includes(member.name)}
                      availabilityStatus={member.availability_status}
                    />
                    <Flex gap='2' align={'center'}>
                      <Text size='2' weight='medium'>
                        {member.full_name}
                      </Text>
                      <Flex gap='1'>
                        {member.name === currentUser && (
                          <Text weight='light' size='1'>
                            (You)
                          </Text>
                        )}
                        {channelMembers[member.name]?.is_admin == 1 && (
                          <Flex align='center'>
                            <BiSolidCrown color='#FFC53D' />
                          </Flex>
                        )}
                      </Flex>
                    </Flex>
                  </Flex>
                  {/* if current user is a channel member and admin they can remove users other than themselves if the channel is not open */}
                  {channelMembers[currentUser] &&
                    channelMembers[currentUser].is_admin === 1 &&
                    member.name !== currentUser &&
                    channelData?.type !== 'Open' &&
                    channelData.is_archived == 0 && (
                      <Flex align='center'>
                        <UserActionsMenu
                          channelData={channelData}
                          updateMembers={updateMembers}
                          selectedMember={member}
                        />
                      </Flex>
                    )}
                </Flex>
              </Box>
            ))}
          </Flex>
        ) : (
          <Box className={'text-center h-10'}>
            <Text size='1'>
              No matches found for <strong>{input}</strong>
            </Text>
          </Box>
        )}
      </Flex>
    </Box>
  )
}
