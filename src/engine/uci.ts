// Parsing the UCI text protocol that Stockfish speaks.

/** Engine score from the point of view of the side to move. */
export type Score = { cp: number; mate?: undefined } | { mate: number; cp?: undefined }

export type PvLine = {
  multipv: number
  depth: number
  score: Score
  /** Principal variation in UCI (e2e4, e7e8q, ...). */
  pv: string[]
}

export type Analysis = {
  /** Best lines, best first (index 0 = multipv 1). */
  lines: PvLine[]
  bestmove: string | null
}

/** Parse one "info ..." line. Returns null for lines without a score and pv. */
export function parseInfo(line: string): PvLine | null {
  if (!line.startsWith('info ') || !line.includes(' pv ')) return null
  const tok = line.split(/\s+/)
  let depth = 0
  let multipv = 1
  let score: Score | null = null
  let pv: string[] = []
  for (let i = 1; i < tok.length; i++) {
    const t = tok[i]
    if (t === 'depth') depth = Number(tok[++i])
    else if (t === 'multipv') multipv = Number(tok[++i])
    else if (t === 'score') {
      const kind = tok[++i]
      const v = Number(tok[++i])
      score = kind === 'mate' ? { mate: v } : { cp: v }
      // "lowerbound"/"upperbound" follow on partial results; skip those lines.
      if (tok[i + 1] === 'lowerbound' || tok[i + 1] === 'upperbound') return null
    } else if (t === 'pv') {
      pv = tok.slice(i + 1)
      break
    }
  }
  if (!score || !pv.length) return null
  return { multipv, depth, score, pv }
}

/** "bestmove e2e4 ponder e7e5" → "e2e4"; "bestmove (none)" → null. */
export function parseBestmove(line: string): string | null | undefined {
  if (!line.startsWith('bestmove')) return undefined
  const m = line.split(/\s+/)[1]
  return !m || m === '(none)' ? null : m
}

/**
 * Collects info lines for one search and keeps the deepest line per multipv.
 * Call add() for every engine line; done becomes true on "bestmove".
 */
export class SearchCollector {
  private byPv = new Map<number, PvLine>()
  bestmove: string | null = null
  done = false

  add(line: string) {
    const info = parseInfo(line)
    if (info) {
      const prev = this.byPv.get(info.multipv)
      if (!prev || info.depth >= prev.depth) this.byPv.set(info.multipv, info)
      return
    }
    const bm = parseBestmove(line)
    if (bm !== undefined) {
      this.bestmove = bm
      this.done = true
    }
  }

  result(): Analysis {
    const lines = [...this.byPv.values()].sort((a, b) => a.multipv - b.multipv)
    return { lines, bestmove: this.bestmove }
  }
}
