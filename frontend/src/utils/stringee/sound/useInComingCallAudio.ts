import { useEffect, useRef, useState } from 'react'

export const useIncomingCallAudio = () => {
  const audioIncomingRef = useRef<HTMLAudioElement | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const audio1 = new Audio(`${import.meta.env.BASE_URL}incoming-call-sound.mp3`)
    audio1.loop = true // 🔁 Lặp lại liên tục khi có cuộc gọi đến
    audio1.volume = 0.9
    audio1.preload = 'auto'

    const handleCanPlay = () => {
      setIsLoaded(true)
    }

    audio1.addEventListener('canplaythrough', handleCanPlay)
    audio1.load()
    audioIncomingRef.current = audio1

    return () => {
      audio1.removeEventListener('canplaythrough', handleCanPlay)
    }
  }, [])

  const play = () => {
    if (!audioIncomingRef.current || !isLoaded) return
    audioIncomingRef.current.currentTime = 0
    audioIncomingRef.current.play().catch(() => {})
  }

  const stop = () => {
    if (!audioIncomingRef.current) return
    audioIncomingRef.current.pause()
    audioIncomingRef.current.currentTime = 0
  }

  return { play, stop }
}
