export function todayString() {
  const date = new Date()
  return formatDate(date)
}

export function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function formatDisplayDate(value: string, language: 'zh' | 'en' = 'zh') {
  const date = parseLocalDate(value)
  if (language === 'en') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatFullDisplayDate(value: string, language: 'zh' | 'en' = 'zh') {
  const date = parseLocalDate(value)
  if (language === 'en') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
