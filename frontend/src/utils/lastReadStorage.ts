type LastReadPayload = {
  id: string
  ts: number
}

const STORAGE_PREFIX = 'lastRead_'
const TTL_MS = 1000 * 60 * 60 * 24 * 7

export const lastReadStorage = {
  get(channelID: string): string | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${channelID}`)
      if (!raw) return null

      const parsed: LastReadPayload = JSON.parse(raw)
      if (!parsed?.id || !parsed?.ts) return null

      const isExpired = Date.now() - parsed.ts > TTL_MS
      return isExpired ? null : parsed.id
    } catch {
      return null
    }
  },

  set(channelID: string, messageID: string) {
    try {
      const payload: LastReadPayload = {
        id: messageID,
        ts: Date.now()
      }
      localStorage.setItem(`${STORAGE_PREFIX}${channelID}`, JSON.stringify(payload))
    } catch (err) {
      console.warn('Failed to save last read message:', err)
    }
  },

  clear(channelID: string) {
    localStorage.removeItem(`${STORAGE_PREFIX}${channelID}`)
  }
}