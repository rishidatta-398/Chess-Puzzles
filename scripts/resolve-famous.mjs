#!/usr/bin/env node
// Re-finds the famous games (scripts/famous.mjs) in already-built player files
// and updates public/games/index.json. Much faster than re-importing.
//
// Usage: node scripts/resolve-famous.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { FAMOUS, resolveFamous } from './famous.mjs'

const OUT = process.env.OUT ?? 'public/games'
const index = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8'))
const byPlayer = Object.fromEntries(
  index.players.map((p) => [p.id, JSON.parse(readFileSync(join(OUT, p.file), 'utf8'))]),
)
const { famous, log } = resolveFamous(byPlayer)
for (const line of log) console.log(`  ${line}`)
index.famous = famous
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2))
console.log(`Famous games found: ${famous.length} of ${FAMOUS.length}`)
