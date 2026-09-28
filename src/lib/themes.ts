/** "mateIn2" → "Mate in 2", "backRankMate" → "Back rank mate". */
export function humanize(theme: string) {
  const spaced = theme.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
