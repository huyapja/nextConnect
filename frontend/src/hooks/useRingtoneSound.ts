let audio: HTMLAudioElement | null = null
export function getRingtoneSoundAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}ringtone.mp3`)
    audio.volume = 0.7
    audio.preload = 'auto'
  }
  return audio
}
