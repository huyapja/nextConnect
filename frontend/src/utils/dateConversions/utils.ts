import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// ✨ Thêm locale Vietnamese
import 'dayjs/locale/vi'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)
dayjs.extend(relativeTime)

// ⚠️ Cấu hình ngôn ngữ mặc định
dayjs.locale('vi')

const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh'
export const SYSTEM_TIMEZONE = window.frappe?.boot?.time_zone?.system || DEFAULT_TIME_ZONE

export const USER_DATE_FORMAT =
  window.frappe?.boot?.user?.defaults?.date_format?.toUpperCase() ||
  window.frappe?.boot?.sysdefaults?.date_format?.toUpperCase() ||
  'DD/MM/YYYY'

export const FRAPPE_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
export const FRAPPE_DATE_FORMAT = 'YYYY-MM-DD'
export const FRAPPE_TIME_FORMAT = 'HH:mm:ss'

export const getDateObject = (timestamp: string): dayjs.Dayjs => {
  return dayjs.tz(timestamp, SYSTEM_TIMEZONE).local()
}

export const convertMillisecondsToReadableDate = (
  timestampInMilliseconds: number,
  format: string = 'hh:mm A (Do MMM)'
) => {
  return dayjs.unix(timestampInMilliseconds / 1000)
}
