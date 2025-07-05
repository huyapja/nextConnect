import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'

export const useSetUserBusy = () => {
  const useCheckUserBusy = (user_id: string) => {
    const {
      data,
      error,
      isValidating: isChecking,
      mutate
    } = useFrappeGetCall<{ message: { busy: boolean } }>(
      'raven.api.stringee.check_user_busy',
      { user_id },
      `check_busy_${user_id}`
    )

    return {
      isBusy: data?.message.busy ?? false,
      isChecking,
      error,
      refetch: mutate
    }
  }

  const {
    call: markBusy,
    isCompleted: isBusyDone,
    loading: isBusySetting
  } = useFrappePostCall('raven.api.stringee.mark_user_busy')

  const {
    call: markIdle,
    isCompleted: isIdleDone,
    loading: isIdleSetting
  } = useFrappePostCall('raven.api.stringee.mark_user_idle')

  return {
    useCheckUserBusy,
    markUserBusy: (user_id: string) => markBusy({ user_id }),
    markUserIdle: (user_id: string) => markIdle({ user_id }),
    isBusyDone,
    isBusySetting,
    isIdleDone,
    isIdleSetting
  }
}
