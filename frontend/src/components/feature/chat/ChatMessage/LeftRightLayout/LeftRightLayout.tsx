import { Stack } from '@/components/layout/Stack'
import { useDebounce } from '@/hooks/useDebounce'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import useOutsideClick from '@/hooks/useOutsideClick'
import { UserContext } from '@/utils/auth/UserProvider'
import { UserFields } from '@/utils/users/UserListProvider'
import { Box, BoxProps, ContextMenu, Flex, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useContext, useMemo, useState } from 'react'
import { RiPushpinFill, RiShareForwardFill } from 'react-icons/ri'
import { useDoubleTap } from 'use-double-tap'
import { Message, MessageBlock } from '../../../../../../../types/Messaging/Message'
import { MessageContextMenu } from '../MessageActions/MessageActions'
import { QuickActions } from '../MessageActions/QuickActions/QuickActions'
import { MessageContent, MessageSenderAvatar, UserHoverCard } from '../MessageItem'
import { MessageReactions } from '../MessageReactions'
import { MessageSeenStatus } from '../MessageSeenStatus'
import { DateTooltip } from '../Renderers/DateTooltip'
import { DoctypeLinkRenderer } from '../Renderers/DoctypeLinkRenderer'
import { ThreadMessage } from '../Renderers/ThreadMessage'
import { ReplyMessageBox } from '../ReplyMessageBox/ReplyMessageBox'
import RetractedMessage from '../RetractedMessage'

export interface Props {
  message: Message
  user: UserFields | undefined
  isActive: boolean
  isHighlighted?: boolean
  channel: any
  hasBeenSeen: boolean
  seenByOthers: any
  onReplyMessageClick: (messageID: string) => void
  onDelete: () => void
  showThreadButton?: boolean
  onEdit: () => void
  onReply: () => void
  onForward: () => void
  onViewReaction: () => void
  onAttachToDocument: () => void
  unseenByOthers: any
  isThinking?: boolean
  is_retracted?: number
  isPending?: boolean
  removePendingMessage: (id: string) => void
  sendOnePendingMessage: (id: string) => void
}

