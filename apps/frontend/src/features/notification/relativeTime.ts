const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

const relativeTimeFormatter = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })

const formatAbsoluteDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export const formatRelativeTime = (isoDateTime: string, now: Date = new Date()) => {
  const date = new Date(isoDateTime)

  if (Number.isNaN(date.getTime())) {
    return isoDateTime
  }

  const elapsedMs = now.getTime() - date.getTime()

  if (elapsedMs < MINUTE_MS) {
    return '방금 전'
  }

  if (elapsedMs < HOUR_MS) {
    return relativeTimeFormatter.format(-Math.floor(elapsedMs / MINUTE_MS), 'minute')
  }

  if (elapsedMs < DAY_MS) {
    return relativeTimeFormatter.format(-Math.floor(elapsedMs / HOUR_MS), 'hour')
  }

  if (elapsedMs < 7 * DAY_MS) {
    return relativeTimeFormatter.format(-Math.floor(elapsedMs / DAY_MS), 'day')
  }

  return formatAbsoluteDate(date)
}
