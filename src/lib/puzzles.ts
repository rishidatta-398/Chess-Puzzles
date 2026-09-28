import { Chess } from 'chess.js'

/** One puzzle as stored in public/puzzles/*.json: [id, fen, moves, rating, themes]. */
export type CompactPuzzle = [string, string, string, number, string]

export type Puzzle = {
  id: string
  /** Position BEFORE the opponent's setup move (straight from Lichess). */
  fen: string
  /** UCI moves. moves[0] is the opponent's setup move, then solver and opponent alternate. */
  moves: string[]
  rating: number
  themes: string[]
}

export const PHASES = ['opening', 'middlegame', 'endgame'] as const
export type Phase = (typeof PHASES)[number]

export type PuzzleIndex = {
  version: number
  source: string
  total: number
  phases: Record<Phase, number>
  buckets: {
    min: number
    max: number
    count: number
    files: Partial<Record<Phase, { file: string; count: number }>>
  }[]
  themes: Record<string, number>
}

/** A puzzle ready to show: the setup move has been played. */
export type PreparedPuzzle = {
  puzzle: Puzzle
  /** Position the solver sees. */
  startFen: string
  /** The opponent's setup move, for highlighting. */
  setupMove: { from: string; to: string; san: string }
  /** Moves the solver must find, alternating with opponent replies (UCI). */
  solution: string[]
  /** The solver plays this colour, so the board faces this way. */
  orientation: 'white' | 'black'
}

export function fromCompact(c: CompactPuzzle): Puzzle {
  const [id, fen, moves, rating, themes] = c
  return { id, fen, moves: moves.split(' '), rating, themes: themes ? themes.split(' ') : [] }
}

export function parseUci(uci: string) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
  }
}

/** Play the opponent's setup move and work out what the solver sees. Throws on bad data. */
export function preparePuzzle(puzzle: Puzzle): PreparedPuzzle {
  if (puzzle.moves.length < 2) throw new Error(`Puzzle ${puzzle.id} has no solution moves`)
  const game = new Chess(puzzle.fen)
  const setup = game.move(parseUci(puzzle.moves[0]))
  return {
    puzzle,
    startFen: game.fen(),
    setupMove: { from: setup.from, to: setup.to, san: setup.san },
    solution: puzzle.moves.slice(1),
    orientation: game.turn() === 'w' ? 'white' : 'black',
  }
}

/** Play a list of UCI moves from a position. Returns each resulting position and SAN. */
export function playUciLine(fen: string, uciMoves: string[]) {
  const game = new Chess(fen)
  return uciMoves.map((uci) => {
    const m = game.move(parseUci(uci))
    return { fen: game.fen(), san: m.san, from: m.from, to: m.to }
  })
}

/** Buckets that overlap a rating range. */
export function bucketsInRange(index: PuzzleIndex, min: number, max: number) {
  return index.buckets.filter((b) => b.max >= min && b.min <= max)
}

/** Data files needed for a rating range and a set of phases (empty set = all phases). */
export function filesFor(index: PuzzleIndex, min: number, max: number, phases: readonly Phase[] = PHASES): string[] {
  const wanted = phases.length ? phases : PHASES
  return bucketsInRange(index, min, max).flatMap((b) =>
    wanted.map((ph) => b.files[ph]?.file).filter((f): f is string => !!f),
  )
}

// ---------- loading ----------

const base = `${import.meta.env?.BASE_URL ?? "/"}puzzles/`
let indexPromise: Promise<PuzzleIndex> | null = null

export type PuzzleFilter = { min: number; max: number; phases?: readonly Phase[] }
const bucketCache = new Map<string, Promise<Puzzle[]>>()

export function loadIndex(): Promise<PuzzleIndex> {
  indexPromise ??= fetch(`${base}index.json`)
    .then((r) => {
      if (!r.ok) throw new Error('Puzzle data not found. Run the puzzle build step (see README).')
      return r.json() as Promise<PuzzleIndex>
    })
    .then((ix) => {
      if (ix.version < 2) throw new Error('Puzzle data is an old format. Rebuild it (see README).')
      return ix
    })
  indexPromise.catch(() => (indexPromise = null))
  return indexPromise
}

export function loadBucket(file: string): Promise<Puzzle[]> {
  let p = bucketCache.get(file)
  if (!p) {
    p = fetch(`${base}${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${file}`)
        return r.json() as Promise<CompactPuzzle[]>
      })
      .then((rows) => rows.map(fromCompact))
    p.catch(() => bucketCache.delete(file))
    bucketCache.set(file, p)
  }
  return p
}

async function poolFor(f: PuzzleFilter): Promise<Puzzle[]> {
  const index = await loadIndex()
  const pools = await Promise.all(filesFor(index, f.min, f.max, f.phases).map(loadBucket))
  return pools.flat().filter((p) => p.rating >= f.min && p.rating <= f.max)
}

/** Puzzles matching a filter, and how many of them haven't been seen yet. */
export async function countMatching(f: PuzzleFilter, seen: Set<string> = new Set()) {
  const pool = await poolFor(f)
  return { total: pool.length, left: pool.reduce((n, p) => n + (seen.has(p.id) ? 0 : 1), 0) }
}

/**
 * Pick a random puzzle matching a filter, skipping ids already seen.
 * `random` is injectable for tests.
 */
export async function randomPuzzle(
  f: PuzzleFilter,
  seen: Set<string> = new Set(),
  random: () => number = Math.random,
): Promise<Puzzle | null> {
  const candidates = (await poolFor(f)).filter((p) => !seen.has(p.id))
  if (!candidates.length) return null
  return candidates[Math.floor(random() * candidates.length)]
}
