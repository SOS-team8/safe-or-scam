export const formatDateTime = (isoDateTime: string) => {
  const date = new Date(isoDateTime)

  if (Number.isNaN(date.getTime())) {
    return isoDateTime
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${hour}:${minute}`
}

export const formatDate = (isoDateTime: string) => {
  const date = new Date(isoDateTime)

  if (Number.isNaN(date.getTime())) {
    return isoDateTime
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export const formatDuration = (totalSeconds: number) => {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  if (minutes === 0) {
    return `${seconds}초`
  }
  return `${minutes}분 ${seconds}초`
}

export const endingTypeLabel = (endingType: string): { label: string; isGood: boolean } => {
  if (endingType === 'ending_good') {
    return { label: '안전한 결말', isGood: true }
  }
  if (endingType === 'ending_bad') {
    return { label: '주의가 필요한 결말', isGood: false }
  }
  return { label: endingType, isGood: false }
}
