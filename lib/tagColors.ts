export function getTagColor(name: string): string {
  if (!name) {
    return '#999999'
  }

  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }

  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 45%)`
}
