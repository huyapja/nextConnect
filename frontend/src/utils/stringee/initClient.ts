export const initStringeeClient = (
  token: string,
  onIncomingCall: (call: any) => void
) => {
  const client = new window.StringeeClient()

  client.connect(token)

  client.on('connect', () => {
    console.log('[✅] Connected to Stringee')
  })

  client.on('authen', (res: any) => {
    console.log('[🔐] Authenticated', res)
  })

  client.on('incomingcall2', (call: any) => {
    onIncomingCall(call)
  })

  return client
}
