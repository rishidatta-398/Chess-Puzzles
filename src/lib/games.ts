import { Chess } from 'chess.js'
import type { Frame } from './puzzleTimeline'

/** One game as stored in public/games/<player>.json (short keys keep files small). */
export type Game = {
  id: string
  w: string // White
  b: string // Black
  r: string // Result: 1-0, 0-1, 1/2-1/2 or *
  d?: string // Date: YYYY, YYYY-MM or YYYY-MM-DD
  e?: string // Event
  s?: string // Site
  rd?: string // Round
  eco?: string
  we?: string // White Elo
  be?: string // Black Elo
  m: string // SAN moves, space separated
  fen?: string // Start position if not the normal one
}

export type PlayerInfo = {
  id: string
  name: string
  surname: string
  file: string
  count: number
  from?: string
  to?: string
}

export type FamousGame = { id: string; title: string; note: string; player: string; gameId: string }

export type GamesIndex = { version: number; players: PlayerInfo[]; famous: FamousGame[] }

export type Outcome = 'win' | 'loss' | 'draw' | 'other'

export type GameSearch = {
  text?: string
  color?: 'any' | 'white' | 'black'
  outcome?: 'any' | Outcome
}

// ---------- pure helpers ----------

/** "Fischer, Robert James" → "Robert James Fischer". */
export function displayName(pgnName: string): string {
  const i = pgnName.indexOf(',')
  if (i < 0) return pgnName.trim()
  const last = pgnName.slice(0, i).trim()
  const first = pgnName.slice(i + 1).trim()
  return first ? `${first} ${last}` : last
}

/** "Fischer, Robert James" → "Fischer". */
export function surnameOf(pgnName: string): string {
  return pgnName.split(',')[0].trim()
}

const wordRe = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')

/** Which colour `surname` had in this game, or null if they didn't play it. */
export function colorOf(g: Game, surname: string): 'white' | 'black' | null {
  if (wordRe(surname).test(g.w)) return 'white'
  if (wordRe(surname).test(g.b)) return 'black'
  return null
}

/** The result from `surname`'s point of view. */
export function outcomeFor(g: Game, surname: string): Outcome {
  const c = colorOf(g, surname)
  if (!c) return 'other'
  if (g.r === '1/2-1/2') return 'draw'
  if (g.r === '1-0') return c === 'white' ? 'win' : 'loss'
  if (g.r === '0-1') return c === 'black' ? 'win' : 'loss'
  return 'other'
}

/** Number of full moves in a game. */
export function moveCount(g: Game): number {
  return Math.ceil(g.m.split(' ').length / 2)
}

