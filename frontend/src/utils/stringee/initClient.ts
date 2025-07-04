const STRINGEE_SERVER_ADDRS = ['wss://v1.stringee.com:6899/']

export const initStringeeClient = (token: string, onIncomingCall: (call: any) => void) => {
  const client = new window.StringeeClient([STRINGEE_SERVER_ADDRS[0]])

  client.connect(token)

  client.on('connect', () => {
    console.log('[✅] Connected to Stringee')

    // ✅ Lưu deviceId vào sessionStorage sau khi kết nối
    const deviceId = client?.deviceId
    if (deviceId) {
      sessionStorage.setItem('stringee_device_id', deviceId)
      console.log('[💾] Stored deviceId:', deviceId)
    }
  })

  client.on('authen', (res: any) => console.log('[🔐] Authenticated', res))

  client.on('incomingcall', (call: any) => {
    const incomingDeviceId = call?.client?.deviceId
    const myDeviceId = sessionStorage.getItem('stringee_device_id')

    console.log('[📲] Incoming call received on device:', incomingDeviceId)
    console.log('[🆔] Current session deviceId:', myDeviceId)

    // ✅ So sánh deviceId để xác định đúng thiết bị
    if (incomingDeviceId !== myDeviceId) {
      console.warn('[🚫] Bỏ qua cuộc gọi: không đúng thiết bị')
      return
    }

    // ✅ Đúng thiết bị → xử lý cuộc gọi
    onIncomingCall(call)
  })

  client.on('disconnect', () => console.log('[❌] Disconnected from Stringee'))
  client.on('requestnewtoken', () => console.log('[🔄] Token expired'))
  client.on('otherdeviceauthen', (data: any) => console.warn('[⚠️] Another device authenticated', data))

  return client
}
