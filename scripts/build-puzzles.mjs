#!/usr/bin/env node
// Builds public/puzzles/ from the Lichess puzzle database.
//
// 1. Download https://database.lichess.org/lichess_db_puzzle.csv.zst
// 2. Run:  zstd -dc lichess_db_puzzle.csv.zst | node scripts/build-puzzles.mjs
//    (on a Mac without zstd:  brew install zstd)
//
// Puzzles are split into one file per 100 rating points per game phase
// (opening / middlegame / endgame), so the app only loads what you pick.
//
// Options (env vars):
//   PER_FILE  max puzzles per rating band per phase (default 8000)
//   OUT       output folder (default public/puzzles)

import { createInterface } from 'node:readline'
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  BucketSampler,
  BUCKET_SIZE,
  DEFAULT_FILTERS,
  PHASES,
  bucketFileName,
  bucketOf,
  parseRow,
  passesFilters,
  phaseOf,
  toCompact,
} from './puzzleCsv.mjs'

const PER_FILE = Number(process.env.PER_FILE ?? 8000)
const OUT = process.env.OUT ?? 'public/puzzles'

const samplers = new Map() // key: `${bucket}|${phase}`
let seen = 0
let kept = 0

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
for await (const line of rl) {
  const row = parseRow(line)
  if (!row) continue
  seen++
  if (seen % 1000000 === 0) process.stderr.write(`  read ${seen.toLocaleString()} puzzles\n`)
  if (!passesFilters(row)) continue
  kept++
  const key = `${bucketOf(row.rating)}|${phaseOf(row.themes)}`
  if (!samplers.has(key)) samplers.set(key, new BucketSampler(PER_FILE))
  samplers.get(key).offer(row)
}

if (seen === 0) {
  console.error('No puzzles read. Pipe the decompressed CSV into this script.')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) if (f.endsWith('.json')) rmSync(join(OUT, f))

const mins = [...new Set([...samplers.keys()].map((k) => Number(k.split('|')[0])))].sort((a, b) => a - b)
const buckets = []
const themeCounts = {}
const phaseTotals = Object.fromEntries(PHASES.map((p) => [p, 0]))
let total = 0

for (const min of mins) {
  const files = {}
  let count = 0
  for (const phase of PHASES) {
    const sampler = samplers.get(`${min}|${phase}`)
    if (!sampler) continue
    const rows = sampler.result().sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))
    if (!rows.length) continue
    for (const r of rows) for (const t of r.themes.split(' ')) if (t) themeCounts[t] = (themeCounts[t] ?? 0) + 1
    const file = bucketFileName(min, phase)
    writeFileSync(join(OUT, file), JSON.stringify(rows.map(toCompact)))
    files[phase] = { file, count: rows.length }
    count += rows.length
    phaseTotals[phase] += rows.length
  }
  buckets.push({ min, max: min + BUCKET_SIZE - 1, count, files })
  total += count
}

const index = {
  version: 2,
  source: 'Lichess puzzle database (CC0), https://database.lichess.org/#puzzles',
  builtAt: new Date().toISOString(),
  filters: DEFAULT_FILTERS,
  perFile: PER_FILE,
  total,
  phases: phaseTotals,
  buckets,
  themes: Object.fromEntries(Object.entries(themeCounts).sort((a, b) => b[1] - a[1])),
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2))

console.log(`Read ${seen.toLocaleString()} puzzles, ${kept.toLocaleString()} passed the quality filters.`)
console.log(`Wrote ${total.toLocaleString()} puzzles to ${OUT}/`)
for (const p of PHASES) console.log(`  ${p}: ${phaseTotals[p].toLocaleString()}`)
