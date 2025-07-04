import { useEffect, useRef, useState } from 'react'

export const useIncomingCallAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = document.createElement('audio')
    audio.src = `${import.meta.env.BASE_URL}incoming-call-sound.mp3`
    audio.loop = true
    audio.volume = 0.9
    audio.preload = 'auto'
    audio.style.display = 'none'

    document.body.appendChild(audio)
    audioRef.current = audio

    return () => {
      audio.pause()
      document.body.removeChild(audio)
    }
  }, [])

  const play = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch((err) => {
      console.warn('[⚠️] Cannot play incoming sound:', err)
    })
  }

  const stop = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
  }

  return { play, stop }
}
