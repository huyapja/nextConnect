import { Stack, HStack } from '@/components/layout/Stack'
import useFetchChannelMembers from '@/hooks/fetchers/useFetchChannelMembers'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useUserData } from '@/hooks/useUserData'
import { RavenMessage } from '@/types/RavenMessaging/RavenMessage'
import { UserContext } from '@/utils/auth/UserProvider'
import { Box, Flex, IconButton, Checkbox } from '@radix-ui/themes'
import { useSWRConfig } from 'frappe-react-sdk'
import { MutableRefObject, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { BiX } from 'react-icons/bi'
import { VirtuosoHandle } from 'react-virtuoso'
import { Message } from '../../../../../../types/Messaging/Message'
import AIEvent from '../../ai/AIEvent'
import useFileUpload from '../../chat/ChatInput/FileInput/useFileUpload'
import TiptapThread from '../../chat/ChatInput/Tiptap_Thread'
import TypingIndicator from '../../chat/ChatInput/TypingIndicator/TypingIndicator'
import { useTyping } from '../../chat/ChatInput/TypingIndicator/useTyping'
import { useSendMessage } from '../../chat/ChatInput/useSendMessage'
import { ReplyMessageBox } from '../../chat/ChatMessage/ReplyMessageBox/ReplyMessageBox'
import ChatStream from '../../chat/ChatStream/ChatStream'
import { GetMessagesResponse } from '../../chat/ChatStream/useMessageAPI'
import { JoinChannelBox } from '../../chat/chat-footer/JoinChannelBox'
import { CustomFile, FileDrop } from '../../file-upload/FileDrop'
import { FileListItem } from '../../file-upload/FileListItem'
import ThreadFirstMessage from './ThreadFirstMessage'
import { Label } from '@/components/common/Form'

export const ThreadMessages = ({ threadMessage }: { threadMessage: Message }) => {
  const threadID = threadMessage.name
  const channelID = threadMessage.channel_id
  const { currentUser } = useContext(UserContext)
  const { name: user } = useUserData()

  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const chatStreamRef = useRef<{ onUpArrow: () => void } | null>(null)
  const tiptapRef = useRef<{ focusEditor: () => void } | null>(null)

  const { channelMembers } = useFetchChannelMembers(channelID ?? '')
  const { channelMembers: threadMembers } = useFetchChannelMembers(threadID ?? '')

  const { onUserType, onStopTyping } = useTyping(threadID ?? '')

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const handleReplyAction = (message: Message) => setSelectedMessage(message)
  const clearSelectedMessage = () => setSelectedMessage(null)

  const { mutate } = useSWRConfig()

  const onMessageSendCompleted = (messages: RavenMessage[]) => {
    mutate(
      { path: `get_messages_for_channel_${threadID}` },
      (data?: GetMessagesResponse) => {
        if (data && data?.message.has_new_messages) return data

        const existingMessages = data?.message.messages ?? []
        const newMessages = [...existingMessages]

        messages.forEach((message) => {
          const messageIndex = existingMessages.findIndex((m) => m.name === message.name)

          if (messageIndex !== -1) {
            newMessages[messageIndex] = {
              ...message,
              _liked_by: '',
              is_pinned: 0,
              is_continuation: 0
            }
          } else {
            newMessages.push({
              ...message,
              _liked_by: '',
              is_pinned: 0,
              is_continuation: 0
            })
          }
        })

        return {
          message: {
            messages: newMessages.sort((a, b) => {
              return new Date(b.creation).getTime() - new Date(a.creation).getTime()
            }),
            has_new_messages: false,
            has_old_messages: data?.message.has_old_messages ?? false
          }
        }
      },
      { revalidate: false }
    )

    onStopTyping()
    clearSelectedMessage()
  }

  const {
    fileInputRef,
    files,
    setFiles,
    removeFile,
    uploadFiles,
    uploadOneFile,
    addFile,
    fileUploadProgress,
    compressImages,
    setCompressImages
  } = useFileUpload(threadID ?? '')

  const { sendMessage, loading, pendingMessages, sendOnePendingMessage, removePendingMessage } = useSendMessage(
    threadID ?? '',
    uploadFiles,
    uploadOneFile,
    onMessageSendCompleted,
    selectedMessage
  )

  const onUpArrowPressed = useCallback(() => {
    chatStreamRef.current?.onUpArrow()
  }, [])

  const isMobile = useIsMobile()

  const onModalClose = useCallback(() => {
    if (!isMobile) {
      setTimeout(() => {
        tiptapRef.current?.focusEditor()
      }, 50)
    }
  }, [isMobile])

  const PreviousMessagePreview = ({ selectedMessage }: { selectedMessage: any }) => {
    if (selectedMessage) {
      return (
        <ReplyMessageBox
          justify='between'
          align='center'
          className='m-2'
          message={selectedMessage}
          currentUser={currentUser}
        >
          <IconButton color='gray' size='1' variant='soft' onClick={clearSelectedMessage}>
            <BiX size='20' />
          </IconButton>
        </ReplyMessageBox>
      )
    }
    return null
  }

  const { canUserSendMessage, shouldShowJoinBox } = useMemo(() => {
    if (!user || !threadMembers) {
      return { canUserSendMessage: false, shouldShowJoinBox: false }
    }

    const isUserInChannel = user in threadMembers

    if (isUserInChannel) {
      return { canUserSendMessage: true, shouldShowJoinBox: false }
    }

    return { canUserSendMessage: false, shouldShowJoinBox: true }
  }, [user, threadMembers])

  return (
    <ThreadMessagesContainer>
      <FileDrop
        files={files}
        ref={fileInputRef}
        onFileChange={setFiles}
        areaHeight='h-[calc(100vh-72px)]'
        height='100%'
        width={'w-[calc((100vw-var(--sidebar-width)-var(--space-8)-var(--space-5))/2)]'}
        maxFiles={10}
        maxFileSize={10000000}
      >
        <ThreadFirstMessage message={threadMessage} />
        <ChatStream
          channelID={threadID}
          onModalClose={onModalClose}
          replyToMessage={handleReplyAction}
          virtuosoRef={virtuosoRef as MutableRefObject<VirtuosoHandle>}
          ref={chatStreamRef as any}
          pendingMessages={pendingMessages}
          sendOnePendingMessage={sendOnePendingMessage}
          removePendingMessage={removePendingMessage}
          showThreadButton={false}
        />
        <AIEvent channelID={threadID ?? ''} />

        {canUserSendMessage && (
          <Stack>
            <TypingIndicator channel={threadID ?? ''} />
            <TiptapThread
              key={threadID}
              channelID={threadID}
              fileProps={{
                fileInputRef,
                addFile
              }}
              ref={tiptapRef}
              onUpArrow={onUpArrowPressed}
              clearReplyMessage={clearSelectedMessage}
              channelMembers={channelMembers}
              onUserType={onUserType}
              replyMessage={selectedMessage}
              sessionStorageKey={`tiptap-${threadID}`}
              onMessageSend={sendMessage}
              messageSending={loading}
              slotBefore={
                <Flex direction='column' justify='center' hidden={!selectedMessage && !files?.length}>
                  {selectedMessage && <PreviousMessagePreview selectedMessage={selectedMessage} />}
                  {files && files?.length > 0 && (
                    <Flex gap='2' width='100%' align='stretch' px='2' p='2' wrap='wrap'>
                      {files.map((f: CustomFile) => (
                        <Box className='grow-0' key={f.fileID}>
                          <FileListItem
                            file={f}
                            uploadProgress={fileUploadProgress}
                            removeFile={() => removeFile(f.fileID)}
                          />
                        </Box>
                      ))}
                    </Flex>
                  )}
                  {files?.length !== 0 && (
                    <CompressImageCheckbox compressImages={compressImages} setCompressImages={setCompressImages} />
                  )}
                </Flex>
              }
            />
          </Stack>
        )}

        {shouldShowJoinBox && <JoinChannelBox user={user} />}
      </FileDrop>
    </ThreadMessagesContainer>
  )
}

const CompressImageCheckbox = ({
  compressImages,
  setCompressImages
}: {
  compressImages: boolean
  setCompressImages: (compressImages: boolean) => void
}) => {
  return (
    <div className='px-3'>
      <Label size='2' weight='regular'>
        <HStack align='center' gap='2'>
          <Checkbox checked={compressImages} onCheckedChange={() => setCompressImages(!compressImages)} />
          Compress Images
        </HStack>
      </Label>
    </div>
  )
}

const ThreadMessagesContainer = ({ children }: { children: React.ReactNode }) => {
  return <div className='flex flex-col overflow-hidden px-2 pt-16 justify-end h-full'>{children}</div>
}
