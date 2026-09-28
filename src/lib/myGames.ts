import { Chess } from 'chess.js'
import { clean, hash, normalizeDate, parseHeaders, sanTokens, splitPgn, moveText } from '../../scripts/pgn.mjs'
import type { Game } from './games'

/** A game you imported yourself (saved in this browser). */
export type MyGame = Game & {
  /** Which side you played, if you said. */
  me?: 'white' | 'black'
  /** When it was imported (ISO date). */
  added: string
}

export type ImportResult = { games: MyGame[]; errors: string[] }

/**
 * Read one or more games from PGN text (Chess.com / Lichess exports, or just
 * moves like "1. e4 e5 2. Nf3"). Every move is checked; a game with an illegal
 * move is reported with the exact move that failed.
 */
export function parseImport(text: string, me?: 'white' | 'black', now = new Date()): ImportResult {
  const games: MyGame[] = []
  const errors: string[] = []
  const chunks = splitPgn(text)
  if (!chunks.length) return { games, errors: ['Paste a game (PGN) first.'] }

  chunks.forEach((chunk, gi) => {
    const label = chunks.length > 1 ? `Game ${gi + 1}: ` : ''
    const h = parseHeaders(chunk)
    const fen = h.SetUp === '1' || h.FEN ? h.FEN : undefined
    let chess: Chess
    try {
      chess = fen ? new Chess(fen) : new Chess()
    } catch {
      errors.push(`${label}the starting position (FEN) isn't valid.`)
      return
    }
    const sans: string[] = []
    for (const tok of sanTokens(moveText(chunk))) {
      try {
        sans.push(chess.move(tok, { strict: false }).san)
      } catch {
        const ply = sans.length
        const fullMove = Math.floor(ply / 2) + 1
        const dots = chess.turn() === 'w' ? '.' : '...'
        errors.push(`${label}move ${fullMove}${dots} "${tok}" isn't legal in that position. Check the game text around there.`)
        return
      }
    }
    if (!sans.length) {
      errors.push(`${label}no moves found.`)
      return
    }
    const w = clean(h.White) || 'White'
    const b = clean(h.Black) || 'Black'
    const d = normalizeDate(h.Date || h.UTCDate)
    const m = sans.join(' ')
    const game: MyGame = {
      id: `my-${hash([w, b, d, m, fen ?? ''].join('|'))}`,
      w,
      b,
      r: clean(h.Result) || '*',
      d: d || undefined,
      e: clean(h.Event) || undefined,
      s: clean(h.Site) || undefined,
      we: clean(h.WhiteElo) || undefined,
      be: clean(h.BlackElo) || undefined,
      eco: clean(h.ECO) || undefined,
      m,
      fen,
      me,
      added: now.toISOString(),
    }
    for (const k of Object.keys(game) as (keyof MyGame)[]) if (game[k] === undefined) delete game[k]
    games.push(game)
  })
  return { games, errors }
}

// ---------- saved in this browser ----------

const KEY = 'myGames:v1'
const MAX = 300

export function loadMyGames(): MyGame[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as MyGame[]
  } catch {
    return []
  }
}

/** Save games (newest first). Re-importing the same game just moves it to the top. */
export function saveMyGames(newGames: MyGame[]): MyGame[] {
  const ids = new Set(newGames.map((g) => g.id))
  const all = [...newGames, ...loadMyGames().filter((g) => !ids.has(g.id))].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Storage full or blocked: the games still open this time, they just won't be kept.
  }
  return all
}

export function deleteMyGame(id: string): MyGame[] {
  const all = loadMyGames().filter((g) => g.id !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
  return all
}
