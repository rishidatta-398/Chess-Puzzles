// Helpers for turning the Lichess puzzle CSV into the app's puzzle files.
// Kept free of Node APIs so they can be unit tested with Vitest.
//
// Lichess CSV columns:
// PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags

export const BUCKET_SIZE = 100
export const MIN_RATING = 400
export const MAX_RATING = 3200

/** Quality filters. Lichess popularity runs from -100 to 100. */
export const DEFAULT_FILTERS = {
  minPopularity: 80,
  minPlays: 200,
  maxRatingDeviation: 90,
}

/** Parse one CSV line. Returns null for the header or a malformed row. */
export function parseRow(line) {
  const cols = line.split(',')
  if (cols.length < 8 || cols[0] === 'PuzzleId') return null
  const [id, fen, moves, rating, deviation, popularity, plays, themes] = cols
  const r = Number(rating)
  if (!id || !fen || !moves || !Number.isFinite(r)) return null
  return {
    id,
    fen,
    moves,
    rating: r,
    deviation: Number(deviation),
    popularity: Number(popularity),
    plays: Number(plays),
    themes,
  }
}

export function passesFilters(row, f = DEFAULT_FILTERS) {
  return (
    row.popularity >= f.minPopularity &&
    row.plays >= f.minPlays &&
    row.deviation <= f.maxRatingDeviation &&
    row.moves.split(' ').length >= 2
  )
}

/** Lower bound of the rating bucket a rating falls in, clamped to the app's range. */
export function bucketOf(rating) {
  const clamped = Math.min(Math.max(rating, MIN_RATING), MAX_RATING - 1)
  return Math.floor(clamped / BUCKET_SIZE) * BUCKET_SIZE
}

/** Stable 32-bit hash (FNV-1a) so sampling is the same on every run. */
export function hashId(id) {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Keeps the `cap` rows with the smallest hash, using bounded memory.
 * Same input always gives the same sample.
 */
export class BucketSampler {
  constructor(cap) {
    this.cap = cap
    this.items = []
    this.threshold = Infinity
  }
  offer(row) {
    const h = hashId(row.id)
    if (h >= this.threshold) return
    this.items.push([h, row])
    if (this.items.length >= this.cap * 2) this.compact()
  }
  compact() {
    this.items.sort((a, b) => a[0] - b[0])
    this.items.length = Math.min(this.items.length, this.cap)
    if (this.items.length === this.cap) this.threshold = this.items[this.cap - 1][0]
  }
  result() {
    this.compact()
    return this.items.map(([, row]) => row)
  }
}

/** Compact form stored in the JSON files: [id, fen, moves, rating, themes]. */
export function toCompact(row) {
  return [row.id, row.fen, row.moves, row.rating, row.themes]
}

/** Game phases Lichess tags every puzzle with (exactly one each). */
export const PHASES = ['opening', 'middlegame', 'endgame']

/** The puzzle's game phase. Falls back to middlegame if untagged. */
export function phaseOf(themes) {
  const t = themes.split(' ')
  return PHASES.find((p) => t.includes(p)) ?? 'middlegame'
}

export function bucketFileName(min, phase) {
  return `r${String(min).padStart(4, '0')}-${phase}.json`
}
