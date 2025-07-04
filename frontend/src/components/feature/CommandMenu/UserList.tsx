import { Loader } from '@/components/common/Loader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import { useGetUser } from '@/hooks/useGetUser'
import { useChannelList } from '@/utils/channel/ChannelListProvider'
import { UserListContext } from '@/utils/users/UserListProvider'
import { Badge, Flex } from '@radix-ui/themes'
import { Command } from 'cmdk'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useSetAtom } from 'jotai'
import { useContext } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { commandMenuOpenAtom } from './CommandMenu'
import DMChannelItem from './DMChannelItem'

const UserList = () => {
  const { dm_channels } = useChannelList()

  const { users } = useContext(UserListContext)

  const usersWithoutChannels = users?.filter(
    (user) => !dm_channels.find((channel) => channel.peer_user_id === user.name)
  )
  const filteredDmChannels = dm_channels?.filter((channel) => {
    const peerUser = users?.find((user) => user.name === channel.peer_user_id)
    return peerUser?.enabled === 1
  })

  return (
    <Command.Group heading='Members'>
      {filteredDmChannels?.map((channel) => (
        <DMChannelItem
          key={channel.name}
          channelID={channel.name}
          channelName={channel.channel_name}
          peer_user_id={channel.peer_user_id}
        />
      ))}
      {usersWithoutChannels?.map((user) => <UserWithoutDMItem key={user.name} userID={user.name} />)}
    </Command.Group>
  )
}

const UserWithoutDMItem = ({ userID }: { userID: string }) => {
  const { workspaceID } = useParams()

  const user = useGetUser(userID)
  const navigate = useNavigate()
  const setOpen = useSetAtom(commandMenuOpenAtom)
  const { call, loading } = useFrappePostCall<{ message: string }>(
    'raven.api.raven_channel.create_direct_message_channel'
  )

  const onSelect = () => {
    call({
      user_id: userID
    })
      .then((res) => {
        if (workspaceID) {
          navigate(`/${workspaceID}/${res?.message}`)
        } else {
          navigate(`/channel/${res?.message}`)
        }

        setOpen(false)
      })
      .catch((err) => {
        toast.error('Could not create a DM channel', {
          description: getErrorMessage(err)
        })
      })
  }

  return (
    <Command.Item keywords={[user?.full_name ?? userID]} value={userID} onSelect={onSelect}>
      <Flex width='100%' justify={'between'} align='center'>
        <Flex gap='2' align='center'>
          <UserAvatar src={user?.user_image} isBot={user?.type === 'Bot'} alt={user?.full_name ?? userID} />
          {user?.full_name}
        </Flex>
        {loading ? <Loader /> : null}
        {!user?.enabled ? (
          <Badge color='gray' variant='soft'>
            Disabled
          </Badge>
        ) : null}
      </Flex>
    </Command.Item>
  )
}

export default UserList
