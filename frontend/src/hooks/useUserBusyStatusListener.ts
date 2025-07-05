import { useFrappeEventListener, useSWRConfig } from 'frappe-react-sdk'

export const useUserBusyRealtimeListener = (userId: string) => {
  const { mutate } = useSWRConfig()

  useFrappeEventListener(`stringee_user_busy:${userId}`, (event) => {
    const { busy } = event || {}

    // ✅ Chỉ cập nhật cache nếu có dữ liệu
    if (typeof busy !== 'boolean') return

    mutate(
      `check_busy_${userId}`,
      (prev: { message: { busy: boolean } } | undefined) => {
        if (!prev) return { message: { busy } }

        return {
          ...prev,
          message: {
            ...prev.message,
            busy
          }
        }
      },
      { revalidate: false }
    )
  })
}
