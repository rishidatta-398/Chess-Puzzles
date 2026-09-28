// Helpers for reading PGN game collections. No Node APIs, so Vitest can test them.

/** Split a multi-game PGN file into one string per game. */
export function splitPgn(text) {
  const games = []
  let current = []
  let inMoves = false
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    const isHeader = /^\s*\[\w+\s+".*"\]\s*$/.test(line)
    if (isHeader && inMoves) {
      games.push(current.join('\n'))
      current = []
      inMoves = false
    }
    if (!isHeader && line.trim() !== '') inMoves = true
    current.push(line)
  }
  if (current.some((l) => l.trim() !== '')) games.push(current.join('\n'))
  return games.map((g) => g.trim()).filter(Boolean)
}

/** Read the [Tag "value"] headers of one game. */
export function parseHeaders(gameText) {
  const headers = {}
  for (const m of gameText.matchAll(/^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm)) {
    headers[m[1]] = m[2].replace(/\\"/g, '"').trim()
  }
  return headers
}

/** The move text of one game (everything after the headers). */
export function moveText(gameText) {
  return gameText
    .split('\n')
    .filter((l) => !/^\s*\[\w+\s+".*"\]\s*$/.test(l))
    .join(' ')
    .trim()
}

/** "1956.10.17" → "1956-10-17", "1956.??.??" → "1956", junk → "". */
export function normalizeDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('.')
  if (!/^\d{4}$/.test(y ?? '')) return ''
  if (!/^\d{2}$/.test(m ?? '')) return y
  if (!/^\d{2}$/.test(day ?? '')) return `${y}-${m}`
  return `${y}-${m}-${day}`
}

/** Clean a header value: "?" and "" become "". */
export function clean(v) {
  const s = (v ?? '').trim()
  return s === '?' || s === '-' ? '' : s
}

/** Stable 32-bit hash (FNV-1a), as base36. */
export function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * Id that is the same for a game no matter which player's file it came from,
 * so Karpov–Kasparov games line up in both collections.
 */
export function gameId(white, black, date, sans) {
  const surname = (n) => n.split(',')[0].trim().toLowerCase()
  return hash([surname(white), surname(black), date.slice(0, 4), sans.join(' ')].join('|'))
}

/** "Fischer, Robert James" → "Robert James Fischer"; "Carlsen, M." → "M. Carlsen". */
export function displayName(pgnName) {
  const n = clean(pgnName)
  const i = n.indexOf(',')
  if (i < 0) return n
  const last = n.slice(0, i).trim()
  const first = n.slice(i + 1).trim()
  return first ? `${first} ${last}` : last
}

/** True if a PGN name refers to the given surname (case-insensitive, whole word). */
export function nameMatches(pgnName, surname) {
  return new RegExp(`\\b${surname}\\b`, 'i').test(pgnName ?? '')
}

/**
 * The moves of one game as SAN tokens: strips {comments} (including clock times
 * like {[%clk 0:03:00]}), ; comments, (variations, even nested), $NAGs,
 * move numbers, !?-style marks and the result.
 */
export function sanTokens(text) {
  let t = text.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ')
  let prev
  do {
    prev = t
    t = t.replace(/\([^()]*\)/g, ' ')
  } while (t !== prev)
  return t
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .split(/\s+/)
    .filter((x) => x && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x))
    .map((x) => x.replace(/[!?]+$/, ''))
}
