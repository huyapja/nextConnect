export const settingCallEvents = (call: any, onCallEnded?: () => void, setIsInCall?: (value: boolean) => void) => {
  // 🟢 Track âm thanh local
  call.on('addlocaltrack', (localTrack: any) => {
    localTrack.on('ready', () => {
      console.log('[📶] Local audio track ready')
    })

    const audioEl = localTrack.attach()
    audioEl.autoplay = true
    audioEl.muted = true // tránh nghe chính mình
    audioEl.style.display = 'none'

    const container = document.getElementById('audio_container')
    container?.appendChild(audioEl)
    console.log('[🎧] Local audio element attached (hidden)')
  })

  // 🔵 Track âm thanh remote
  call.on('addremotetrack', (remoteTrack: any) => {
    console.log('[🔵] Remote track added:', remoteTrack)

    // ✅ Bổ sung sự kiện track-level để tránh warning
    if (remoteTrack.on) {
      remoteTrack.on('mediastate', (state: any) => {
        console.log('[🎙️][track] Remote track media state:', state)
      })
    }

    remoteTrack.on('ready', () => {
      console.log('[📶] Remote audio track ready')
    })

    const audioEl = remoteTrack.attach()
    audioEl.autoplay = true
    audioEl.controls = false
    audioEl.style.display = 'none'

    // Log thêm khi audio thực sự chạy
    audioEl.onplaying = () => {
      console.log('[🔊] Remote audio is playing')
    }

    audioEl.oncanplay = () => {
      console.log('[🟢] Remote audio can play')
    }

    // Tránh bị block autoplay
    setTimeout(() => {
      audioEl
        .play()
        .then(() => {
          console.log('[🔊] Remote audio started playing')
        })
        .catch((err: any) => {
          console.warn('[⚠️] Remote audio play blocked:', err)
        })
    }, 100)

    const container = document.getElementById('audio_container')
    container?.appendChild(audioEl)
    console.log('[🎧] Remote audio element attached (hidden)')
  })

  // ⛔ Khi mất track
  call.on('removelocaltrack', (track: any) => {
    console.log('[⛔] Remove local track')
    track.detachAndRemove()
  })

  call.on('removeremotetrack', (track: any) => {
    console.log('[⛔] Remove remote track')
    track.detachAndRemove()
  })

  // ❌ Không dùng stream-level
  call.on('addlocalstream', () => {
    console.log('[ℹ️] Ignored event: addlocalstream')
  })

  call.on('addremotestream', () => {
    console.log('[ℹ️] Ignored event: addremotestream')
  })

  // 📞 Khi bên kia nhấc máy
  call.on('answer', (res: any) => {
    console.log('[📞] Answered', res)
  })

  // 🔁 Trạng thái signaling
  call.on('signalingstate', (state: any) => {
    console.log('[🔁] Signaling state:', state)

    if ([5, 6].includes(state.code)) {
      console.log('[🔚] Call ended via signaling state')
      onCallEnded?.()
    }
  })

  // 🎙️ Khi media connected
  call.on('mediastate', (state: any) => {
    console.log('[🎙️] Media state:', state)

    if (state?.isConnected) {
      console.log('[🟢] mediaState isConnected = true → setting isInCall = true')
      setIsInCall?.(true)
    }
  })

  // 📴 Khi kết thúc
  call.on('hangup', () => {
    console.log('[📴] Hangup triggered')
    onCallEnded?.()
  })
}
