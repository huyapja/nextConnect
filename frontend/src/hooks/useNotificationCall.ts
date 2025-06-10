let audio: HTMLAudioElement | null = null

export function getPhoneRingAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}phone-ring.wav`)
    audio.volume = 0.7
    audio.preload = 'auto'
  }
  return audio
}

