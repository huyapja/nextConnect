import { useStringeeToken } from '@/hooks/useStringeeToken'
import { useEffect, useRef } from 'react'

export const StringeeProvider = ({ userID }: { userID: string }) => {
  const { token, isLoading } = useStringeeToken(userID)
  const clientRef = useRef<any>(null)

  useEffect(() => {
    if (!token || !window.StringeeClient) return

    const client = new window.StringeeClient()
    client.connect(token)
    clientRef.current = client

    client.on('incomingcall', (call: any) => {
      console.log('📲 Có cuộc gọi đến từ:', call.from)
      // Có thể mở modal nhận cuộc gọi tại đây
    })

    return () => {
      client.disconnect()
    }
  }, [token])

  return null
}