export const LeftRightLayout = ({
  message,
  user,
  isActive,
  isHighlighted,
  onReplyMessageClick,
  onDelete,
  showThreadButton,
  onEdit,
  onReply,
  onForward,
  onViewReaction,
  onAttachToDocument,
  seenByOthers,
  hasBeenSeen,
  channel,
  unseenByOthers,
  isThinking = false,
  is_retracted,
  isPending,
  removePendingMessage,
  sendOnePendingMessage
}: Props) => {
  const {
    // name,
    owner: userID,
    is_bot_message,
    // bot,
    creation: timestamp,
    message_reactions,
    is_continuation,
    linked_message,
    replied_message_details
  } = message

  const { currentUser } = useContext(UserContext)

  const replyMessageDetails = useMemo(() => {
    if (typeof replied_message_details === 'string') {
      return JSON.parse(replied_message_details)
    } else {
      return replied_message_details
    }
  }, [replied_message_details])

  const isDesktop = useIsDesktop()
  const [isHovered, setIsHovered] = useState(false)
  const isHoveredDebounced = useDebounce(isHovered, isDesktop ? 400 : 200)
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false)

  // For mobile, we want to show the quick actions on double tap
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bind = useDoubleTap((event) => {
    if (!isDesktop) setIsHovered(!isHovered)
  })
  const ref = useOutsideClick(() => {
    if (!isDesktop) setIsHovered(false)
  })

  const onMouseEnter = () => {
    if (isDesktop && !is_retracted) {
      setIsHovered(true)
    }
  }

  const onMouseLeave = () => {
    if (isDesktop) {
      setIsHovered(false)
    }
  }

  // @ts-ignore
  const CHAT_STYLE = window.frappe?.boot?.chat_style ?? 'Simple'

  const alignToRight = CHAT_STYLE === 'Left-Right' && currentUser === userID && !is_bot_message

  const [selectedText, setSelectedText] = useState('')

  const onContextMenuChange = (open: boolean) => {
    if (open && !is_retracted) {
      // Get the selection that te user is actually highlighting
      const selection = document.getSelection()
      if (selection) {
        setSelectedText(selection.toString().trim())
      }
    } else {
      setSelectedText('')
    }
  }

  const isSaved = JSON.parse(message._liked_by ? message._liked_by : '[]').includes(currentUser)

  if (is_retracted === 1) {
    return (
      <div className={clsx('flex py-0.5', alignToRight ? 'justify-end mr-4' : 'justify-start')}>
        <Flex align={'start'} gap={'2'} className='relative'>
          {!alignToRight && (
            <MessageLeftElement message={message} user={user} isActive={isActive} className='mt-[5px]' />
          )}
          <Stack gap={'0'} align={'end'}>
            {alignToRight && !is_continuation && (
              <Box className='text-right pr-1 pb-0.5'>
                <DateTooltip timestamp={timestamp} />
              </Box>
            )}

            <RetractedMessage
              message={message}
              user={user}
              currentUser={currentUser}
              alignToRight={alignToRight}
              timestamp={timestamp}
              is_continuation={is_continuation}
            />
          </Stack>
        </Flex>
      </div>
    )
  }

  return (
    <div className={clsx('flex py-0.5', alignToRight ? 'justify-end mr-4' : 'justify-start')}>
      <Flex align={'start'} gap={'2'} className='relative'>
        {!alignToRight && <MessageLeftElement message={message} user={user} isActive={isActive} className='mt-[5px]' />}
        <Stack gap={'0'} align={'end'}>
          {alignToRight && !is_continuation && (
            <Box className='text-right pr-1 pb-0.5'>
              <DateTooltip timestamp={timestamp} />
            </Box>
          )}
          <ContextMenu.Root modal={false} onOpenChange={onContextMenuChange}>
            <ContextMenu.Trigger
              {...bind}
              ref={ref}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              className='group w-full'
            >
              <Flex
                direction={'column'}
                className={clsx(
                  'relative w-fit sm:max-w-[32rem] max-w-[80vw] p-3 gap-1 rounded-md',
                  isHighlighted
                    ? 'bg-yellow-50 hover:bg-yellow-50 dark:bg-yellow-300/20 dark:hover:bg-yellow-300/20'
                    : !isDesktop && isHovered
                      ? 'bg-gray-2 dark:bg-gray-3'
                      : '',
                  isThinking && 'animate-pulse'
                )}
              >
                {!is_continuation && !alignToRight ? (
                  <Flex align='center' gap='2'>
                    <UserHoverCard user={user} userID={userID} isActive={isActive} />
                    <DateTooltip timestamp={timestamp} />
                  </Flex>
                ) : null}

                {message.is_forwarded === 1 && (
                  <Flex className='text-gray-10 text-xs' gap={'1'} align={'center'}>
                    <RiShareForwardFill size='12' /> Chuyển tiếp
                  </Flex>
                )}
                {message.is_pinned === 1 && (
                  <Flex className='text-accent-9 text-xs' gap={'1'} align={'center'}>
                    <RiPushpinFill size='12' /> Ghim
                  </Flex>
                )}
                {isSaved && (
                  <Flex className='text-accent-9 text-xs' gap={'1'} align={'center'}>
                    <RiPushpinFill size='12' /> Đã gắn cờ
                  </Flex>
                )}
                {linked_message && replied_message_details && (
                  <ReplyMessageBox
                    className='sm:max-w-[32rem] max-w-[80vw] cursor-pointer mb-1'
                    role='button'
                    onClick={() => onReplyMessageClick(linked_message)}
                    message={replyMessageDetails}
                    currentUser={currentUser}
                  />
                )}

                <MessageContent
                  removePendingMessage={removePendingMessage}
                  sendOnePendingMessage={sendOnePendingMessage}
                  message={message}
                  user={user}
                  currentUser={currentUser}
                />

                {message.link_doctype && message.link_document && (
                  <Box className={clsx(message.is_continuation ? 'ml-0.5' : '-ml-0.5')}>
                    <DoctypeLinkRenderer doctype={message.link_doctype} docname={message.link_document} />
                  </Box>
                )}

                {message.is_edited === 1 && (
                  <Text size='1' className='text-gray-10'>
                    (edited)
                  </Text>
                )}

                {!isPending && message_reactions?.length && (
                  <MessageReactions message={message} message_reactions={message_reactions} />
                )}

                {message.is_thread === 1 ? <ThreadMessage thread={message} /> : null}

                {!isPending && (isHoveredDebounced || isEmojiPickerOpen) && (
                  <QuickActions
                    message={message}
                    onDelete={onDelete}
                    isEmojiPickerOpen={isEmojiPickerOpen}
                    setIsEmojiPickerOpen={setEmojiPickerOpen}
                    onEdit={onEdit}
                    onReply={onReply}
                    onForward={onForward}
                    showThreadButton={showThreadButton}
                    onAttachDocument={onAttachToDocument}
                    alignToRight={alignToRight}
                  />
                )}
              </Flex>
            </ContextMenu.Trigger>
            <MessageContextMenu
              message={message}
              onDelete={onDelete}
              showThreadButton={showThreadButton}
              onEdit={onEdit}
              selectedText={selectedText}
              onReply={onReply}
              onForward={onForward}
              onViewReaction={onViewReaction}
              onAttachDocument={onAttachToDocument}
            />
          </ContextMenu.Root>
        </Stack>
        {!isPending && (
          <div className='absolute bottom-0 -right-2'>
            <MessageSeenStatus
              hasBeenSeen={hasBeenSeen}
              channelType={channel?.type}
              seenByOthers={seenByOthers}
              unseenByOthers={unseenByOthers}
              currentUserOwnsMessage={message.owner === currentUser}
              position='end'
            />
          </div>
        )}
      </Flex>
    </div>
  )
}

type MessageLeftElementProps = BoxProps & {
  message: MessageBlock['data']
  user?: UserFields
  isActive?: boolean
}
const MessageLeftElement = ({ message, className, user, isActive, ...props }: MessageLeftElementProps) => {
  // If it's a continuation, then show the timestamp

  // Else, show the avatar
  return (
    <Box
      className={clsx(message.is_continuation ? 'flex items-center w-[38px] sm:w-[34px]' : '', className)}
      {...props}
    >
      {message.is_continuation ? null : <MessageSenderAvatar userID={message.owner} user={user} isActive={isActive} />}
    </Box>
  )
}
