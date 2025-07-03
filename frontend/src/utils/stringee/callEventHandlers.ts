export const settingCallEvents = (call: any) => {
  call.on('addlocaltrack', (localTrack: any) => {
    const element = localTrack.attach()
    document.getElementById('local_videos')?.appendChild(element)
    element.style.height = '150px'
  })

  call.on('addremotetrack', (track: any) => {
    const element = track.attach()
    document.getElementById('remote_videos')?.appendChild(element)
    element.style.height = '150px'
  })

  call.on('removelocaltrack', (track: any) => track.detachAndRemove())
  call.on('removeremotetrack', (track: any) => track.detachAndRemove())

  call.on('signalingstate', (state: any) => {
    console.log('[🔁] Signaling state', state)
  })

  call.on('mediastate', (state: any) => {
    console.log('[🎙️] Media state', state)
  })
}
