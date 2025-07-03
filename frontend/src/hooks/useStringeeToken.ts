import { useFrappeGetCall } from 'frappe-react-sdk'

interface StringeeTokenResponse {
  token: string
  user_id: string
}

export const useStringeeToken = () => {
  const { data, error, isValidating, mutate } = useFrappeGetCall<{ message: StringeeTokenResponse }>(
    'raven.api.stringee.get_stringee_token'
  )

  return {
    token: data?.message?.message?.token ?? null,
    userId: data?.message?.message?.user_id ?? null,
    isLoading: isValidating,
    error,
    refresh: mutate
  }
}
