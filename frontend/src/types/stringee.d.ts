declare global {
  interface Window {
    StringeeClient: new () => StringeeClient
    StringeeCall2: new (client: StringeeClient, from: string, to: string, isVideoCall: boolean) => StringeeCall2
  }
}

interface StringeeClient {
  connect(token: string): void
  disconnect(): void
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}

interface StringeeCall2 {
  callId: string
  fromUserId: string
  toUserId: string
  isVideoCall: boolean
  makeCall(): void
  answer(): void
  hangup(): void
  reject(): void
  mute(): void
  unmute(): void
  enableVideo(enable: boolean): void
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}

export {} 