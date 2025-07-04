import { useEffect, useRef, useState } from 'react'

export const useOutgoingCallAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}outgoing-call-sound.mp3`)
    audio.loop = true // 🔁 Loop liên tục khi đang đổ chuông
    audio.volume = 0.8
    audio.preload = 'auto'

    const handleCanPlay = () => {
      setIsLoaded(true)
    }

    audio.addEventListener('canplaythrough', handleCanPlay)
    audio.load()
    audioRef.current = audio

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay)
    }
  }, [])

  const play = () => {
    if (!audioRef.current || !isLoaded) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {})
  }

  const stop = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
  }

  return { play, stop }
}
