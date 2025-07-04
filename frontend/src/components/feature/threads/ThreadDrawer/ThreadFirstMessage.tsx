import { useGetUser } from '@/hooks/useGetUser'
import { useIsUserActive } from '@/hooks/useIsUserActive'
import { FileExtensionIcon } from '@/utils/layout/FileExtIcon'
import { getFileExtension, getFileName } from '@/utils/operations'
import { UserFields } from '@/utils/users/UserListProvider'
import { Box, BoxProps, Button, Flex, Text } from '@radix-ui/themes'
import clsx from 'clsx'
import { useLayoutEffect, useRef, useState } from 'react'
import { MdOutlineBarChart } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import { FileMessage, Message, PollMessage } from '../../../../../../types/Messaging/Message'
import { MessageSenderAvatar, UserHoverCard } from '../../chat/ChatMessage/MessageItem'
import { DateTooltip } from '../../chat/ChatMessage/Renderers/DateTooltip'
import { DoctypeLinkRenderer } from '../../chat/ChatMessage/Renderers/DoctypeLinkRenderer'
import { TiptapRenderer } from '../../chat/ChatMessage/Renderers/TiptapRenderer/TiptapRenderer'

type MessageContentProps = BoxProps & {
  user?: UserFields
  message: Message
}
export const ThreadFirstMessage = ({ message, user, ...props }: MessageContentProps) => {
  const threadOwner = useGetUser(message.owner)

  const isActive = useIsUserActive(message.owner)

  const contentRef = useRef<HTMLDivElement>(null)

  const [showMore, setShowMore] = useState(!message.text?.length)

  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    setContentHeight(contentRef.current?.clientHeight ?? null)
  })

  const showButton = ((contentHeight && contentHeight >= 40) || showMore) && message.message_type === 'Text'

  const navigate = useNavigate()
  const lastWorkspace = localStorage.getItem('ravenLastWorkspace') ?? ''

  return (
    <Flex gap='3' pb='2' pt='2' className='bg-white dark:bg-gray-2 border-gray-4 sm:dark:border-gray-6 border-b'>
      <MessageSenderAvatar userID={message.owner} user={threadOwner} isActive={isActive} />
      <Flex direction='column' gap='0.5' justify='center' width='100%'>
        <Flex align='center' gap='2' mt='-1'>
          <UserHoverCard user={threadOwner} userID={message.owner} isActive={isActive} />
          <DateTooltip timestamp={message.creation} timeFormat='Do MMM [at] hh:mm A' />
        </Flex>
        <Box>
          <Box ref={contentRef} className={clsx('overflow-y-hidden', showMore ? 'max-h-min' : 'max-h-10')} {...props}>
            {message.text ? (
              <TiptapRenderer
                message={{
                  ...message,
                  message_type: 'Text'
                }}
                user={user}
                showMiniImage
                showLinkPreview={false}
                currentUser={message.owner}
              />
            ) : null}

            {message.message_type === 'Poll' ? (
              <Text as='span' size='2' className='line-clamp-2 flex items-center'>
                <MdOutlineBarChart size='14' className='inline mr-1' />
                Poll: {(message as PollMessage).content?.split('\n')?.[0]}
              </Text>
            ) : ['File', 'Image'].includes(message.message_type ?? 'Text') ? (
              <Flex gap='2' align='center'>
                {message.message_type === 'File' && message.file && (
                  <FileExtensionIcon ext={getFileExtension(message.file)} size='18' />
                )}
                {message.message_type === 'Image' && (
                  <img
                    src={message.file}
                    alt={`Image sent by ${message.owner}`}
                    height='30'
                    width='30'
                    className='object-cover rounded-md'
                  />
                )}

                <Text as='span' size='2'>
                  {getFileName((message as FileMessage).file)}
                </Text>
              </Flex>
            ) : null}

            {message.link_doctype && message.link_document && (
              <DoctypeLinkRenderer doctype={message.link_doctype} docname={message.link_document} />
            )}
          </Box>
          <Flex align='center' gap='3' mt='3'>
            {showButton && (
              <Button
                size='1'
                color='gray'
                variant='ghost'
                className='hover:bg-transparent hover:underline cursor-pointer'
                onClick={() => setShowMore(!showMore)}
              >
                Xem {showMore ? 'Ngắn' : 'Thêm'}
              </Button>
            )}
            <Button
              size='1'
              color='gray'
              variant='ghost'
              className='hover:bg-transparent hover:underline cursor-pointer'
              onClick={() => navigate(`/${lastWorkspace}/${message.channel_id}?message_id=${message.name}`)}
            >
              Quay lại cuộc trò chuyện
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  )
}

export default ThreadFirstMessage
