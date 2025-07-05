import { useEffect, useRef, useState } from 'react'

export const useIncomingCallAudio = () => {
  const audioIncomingRef = useRef<HTMLAudioElement | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}incoming-call-sound.mp3`)
    audio.loop = true
    audio.volume = 0.9
    audio.preload = 'auto'

    const handleCanPlay = () => {
      setIsLoaded(true)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('canplaythrough', handleCanPlay)
    audio.addEventListener('ended', handleEnded)
    audio.load()

    audioIncomingRef.current = audio

    return () => {
      audio.pause()
      audio.currentTime = 0
      audio.removeEventListener('canplaythrough', handleCanPlay)
      audio.removeEventListener('ended', handleEnded)
      audioIncomingRef.current = null
      setIsLoaded(false)
      setIsPlaying(false)
    }
  }, [])

  const play = () => {
    if (!audioIncomingRef.current || isPlaying === true) return

    audioIncomingRef.current.currentTime = 0
    audioIncomingRef.current
      .play()
      .then(() => {
        setIsPlaying(true)
      })
      .catch((err) => {
        console.warn('[🔇] Không thể phát âm thanh:', err)
      })
  }

  const stop = () => {
    if (!audioIncomingRef.current) return

    audioIncomingRef.current.pause()
    audioIncomingRef.current.currentTime = 0
    setIsPlaying(false)
  }

  return { play, stop }
}
