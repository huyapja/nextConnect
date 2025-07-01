import { useState, useRef, useCallback, useEffect } from 'react'
import { getPhoneRingAudio, getRingtoneSoundAudio, stopAllAudio, initAudioContext } from '../utils/stringeeAudio'

export const useCallAudio = (call: any, incoming: any) => {
  const [isMuted, setIsMuted] = useState(false)
  const phoneRingRef = useRef<HTMLAudioElement | null>(null)
  const ringbackAudioRef = useRef<HTMLAudioElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioPermissionRequestedRef = useRef<boolean>(false)
  const cleanupFunctionsRef = useRef<(() => void)[]>([])

  // Initialize audio context
  const initAudio = useCallback(async () => {
    audioContextRef.current = await initAudioContext()

    // Request microphone permission proactively (only once)
    if (!audioPermissionRequestedRef.current && (call || incoming)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach(track => track.stop()) // Just for permission
        audioPermissionRequestedRef.current = true
      } catch (error) {
        // Microphone permission not granted yet
      }
    }
  }, [call, incoming])

  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Setup ringtone for incoming calls
  const playRingtone = useCallback(() => {
    if (phoneRingRef.current) {
      // Ensure audio context is ready
      initAudio()
      
      phoneRingRef.current.currentTime = 0
      phoneRingRef.current.loop = true
      phoneRingRef.current.volume = 0.7
      phoneRingRef.current.autoplay = true
      
      // Multiple retry attempts for ringtone
      const playRingtoneAttempt = async (attempt = 1) => {
        try {
          await phoneRingRef.current?.play()
        } catch (error) {
          if (attempt < 3) {
            setTimeout(() => playRingtoneAttempt(attempt + 1), 500 * attempt)
          }
        }
      }
      
      playRingtoneAttempt()
    }
  }, [initAudio])

  // Setup ringback for outgoing calls
  const playRingback = useCallback(() => {
    ringbackAudioRef.current = getRingtoneSoundAudio()
    ringbackAudioRef.current.loop = true
    ringbackAudioRef.current.volume = 0.7
    ringbackAudioRef.current.autoplay = true
    
    // Force play ringback with retry
    ringbackAudioRef.current.play().then(() => {
      // Ringback playing successfully
    }).catch(error => {
      // Retry after a short delay
      setTimeout(() => {
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.play().catch(() => {})
        }
      }, 500)
    })
  }, [])

  // Stop all audio with refs
  const stopAllAudioWithRefs = useCallback(() => {
    // Stop specific refs
    if (phoneRingRef.current) {
      phoneRingRef.current.pause()
      phoneRingRef.current.currentTime = 0
      phoneRingRef.current.loop = false
      phoneRingRef.current.volume = 0
      phoneRingRef.current.src = ''
    }
    
    if (ringbackAudioRef.current) {
      ringbackAudioRef.current.pause()
      ringbackAudioRef.current.currentTime = 0
      ringbackAudioRef.current.loop = false
      ringbackAudioRef.current.volume = 0
    }
    
    // Stop global audio
    stopAllAudio()
  }, [])

  // Comprehensive cleanup function
  const performAudioCleanup = useCallback(() => {
    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      localStreamRef.current = null
    }
    
    // Stop all audio
    stopAllAudioWithRefs()
    
    // Reset states
    setIsMuted(false)
    
    // Reset permission flags
    audioPermissionRequestedRef.current = false
    
    // Run custom cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        // Cleanup function error
      }
    })
    cleanupFunctionsRef.current = []
  }, [stopAllAudioWithRefs])

  // Handle visibility change to resume audio (only during active calls)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only process if there's an active call
      if (!document.hidden && (call || incoming)) {
        initAudio()
        
        // Resume all audio elements
        document.querySelectorAll('audio, video').forEach((media) => {
          const mediaElement = media as HTMLMediaElement
          if (mediaElement.paused && mediaElement.readyState >= 2) {
            mediaElement.play().catch(() => {})
          }
        })
      }
    }

    const handleFocus = () => {
      // Only process if there's an active call
      if (call || incoming) {
        initAudio()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Add to cleanup functions
    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
    cleanupFunctionsRef.current.push(cleanup)

    return cleanup
  }, [call, incoming, initAudio])

  // Force audio context when call modal opens
  useEffect(() => {
    if (call || incoming) {
      initAudio()
      
      // Additional aggressive audio resuming with cleanup
      const timeout1 = setTimeout(() => initAudio(), 100)
      const timeout2 = setTimeout(() => initAudio(), 500) 
      const timeout3 = setTimeout(() => initAudio(), 1000)
      
      // Add timeouts to cleanup
      const cleanup = () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
        clearTimeout(timeout3)
      }
      cleanupFunctionsRef.current.push(cleanup)
      
      return cleanup
    }
  }, [call, incoming, initAudio])

  // Initialize phone ring ref
  useEffect(() => {
    phoneRingRef.current = getPhoneRingAudio()
    phoneRingRef.current.loop = true
  }, [])

  return {
    isMuted,
    localStreamRef,
    phoneRingRef,
    ringbackAudioRef,
    toggleMute,
    playRingtone,
    playRingback,
    stopAllAudioWithRefs,
    performAudioCleanup,
    initAudio
  }
} 