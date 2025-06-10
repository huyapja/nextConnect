import { useEffect, useRef, useState } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { getPhoneRingAudio } from '@/hooks/useNotificationCall'
import { getRingtoneSoundAudio } from '@/hooks/useRingtoneSound'

declare global {
  interface Window {
    StringeeClient: any
    StringeeCall: any
  }
}

export default function StringeeCallComponent({ toUserId }: { toUserId: string }) {
  const [client, setClient] = useState<any>(null)
  const [call, setCall] = useState<any>(null)
  const [incoming, setIncoming] = useState<any>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const phoneRingRef = useRef<HTMLAudioElement | null>(null)
  const ringbackAudio = useRef<HTMLAudioElement | null>(null)

  const { data } = useFrappeGetCall<{ message: { userId: string; token: string } }>(
    'raven.api.stringee_token.get_stringee_token'
  )

  useEffect(() => {
    if (data?.message && !client) {
      const stringeeClient = new window.StringeeClient()
      stringeeClient.connect(data.message.token)
      setClient(stringeeClient)

      phoneRingRef.current = getPhoneRingAudio()
      phoneRingRef.current.loop = true

      stringeeClient.on('connect', () => console.log('✅ Đã kết nối Stringee'))
      stringeeClient.on('authen', (res) => console.log('🎫 Auth:', res))

      stringeeClient.on('incomingcall', (incomingCall: any) => {
        console.log('📲 Cuộc gọi đến:', incomingCall)
        setIncoming(incomingCall)
        setupCallEvents(incomingCall)
        phoneRingRef.current?.play().catch(console.error)
      })
    }
  }, [data, client])

  const setupCallEvents = (callObj: any) => {
    callObj.on('addremotestream', (stream: MediaStream) => {
      console.log('🎥 addremotestream')
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
        remoteVideoRef.current.srcObject = stream
        remoteVideoRef.current.play().catch(console.error)
      }
    })

    callObj.on('addlocalstream', (stream: MediaStream) => {
      console.log('📹 addlocalstream')
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        localVideoRef.current.play().catch(console.error)
      }
    })

    callObj.on('signalingstate', (state: any) => {
      console.log('📡 signalingstate:', state)
      // Khi cuộc gọi kết nối
      if (state.code === 6 || state.reason === 'CALL_ANSWERED') {
        ringbackAudio.current?.pause()
        ringbackAudio.current!.currentTime = 0
      }
      // Khi bị từ chối
      if (state.code === 5 || state.reason === 'CALL_REJECTED') {
        ringbackAudio.current?.pause()
        ringbackAudio.current!.currentTime = 0
      }
    })

    callObj.on('mediastate', (state: any) => {
      console.log('🎬 mediastate:', state)
    })

    callObj.on('info', (info: any) => {
      console.log('ℹ️ info:', info)
    })
  }

  const makeCall = () => {
    if (!client || !data?.message.userId || !toUserId) return

    const newCall = new window.StringeeCall(client, data.message.userId, toUserId, true)
    setCall(newCall)
    setupCallEvents(newCall)

    ringbackAudio.current = getRingtoneSoundAudio()
    ringbackAudio.current.loop = true
    ringbackAudio.current.volume = 0.7
    ringbackAudio.current.play().catch(console.error)

    newCall.makeCall((res: any) => {
      console.log('📞 makeCall:', res)
    })
  }

  const answerCall = () => {
    if (!incoming) return
    phoneRingRef.current?.pause()
    phoneRingRef.current!.currentTime = 0
    incoming.answer((res: any) => {
      console.log('✅ Answer:', res)
      setCall(incoming)
      setIncoming(null)
    })
  }

  const rejectCall = () => {
    if (!incoming) return
    phoneRingRef.current?.pause()
    phoneRingRef.current!.currentTime = 0
    incoming.reject((res: any) => {
      console.log('❌ Reject:', res)
      setIncoming(null)
    })
  }

  const hangupCall = () => {
    if (!call) return
    call.hangup((res: any) => {
      console.log('🔚 Hangup:', res)
      ringbackAudio.current?.pause()
      ringbackAudio.current!.currentTime = 0
      setCall(null)
    })
  }

  const upgradeToVideo = () => {
    if (!call) return
    call.upgradeToVideoCall()
  }

  return (
    <div>
      <h3>🎧 Cuộc gọi Stringee</h3>
      <div style={{ display: 'flex', gap: '12px', marginTop: 12 }}>
        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '45%', background: '#000' }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '45%', background: '#000' }} />
      </div>
      <div style={{ marginTop: 20 }}>
        {!call && !incoming && (
          <button onClick={makeCall} style={{ marginRight: 10 }}>
            📞 Gọi {toUserId}
          </button>
        )}
        {incoming && (
          <>
            <button onClick={answerCall} style={{ marginRight: 10 }}>
              ✅ Trả lời
            </button>
            <button onClick={rejectCall}>❌ Từ chối</button>
          </>
        )}
        {call && (
          <>
            <button onClick={hangupCall} style={{ marginRight: 10 }}>
              🔚 Kết thúc
            </button>
            <button onClick={upgradeToVideo}>📹 Nâng cấp video</button>
          </>
        )}
      </div>
    </div>
  )
}
