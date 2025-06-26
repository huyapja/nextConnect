// hooks/useScrollToMessage.ts
import { useNavigate, useParams } from 'react-router-dom'

export const useScrollToMessage = (onClose: () => void) => {
  const navigate = useNavigate()
  const { workspaceID } = useParams()

  const handleNavigateToChannel = (channelID: string, baseMessage?: string, workspace?: string) => {
    let path = `/${workspaceID}/${channelID}`
    if (workspace) {
      path = `/${workspace}/${channelID}`
    }

    onClose()

    navigate({
      pathname: path,
      search: `message_id=${baseMessage}`
    })
  }

  const handleScrollToMessage = async (messageName: string, channelID: string, workspace?: string) => {
    handleNavigateToChannel(channelID, messageName, workspace)
  }

  return { handleScrollToMessage }
}
