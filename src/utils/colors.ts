export const colorThemes = [
  { value: 'green', label: '绿色', color: '#22c55e' },
  { value: 'blue', label: '蓝色', color: '#3b82f6' },
  { value: 'purple', label: '紫色', color: '#a855f7' },
  { value: 'orange', label: '橙色', color: '#f97316' },
  { value: 'red', label: '红色', color: '#ef4444' },
  { value: 'teal', label: '青色', color: '#14b8a6' },
  { value: 'pink', label: '粉色', color: '#ec4899' },
  { value: 'gray', label: '灰色', color: '#64748b' },
] as const

export function themeColor(theme: string) {
  return colorThemes.find((item) => item.value === theme)?.color ?? colorThemes[0].color
}

export function heatmapLevelColor(theme: string, level: number) {
  const color = themeColor(theme)
  const alpha = [0, 0.28, 0.48, 0.72, 1][level] ?? 0
  if (level === 0) {
    return 'var(--square-empty)'
  }
  return rgbaFromHex(color, alpha)
}

export function rgbaFromHex(hex: string, alpha: number) {
  const rgb = hex
    .replace('#', '')
    .match(/.{1,2}/g)
    ?.map((part) => Number.parseInt(part, 16))

  if (!rgb) {
    return hex
  }

  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}
