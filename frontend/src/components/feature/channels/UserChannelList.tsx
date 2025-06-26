import { Loader } from '@/components/common/Loader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { getErrorMessage } from '@/components/layout/AlertBanner/ErrorBanner'
import { useGetUser } from '@/hooks/useGetUser'
import { useChannelList } from '@/utils/channel/ChannelListProvider'
import { UserListContext } from '@/utils/users/UserListProvider'
import { Badge, Box, Flex, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useContext } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import ChannelItem from './ChannelItem'
import { useIsUserActive } from '@/hooks/useIsUserActive'

const UserChannelList = () => {
  const { dm_channels } = useChannelList()
  const { enabledUsers: users } = useContext(UserListContext)

  const peerIds = new Set(dm_channels?.map((c) => c.peer_user_id))

  const usersWithoutChannels = []
  for (const user of users || []) {
    const hasChannel = peerIds.has(user.name)
    const isBot = user.type?.toLowerCase?.() === 'bot'
    if (!hasChannel && !isBot) {
      usersWithoutChannels.push(user)
    }
  }

  const filteredDmChannels = []
  for (const channel of dm_channels || []) {
    const peerUser = users?.find((u) => u.name === channel.peer_user_id)
    if (peerUser?.enabled === 1 && peerUser?.type?.toLowerCase?.() !== 'bot') {
      filteredDmChannels.push(channel)
    }
  }

  const botDmChannels = dm_channels?.filter((channel) => {
    const peerUser = users?.find((user) => user.name === channel.peer_user_id)
    return peerUser && peerUser.type?.toLowerCase() === 'bot'
  })

  const botUsersWithoutChannels = users?.filter((user) => user.type?.toLowerCase() === 'bot' && !peerIds.has(user.name))

  const bots = [...(botDmChannels ?? []), ...(botUsersWithoutChannels ?? [])]

  return (
    <div>
      <div>
        {filteredDmChannels.map((channel) => (
          <ChannelItem
            key={channel.name}
            channelID={channel.name}
            channelName={channel.channel_name}
            peer_user_id={channel.peer_user_id}
          />
        ))}
        <br />
        {usersWithoutChannels.length > 0 && <h5 className='text-sm mt-0 font-medium'>Những người chưa từng nhắn</h5>}
        {usersWithoutChannels.map((user) => (
          <UserWithoutDMItem key={user.name} userID={user.name} />
        ))}

        {bots.length > 0 && (
          <>
            <h5 className={`text-sm ${usersWithoutChannels.length > 0 ? 'mt-5' : 'mt-0'} font-medium`}>Bot</h5>
            {bots.map((item) => (
              <BotItem key={'name' in item ? item.name : item.peer_user_id} item={item} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

const BotItem = ({ item }: { item: User | Channel }) => {
  const { workspaceID } = useParams()
  const navigate = useNavigate()
  const { call, loading } = useFrappePostCall<{ message: string }>(
    'raven.api.raven_channel.create_direct_message_channel'
  )

  const isUser = !('channel_name' in item)
  const user = isUser ? (item as User) : undefined
  const channel = !isUser ? (item as Channel) : undefined

  const userID = isUser ? user!.name : channel!.peer_user_id
  const avatar = isUser ? user?.user_image : undefined
  const fullName = isUser ? user?.full_name : undefined

  const onClick = () => {
    if (channel) {
      // Đã có kênh → chuyển luôn
      if (workspaceID) {
        navigate(`/${workspaceID}/${channel.name}`)
      } else {
        navigate(`/channel/${channel.name}`)
      }
    } else {
      // Tạo kênh mới
      call({ user_id: userID })
        .then((res) => {
          if (workspaceID) {
            navigate(`/${workspaceID}/${res?.message}`)
          } else {
            navigate(`/channel/${res?.message}`)
          }
        })
        .catch((err) => {
          toast.error('Không thể tạo đoạn chat bot', {
            description: getErrorMessage(err)
          })
        })
    }
  }

  return (
    <Box
      onClick={onClick}
      className={clsx('w-full text-left p-2 rounded cursor-pointer', 'hover:bg-gray-100 dark:hover:bg-gray-700')}
    >
      <Flex width='100%' justify='between' align='center'>
        <Flex gap='2' align='center'>
          <Box className='relative'>
            <UserAvatar src={avatar} isBot alt={fullName ?? userID} availabilityStatus={user?.availability_status} />
          </Box>
          <Text as='span' className={clsx('line-clamp-1 text-ellipsis', 'text-base md:text-sm xs:text-xs')}>
            {fullName ?? userID}
          </Text>
        </Flex>
        {loading ? <Loader /> : null}
      </Flex>
    </Box>
  )
}

const UserWithoutDMItem = ({ userID }: { userID: string }) => {
  const { workspaceID } = useParams()
  const user = useGetUser(userID)
  const isActive = useIsUserActive(userID)
  const navigate = useNavigate()

  const { call, loading } = useFrappePostCall<{ message: string }>(
    'raven.api.raven_channel.create_direct_message_channel'
  )

  const onClick = () => {
    call({ user_id: userID })
      .then((res) => {
        if (workspaceID) {
          navigate(`/${workspaceID}/${res?.message}`)
        } else {
          navigate(`/channel/${res?.message}`)
        }
      })
      .catch((err) => {
        toast.error('Không thể tạo được đoạn chat', {
          description: getErrorMessage(err)
        })
      })
  }

  return (
    <Box
      onClick={onClick}
      className={clsx('w-full text-left p-2 rounded cursor-pointer', 'hover:bg-gray-100 dark:hover:bg-gray-700')}
    >
      <Flex width='100%' justify='between' align='center'>
        <Flex gap='2' align='center'>
          <Box className='relative'>
            <UserAvatar
              isActive={isActive}
              src={user?.user_image}
              isBot={user?.type === 'Bot'}
              alt={user?.full_name ?? userID}
              availabilityStatus={user?.availability_status}
            />
          </Box>

          <Text as='span' className={clsx('line-clamp-1 text-ellipsis', 'text-base md:text-sm xs:text-xs')}>
            {user?.full_name ?? userID}
          </Text>
        </Flex>

        {loading ? <Loader /> : null}

        {!user?.enabled && (
          <Badge color='gray' variant='soft'>
            Disabled
          </Badge>
        )}
      </Flex>
    </Box>
  )
}

export default UserChannelList
