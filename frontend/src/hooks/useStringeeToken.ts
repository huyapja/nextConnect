import { useFrappeGetCall } from 'frappe-react-sdk'

export const useStringeeToken = (userID: string | null) => {
  const { data, error, isValidating, mutate } = useFrappeGetCall<string>(
    'raven.api.stringee.get_stringee_token',
    userID ? { user_id: userID } : undefined,
    'stringee_token'
  )

  return {
    token: data?.message ?? null,
    isLoading: isValidating,
    error,
    refresh: mutate
  }
}
