const STRINGEE_SERVER_ADDRS = ['wss://v1.stringee.com:6899/', 'wss://v2.stringee.com:6899/']

export const initStringeeClient = (token: string, onIncomingCall: (call: any) => void) => {
  // chỉ dùng v1 nên bỏ đi v2 url
  const client = new window.StringeeClient([STRINGEE_SERVER_ADDRS[0]])

  client.connect(token)

  client.on('connect', () => console.log('[✅] Connected to Stringee'))
  client.on('authen', (res: any) => console.log('[🔐] Authenticated', res))
  client.on('incomingcall', (call: any) => {
    console.log('[📲] Incoming call received')
    onIncomingCall(call)
  })
  client.on('disconnect', () => console.log('[❌] Disconnected from Stringee'))
  client.on('requestnewtoken', () => console.log('[🔄] Token expired'))
  client.on('otherdeviceauthen', (data: any) => console.warn('[⚠️] Another device authenticated', data))

  return client
}
