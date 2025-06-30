import { Label } from '@/components/common/Form'
import { UserAvatar } from '@/components/common/UserAvatar'
import { HStack } from '@/components/layout/Stack'
import useFetchChannelMembers from '@/hooks/fetchers/useFetchChannelMembers'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { UserFields, UserListContext } from '@/utils/users/UserListProvider'
import { Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useContext, useMemo, useState } from 'react'
import { useFetchWorkspaceMembers } from '../workspaces/WorkspaceMemberManagement'

interface AddMembersDropdownProps {
  channelID: string
  label?: string
  selectedUsers: UserFields[]
  setSelectedUsers: (users: UserFields[]) => void
  workspaceID: string
}

const AddMembersDropdown = ({
  channelID,
  workspaceID,
  label = 'Chọn thành viên',
  selectedUsers,
  setSelectedUsers
}: AddMembersDropdownProps) => {
  const users = useContext(UserListContext)
  const isDesktop = useIsDesktop()

  const { channelMembers } = useFetchChannelMembers(channelID)
  const { data: workspaceMembers } = useFetchWorkspaceMembers(workspaceID)

  const removeVietnameseTones = (str: string): string =>
    str
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  const nonChannelMembers = useMemo(() => {
    if (!users.enabledUsers || !channelMembers || !workspaceMembers?.message) return []

    const workspaceUserSet = new Set(workspaceMembers.message.map((m) => m.user))
    return users.enabledUsers.filter((user) => workspaceUserSet.has(user.name) && !channelMembers[user.name])
  }, [users.enabledUsers, channelMembers, workspaceMembers])

  const getFilteredUsers = (inputValue: string) => {
    const keyword = removeVietnameseTones(inputValue)
    return nonChannelMembers.filter((user) => {
      const fullName = removeVietnameseTones(user.full_name)
      const username = removeVietnameseTones(user.name)
      return fullName.includes(keyword) || username.includes(keyword)
    })
  }

  const [inputValue, setInputValue] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!isComposing) setInputValue(value)
  }

  const items = useMemo(() => getFilteredUsers(inputValue), [inputValue, nonChannelMembers])

  const { isOpen, getLabelProps, getMenuProps, highlightedIndex, getItemProps, getInputProps } = useCombobox({
    items,
    itemToString: (item) => item?.name ?? '',
    defaultHighlightedIndex: 0,
    selectedItem: null,
    inputValue,
    onStateChange() {}
  })

  const inputProps = getInputProps({
    value: inputValue,
    onChange: handleInputChange,
    onCompositionStart: () => setIsComposing(true),
    onCompositionEnd: () => {
      setIsComposing(false)
      setInputValue((prev) => prev)
    }
  })

  return (
    <div className='w-full'>
      <div className='flex flex-col gap-1'>
        <Label className='w-fit' {...getLabelProps()}>
          {label}
        </Label>

        <input
          type='text'
          placeholder='Nhập để tìm...'
          autoFocus={isDesktop}
          className='w-90 border border-gray-300 focus:outline-none focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2 rounded-md text-sm transition duration-150 ease-in-out'
          {...inputProps}
        />

        <div className='inline-flex gap-1 p-1 items-center flex-wrap'>
          {selectedUsers?.map((selectedItemForRender, index) => (
            <span
              className='rt-Button rt-BaseButton rt-variant-surface rt-r-size-2 flex items-center'
              key={`selected-item-${index}`}
            >
              <UserAvatar
                src={selectedItemForRender.user_image ?? ''}
                alt={selectedItemForRender.full_name}
                size='1'
                variant='solid'
                color='gray'
              />
              <Text size='2'>{selectedItemForRender.full_name}</Text>
              <span
                className='cursor-pointer ml-1'
                onClick={() => {
                  setSelectedUsers(selectedUsers.filter((o) => o.name !== selectedItemForRender.name))
                }}
              >
                &#10005;
              </span>
            </span>
          ))}
        </div>
      </div>

      <ul
        className={`sm:w-[550px] w-[24rem] absolute bg-background rounded-b-md mt-1 shadow-md z-[999] max-h-96 overflow-scroll p-0 ${
          !(isOpen && items?.length) && 'hidden'
        }`}
        {...getMenuProps()}
      >
        {isOpen &&
          items?.map((item, index) => {
            return (
              <li
                className={clsx(
                  highlightedIndex === index && 'bg-accent-4',
                  'py-2 px-3 shadow-sm flex gap-2 items-center cursor-pointer'
                )}
                key={`${item.name}`}
                {...getItemProps({ item, index })}
                onClick={(e) => {
                  e.preventDefault()
                  const isChecked = selectedUsers.some((o) => o.name === item.name)
                  if (isChecked) {
                    setSelectedUsers(selectedUsers.filter((o) => o.name !== item.name))
                  } else {
                    setSelectedUsers([...selectedUsers, item])
                  }
                }}
              >
                <input
                  type='checkbox'
                  checked={selectedUsers.some((o) => o.name === item.name)}
                  onChange={(e) => {
                    const checked = e.target.checked
                    if (checked) {
                      setSelectedUsers([...selectedUsers, item])
                    } else {
                      setSelectedUsers(selectedUsers.filter((o) => o.name !== item.name))
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />

                <HStack gap='2' align='center'>
                  <UserAvatar src={item.user_image ?? ''} alt={item.full_name} size='2' />
                  <div className='flex flex-col'>
                    <Text as='span' weight='medium' size='2'>
                      {item.full_name}
                    </Text>
                    <Text as='span' size='1'>
                      {item.name}
                    </Text>
                  </div>
                </HStack>
              </li>
            )
          })}
      </ul>
    </div>
  )
}

export default AddMembersDropdown