/** Filter a player's games by text (opponent, event, site, year, ECO), colour and outcome. */
export function searchGames(games: Game[], surname: string, q: GameSearch): Game[] {
  const words = (q.text ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  return games.filter((g) => {
    if (q.color && q.color !== 'any' && colorOf(g, surname) !== q.color) return false
    if (q.outcome && q.outcome !== 'any' && outcomeFor(g, surname) !== q.outcome) return false
    if (!words.length) return true
    const hay = [g.w, g.b, g.e, g.s, g.d, g.eco].join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** Every position in a game: [0] the start, then one frame per move. */
export function gameFrames(g: Game): Frame[] {
  const chess = g.fen ? new Chess(g.fen) : new Chess()
  const frames: Frame[] = [{ fen: chess.fen(), move: null, san: null }]
  for (const san of g.m.split(' ')) {
    const mv = chess.move(san)
    frames.push({ fen: chess.fen(), move: { from: mv.from, to: mv.to }, san: mv.san })
  }
  return frames
}

/** "1956-10-17" → "Oct 17, 1956"; "1956" stays "1956". */
export function formatDate(d?: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  if (!m) return y
  const month = new Date(Date.UTC(2000, Number(m) - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return day ? `${month} ${Number(day)}, ${y}` : `${month} ${y}`
}

export function resultText(r: string): string {
  return r === '1/2-1/2' ? '½–½' : r === '1-0' ? '1–0' : r === '0-1' ? '0–1' : '*'
}

// ---------- loading ----------

const base = `${import.meta.env?.BASE_URL ?? "/"}games/`
let indexPromise: Promise<GamesIndex> | null = null
const fileCache = new Map<string, Promise<Game[]>>()

export function loadGamesIndex(): Promise<GamesIndex> {
  indexPromise ??= fetch(`${base}index.json`).then((r) => {
    if (!r.ok) throw new Error('Game library not found. Run the game import step (see README).')
    return r.json() as Promise<GamesIndex>
  })
  indexPromise.catch(() => (indexPromise = null))
  return indexPromise
}

export function loadPlayerGames(file: string): Promise<Game[]> {
  let p = fileCache.get(file)
  if (!p) {
    p = fetch(`${base}${file}`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${file}`)
      return r.json() as Promise<Game[]>
    })
    p.catch(() => fileCache.delete(file))
    fileCache.set(file, p)
  }
  return p
}

// ---------- importance ----------

export type EventKind = 'worldch' | 'candidates' | 'olympiad' | 'elite' | 'national' | 'fast' | 'other'

const FAST = /blitz|bullet|rapid|speed|armageddon|titled|\b960\b|freestyle|fischer random|online|chess\.com|lichess|\bicc\b|banter|clutch|3-0|simul|blindfold|exhibition|casual|\bcct\b|tour final|invitational|inv prelim|inv final|prelim|meltwater|champions tour|crypto|airthings|chessable|esports|opera euro|skilling|lindores|\btb\b|tiebreak|playoff|\bko\b|bughouse|\d+m\+\d+/i
const WORLD_CH = /world ch|\bwch\b|world championship/i
const NOT_OPEN_WORLD_CH = /junior|women|\bu\d|youth|cadet|senior|team|girls|boys/i
const CANDIDATES = /candidat/i
const OLYMPIAD = /olympiad|\bolm\b/i
const ELITE =
  /tata|hoogovens|corus|wijk|linares|sinquefield|norway chess|dortmund|london (chess )?classic|zurich|avro|nottingham|st\.? ?petersburg|new york|tal mem|gashimov|grand chess tour|\bgct\b|shamkir|bilbao|dos hermanas|interzonal|superbet|congress|mar del plata|piatigorsky|montreal|\bmasters? final|world cup/i
const NATIONAL = /\bch\b|-ch\b|championship/i

/** What kind of event a game was played in (fast time controls win over the rest). */
export function eventKinds(event = ''): EventKind[] {
  const kinds: EventKind[] = []
  if (WORLD_CH.test(event) && !NOT_OPEN_WORLD_CH.test(event)) kinds.push('worldch')
  else if (CANDIDATES.test(event)) kinds.push('candidates')
  else if (OLYMPIAD.test(event)) kinds.push('olympiad')
  else if (ELITE.test(event)) kinds.push('elite')
  else if (NATIONAL.test(event)) kinds.push('national')
  if (FAST.test(event)) kinds.push('fast')
  return kinds.length ? kinds : ['other']
}

export const EVENT_LABEL: Partial<Record<EventKind, string>> = {
  worldch: 'World Championship',
  candidates: 'Candidates',
  olympiad: 'Olympiad',
  elite: 'Top tournament',
  national: 'Championship',
  fast: 'Blitz/Rapid',
}

/** World champions and long-time elite players: beating them matters more. */
const GREATS = new Set(
  (
    'steinitz lasker capablanca alekhine euwe botvinnik smyslov tal petrosian spassky fischer karpov kasparov kramnik ' +
    'anand topalov carlsen ding gukesh morphy anderssen chigorin tarrasch marshall rubinstein nimzowitsch reshevsky keres ' +
    'bronstein korchnoi larsen portisch timman short ivanchuk shirov aronian caruana nakamura so nepomniachtchi karjakin ' +
    'giri firouzja vachier-lagrave mamedyarov grischuk radjabov leko gelfand kamsky svidler morozevich adams polgar ' +
    'paulsen zukertort pillsbury schlechter maroczy janowski bogoljubov flohr fine geller stein tartakower'
  ).split(' '),
)

function opponentOf(g: Game, surname: string): { name: string; elo: number } {
  const c = colorOf(g, surname)
  return c === 'black' ? { name: g.w, elo: Number(g.we) || 0 } : { name: g.b, elo: Number(g.be) || 0 }
}

/**
 * How important a game is from `surname`'s point of view. Higher is more important.
 * Famous games always come first; then the event, the opponent, the result and
 * whether it was a real fight all add up.
 */
export function importance(g: Game, surname: string, famousIds: Set<string> = new Set()): number {
  let score = famousIds.has(g.id) ? 1000 : 0
  const kinds = eventKinds(g.e)
  if (kinds.includes('worldch')) score += 50
  if (kinds.includes('candidates')) score += 35
  if (kinds.includes('olympiad')) score += 15
  if (kinds.includes('elite')) score += 20
  if (kinds.includes('national')) score += 8
  if (kinds.includes('fast')) score -= 30

  const opp = opponentOf(g, surname)
  if (GREATS.has(surnameOf(opp.name).toLowerCase().split(' ')[0])) score += 20
  if (opp.elo >= 2750) score += 12
  else if (opp.elo >= 2650) score += 6

  const outcome = outcomeFor(g, surname)
  const moves = moveCount(g)
  if (outcome === 'win') score += 15
  if (outcome === 'loss') score += 3
  if (outcome === 'draw' && moves < 25) score -= 15
  if (outcome !== 'draw' && moves >= 20) score += 3
  if (moves < 10) score -= 20
  return score
}

export type GameSort = 'important' | 'newest' | 'oldest'

/** Sort games. Ties on importance fall back to newest first. */
export function sortGames(games: Game[], sort: GameSort, surname: string, famousIds: Set<string> = new Set()): Game[] {
  const byDate = (a: Game, b: Game) => (a.d ?? '').localeCompare(b.d ?? '')
  if (sort === 'oldest') return [...games].sort(byDate)
  if (sort === 'newest') return [...games].sort((a, b) => byDate(b, a))
  const scored = games.map((g) => [importance(g, surname, famousIds), g] as const)
  scored.sort((a, b) => b[0] - a[0] || byDate(b[1], a[1]))
  return scored.map(([, g]) => g)
}

// ---------- how the game ended ----------

/**
 * Explain how a game ended. PGN files only store the result (1-0, 0-1, ½-½),
 * so this replays the moves: checkmate, stalemate and the draw rules can be
 * seen on the board; otherwise the loser resigned (or, in fast games, may have
 * lost on time) and a draw was agreed.
 */
export function gameEnding(g: Game): string {
  const chess = g.fen ? new Chess(g.fen) : new Chess()
  for (const san of g.m.split(' ')) chess.move(san)
  const fast = eventKinds(g.e).includes('fast')

  if (chess.isCheckmate()) return `Checkmate. ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`
  if (g.r === '1-0' || g.r === '0-1') {
    const loser = g.r === '1-0' ? 'Black' : 'White'
    return fast ? `${loser} resigned or lost on time.` : `${loser} resigned.`
  }
  if (g.r === '1/2-1/2') {
    if (chess.isStalemate()) return 'Draw by stalemate.'
    if (chess.isInsufficientMaterial()) return 'Draw: not enough material left to checkmate.'
    if (chess.isThreefoldRepetition()) return 'Draw by repetition.'
    if (chess.isDrawByFiftyMoves()) return 'Draw by the 50-move rule.'
    return 'Draw agreed.'
  }
  return 'Result not recorded.'
}
