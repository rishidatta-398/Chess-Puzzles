#!/usr/bin/env node
// Builds public/games/ from player PGN collections (e.g. from pgnmentor.com).
//
// Usage:
//   node scripts/build-games.mjs ~/Downloads/Fischer.zip ~/Downloads/Carlsen.zip ...
//   node scripts/build-games.mjs ~/Downloads/*.zip
//
// Accepts .zip (needs the `unzip` command) and .pgn files. The player is taken
// from the file name, so Fischer.zip becomes the "Fischer" collection.
//
// Options (env vars): OUT (default public/games)

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { Chess } from 'chess.js'
import { clean, gameId, moveText, nameMatches, normalizeDate, parseHeaders, sanTokens, splitPgn } from './pgn.mjs'
import { FAMOUS, resolveFamous } from './famous.mjs'

/** Known players: file name → display name and the surname used in PGN headers. */
const PLAYERS = {
  fischer: { name: 'Bobby Fischer', surname: 'Fischer' },
  carlsen: { name: 'Magnus Carlsen', surname: 'Carlsen' },
  kasparov: { name: 'Garry Kasparov', surname: 'Kasparov' },
  morphy: { name: 'Paul Morphy', surname: 'Morphy' },
  capablanca: { name: 'José Raúl Capablanca', surname: 'Capablanca' },
  tal: { name: 'Mikhail Tal', surname: 'Tal' },
  karpov: { name: 'Anatoly Karpov', surname: 'Karpov' },
  anand: { name: 'Viswanathan Anand', surname: 'Anand' },
  nakamura: { name: 'Hikaru Nakamura', surname: 'Nakamura' },
  caruana: { name: 'Fabiano Caruana', surname: 'Caruana' },
  ding: { name: 'Ding Liren', surname: 'Ding' },
  gukesh: { name: 'Gukesh Dommaraju', surname: 'Gukesh' },
}

const OUT = process.env.OUT ?? 'public/games'
const inputs = process.argv.slice(2)
if (!inputs.length) {
  console.error('Give me some .zip or .pgn files, e.g.: node scripts/build-games.mjs ~/Downloads/*.zip')
  process.exit(1)
}

function readPgnText(path) {
  if (extname(path).toLowerCase() === '.zip') {
    const r = spawnSync('unzip', ['-p', path], { maxBuffer: 1024 * 1024 * 1024 })
    if (r.status !== 0) throw new Error(`unzip failed for ${path}: ${r.stderr}`)
    return r.stdout.toString('latin1') // PGN files are usually Latin-1
  }
  return readFileSync(path, 'latin1')
}

/** Parse one PGN game into the app's compact format, or null if it can't be replayed. */
function toGame(gameText) {
  const h = parseHeaders(gameText)
  const fen = h.SetUp === '1' || h.FEN ? h.FEN : undefined
  let chess
  try {
    chess = fen ? new Chess(fen) : new Chess()
  } catch {
    return null
  }
  const sans = []
  for (const tok of sanTokens(moveText(gameText))) {
    try {
      sans.push(chess.move(tok, { strict: false }).san)
    } catch {
      return null
    }
  }
  if (!sans.length) return null
  const w = clean(h.White)
  const b = clean(h.Black)
  const d = normalizeDate(h.Date)
  const game = {
    id: gameId(w, b, d, sans),
    w,
    b,
    r: clean(h.Result) || '*',
    d,
    e: clean(h.Event),
    s: clean(h.Site),
    rd: clean(h.Round),
    eco: clean(h.ECO),
    we: clean(h.WhiteElo),
    be: clean(h.BlackElo),
    m: sans.join(' '),
  }
  if (fen) game.fen = fen
  for (const k of Object.keys(game)) if (game[k] === '') delete game[k]
  return game
}

mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) if (f.endsWith('.json')) rmSync(join(OUT, f))

const players = []
const byPlayer = {}
for (const path of inputs) {
  const key = basename(path, extname(path)).toLowerCase().replace(/[^a-z]/g, '')
  const meta = PLAYERS[key] ?? { name: basename(path, extname(path)), surname: basename(path, extname(path)) }
  const texts = splitPgn(readPgnText(path))
  const seen = new Set()
  const games = []
  let skipped = 0
  let notTheirs = 0
  for (const t of texts) {
    const g = toGame(t)
    if (!g) {
      skipped++
      continue
    }
    if (!nameMatches(g.w, meta.surname) && !nameMatches(g.b, meta.surname)) {
      notTheirs++
      continue
    }
    if (seen.has(g.id)) continue
    seen.add(g.id)
    games.push(g)
  }
  games.sort((a, b) => (a.d ?? '').localeCompare(b.d ?? '') || (a.rd ?? '').localeCompare(b.rd ?? '', undefined, { numeric: true }))
  const file = `${key}.json`
  writeFileSync(join(OUT, file), JSON.stringify(games))
  const years = games.map((g) => g.d?.slice(0, 4)).filter(Boolean).sort()
  players.push({ id: key, name: meta.name, surname: meta.surname, file, count: games.length, from: years[0], to: years.at(-1) })
  byPlayer[key] = games
  console.log(
    `${meta.name}: ${games.length.toLocaleString()} games` +
      (skipped ? `, ${skipped} unreadable skipped` : '') +
      (notTheirs ? `, ${notTheirs} not involving ${meta.surname} skipped` : ''),
  )
}

const { famous, log } = resolveFamous(byPlayer)
for (const line of log) console.log(`  famous: ${line}`)
console.log(`Famous games found: ${famous.length} of ${FAMOUS.length}`)

players.sort((a, b) => b.count - a.count)
writeFileSync(
  join(OUT, 'index.json'),
  JSON.stringify({ version: 1, builtAt: new Date().toISOString(), players, famous }, null, 2),
)
console.log(`Wrote ${players.reduce((n, p) => n + p.count, 0).toLocaleString()} games to ${OUT}/`)
