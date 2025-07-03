export {}

declare global {
  interface Window {
    app_name?: string
    __blinkInterval?: NodeJS.Timeout

    // Các biến sẵn có từ Frappe
    frappe?: Frappe
    frappePushNotification?: any

    // 👇 Thêm biến từ Stringee SDK
    StringeeClient?: any
    StringeeCall?: any
    StringeeCall2?: any
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
}
