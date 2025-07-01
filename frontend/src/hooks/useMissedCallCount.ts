import { useFrappeGetCall, useFrappeEventListener } from 'frappe-react-sdk'
import { useMemo } from 'react'

export interface MissedCall {
  name: string
  caller_id: string
  caller_name: string
  caller_image?: string
  call_type: 'audio' | 'video'
  creation: string
  is_read: boolean
}

export const useMissedCallCount = () => {
  const { data: missedCallsData, mutate } = useFrappeGetCall<{ message: MissedCall[] }>(
    'raven.api.missed_calls.get_missed_calls',
    undefined,
    undefined,
    {
      revalidateOnFocus: true,
      focusThrottleInterval: 1000 * 60 * 2 // Refresh every 2 minutes
    }
  )

  // Listen for new missed calls via real-time events
  useFrappeEventListener('missed_call_created', () => {
    mutate()
  })

  // Listen for missed calls being marked as read
  useFrappeEventListener('missed_call_read', () => {
    mutate()
  })

  const missedCalls = useMemo(() => {
    return missedCallsData?.message || []
  }, [missedCallsData])

  const unreadMissedCallCount = useMemo(() => {
    return missedCalls.filter(call => !call.is_read).length
  }, [missedCalls])

  const resetMissedCalls = () => {
    mutate({ message: [] }, { revalidate: false })
  }

  return { 
    missedCalls, 
    unreadMissedCallCount, 
    resetMissedCalls,
    mutate
  }
} 