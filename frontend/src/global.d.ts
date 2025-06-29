export {}

declare global {
  interface Window {
    app_name?: string
    __blinkInterval?: NodeJS.Timeout
  }
  interface FrappeBoot {
    user?: {
      defaults?: {
        date_format?: string
      }
    }
    sysdefaults?: {
      date_format?: string
    }
    time_zone: any
  }

  interface FrappeRealtime {
    on(event: string, callback: (data: any) => void): void
    off(event: string, callback: (data: any) => void): void
  }

  interface Frappe {
    boot?: FrappeBoot
    realtime?: FrappeRealtime
  }

  interface Window {
    frappe?: Frappe
    frappePushNotification?: any
  }
}
