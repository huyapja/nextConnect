import { useState, useRef, useEffect } from 'react'

export const useCallDuration = (callStatus: string | null, call: any, incoming: any) => {
  const [callDuration, setCallDuration] = useState(0) // seconds
  const [callStartTime, setCallStartTime] = useState<Date | null>(null)
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // useEffect để đếm thời gian cuộc gọi
  useEffect(() => {
    if (callStatus === 'connected' && !callDurationIntervalRef.current) {
      // Bắt đầu đếm thời gian
      if (!callStartTime) {
        setCallStartTime(new Date())
      }
      
      callDurationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else if (callStatus !== 'connected' && callDurationIntervalRef.current) {
      // Dừng đếm thời gian khi không connected
      clearInterval(callDurationIntervalRef.current)
      callDurationIntervalRef.current = null
    }

    // Cleanup interval khi component unmount
    return () => {
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current)
        callDurationIntervalRef.current = null
      }
    }
  }, [callStatus, callStartTime])

  // Reset call duration khi bắt đầu cuộc gọi mới
  useEffect(() => {
    if (call || incoming) {
      setCallDuration(0)
      setCallStartTime(null)
    }
  }, [call, incoming])

  const resetDuration = () => {
    setCallDuration(0)
    setCallStartTime(null)
    if (callDurationIntervalRef.current) {
      clearInterval(callDurationIntervalRef.current)
      callDurationIntervalRef.current = null
    }
  }

  return {
    callDuration,
    callStartTime,
    resetDuration
  }
} 