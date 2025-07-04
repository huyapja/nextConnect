export function settingCallEvents(
  call: any,
  onCallEnded?: () => void,
  setIsInCall?: (value: boolean) => void,
  setIsConnecting?: (value: boolean) => void
) {
  call.on('addlocalstream', (stream: MediaStream) => {
    console.log('[🎤] Local stream added')
    const localVideo = document.getElementById('localVideo') as HTMLVideoElement
    if (localVideo) {
      localVideo.srcObject = null
      localVideo.srcObject = stream
    }
  })

  call.on('addremotestream', (stream: MediaStream) => {
    console.log('[🔊] Remote stream added')

    const audioEl = document.createElement('audio')
    audioEl.srcObject = stream
    audioEl.autoplay = true
    audioEl.muted = false
    audioEl.controls = false
    audioEl.style.display = 'none'

    const container = document.getElementById('audio_container') || document.body
    container.appendChild(audioEl)

    console.log('[🎧] Remote audio element attached')
  })

  call.on('signalingstate', (state: any) => {
    console.log('[🔁] Signaling state:', state)
    if ([5, 6].includes(state.code)) {
      console.log('[🔚] Call ended via signaling')
      onCallEnded?.()
    }
  })

  call.on('mediastate', (state: any) => {
    console.log('[🎙️] Media state:', state)
    if (state?.code === 1 || state?.reason === 'Connected') {
      console.log('[✅] Media connected → gọi setInCall + tắt connecting')
      setIsInCall?.(true)
      setIsConnecting?.(false)
    }
  })

  call.on('answer', (res: any) => {
    console.log('[📞] Answered', res)
    if (res.r === 0) {
      setIsInCall?.(true)
      setIsConnecting?.(false) //
    }
  })

  call.on('reject', (res: any) => {
    console.log('[❌] Call rejected')
    onCallEnded?.()
  })

  call.on('hangup', (res: any) => {
    console.log('[📴] Call ended')
    onCallEnded?.()
  })

  call.on('info', (info: any) => {
    console.log('[ℹ️] Info event:', info)
  })
}
