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

  interface Frappe {
    boot?: FrappeBoot
  }

  interface Window {
    frappe?: Frappe
    frappePushNotification?: any
  }
}
