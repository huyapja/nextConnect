let phoneRingAudio: HTMLAudioElement | null = null
let ringbackAudio: HTMLAudioElement | null = null

export function getPhoneRingAudio(): HTMLAudioElement {
  if (!phoneRingAudio) {
    phoneRingAudio = new Audio('/assets/raven/stringee/phone-ring.wav')
    phoneRingAudio.volume = 0.7
    phoneRingAudio.preload = 'auto'
  }
  return phoneRingAudio
}

export function getRingtoneSoundAudio(): HTMLAudioElement {
  if (!ringbackAudio) {
    ringbackAudio = new Audio('/assets/raven/stringee/ringtone.mp3')
    ringbackAudio.volume = 0.7
    ringbackAudio.preload = 'auto'
  }
  return ringbackAudio
}

export const stopAllAudio = () => {
  // Stop global audio
  if (phoneRingAudio) {
    phoneRingAudio.pause()
    phoneRingAudio.currentTime = 0
    phoneRingAudio.loop = false
    phoneRingAudio.volume = 0
  }
  
  if (ringbackAudio) {
    ringbackAudio.pause()
    ringbackAudio.currentTime = 0
    ringbackAudio.loop = false
    ringbackAudio.volume = 0
  }
  
  // Force stop ALL audio elements in DOM
  document.querySelectorAll('audio').forEach((audio) => {
    if (!audio.src.includes('remoteAudio')) { // Don't stop call audio
      audio.pause()
      audio.currentTime = 0
      audio.loop = false
      audio.volume = 0
      
      // Remove ring audio from DOM
      if (audio.src.includes('phone-ring') || audio.src.includes('ringtone')) {
        try {
          audio.remove()
        } catch (e) {
          // Could not remove audio element
        }
      }
    }
  })
}

export const initAudioContext = async (): Promise<AudioContext | null> => {
  let audioContext: AudioContext | null = null
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      // Failed to create audio context
      return null
    }
  }
  
  if (audioContext?.state === 'suspended') {
    try {
      await audioContext.resume()
    } catch (error) {
      // Failed to resume audio context
    }
  }
  
  return audioContext
} 