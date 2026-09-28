// Hand-picked famous games. The build script finds each one in the downloaded
// player files by who played, the year and (if needed) the round, event or
// result, so the moves always come from the source data, never typed in by hand.
//
// moveAt: [ply, san] is a signature move that must appear at exactly that point
// (ply 1 = White's first move). If it doesn't, the game is left out rather than
// risk showing the wrong one.

export const FAMOUS = [
  {
    id: 'game-of-the-century',
    title: 'The Game of the Century',
    player: 'fischer',
    white: 'Byrne',
    black: 'Fischer',
    year: '1956',
    moveAt: [34, 'Be6'],
    note: '13-year-old Bobby Fischer sacrifices his queen against Donald Byrne and hunts down the king with his minor pieces.',
  },
  {
    id: 'opera-game',
    title: 'The Opera Game',
    player: 'morphy',
    white: 'Morphy',
    black: ['Brunswick', 'Isouard', 'Allies', 'Duke'],
    year: '1858',
    moveAt: [33, 'Rd8#'],
    note: 'Played in a box at the Paris opera. Morphy develops fast, sacrifices, and finishes with a textbook mating attack.',
  },
  {
    id: 'kasparov-immortal',
    title: "Kasparov's Immortal",
    player: 'kasparov',
    white: 'Kasparov',
    black: 'Topalov',
    year: '1999',
    event: ['Hoogovens', 'Wijk', 'Corus'],
    moveAt: [47, 'Rxd4'],
    note: 'Kasparov gives up a rook with 24.Rxd4 and chases Topalov’s king across the board in one of the deepest combinations ever played.',
  },
  {
    id: 'fischer-spassky-6',
    title: 'Fischer vs Spassky, 1972 Game 6',
    player: 'fischer',
    white: 'Fischer',
    black: 'Spassky',
    year: '1972',
    round: '6',
    note: 'Fischer opens 1.c4 for a rare Queen’s Gambit and plays so smoothly that Spassky applauds at the end.',
  },
  {
    id: 'capablanca-marshall-1918',
    title: 'Capablanca vs Marshall, 1918',
    player: 'capablanca',
    white: 'Capablanca',
    black: 'Marshall',
    year: '1918',
    note: 'Marshall unveils his prepared gambit, the Marshall Attack. Capablanca defends calmly and wins.',
  },
  {
    id: 'karpov-kasparov-16',
    title: 'Karpov vs Kasparov, 1985 Game 16',
    player: 'kasparov',
    white: 'Karpov',
    black: 'Kasparov',
    year: '1985',
    round: '16',
    note: 'Kasparov’s knight on d3 paralyses White. A key win on his way to becoming world champion.',
  },
  {
    id: 'carlsen-ernst-2004',
    title: 'Carlsen vs Ernst, 2004',
    player: 'carlsen',
    white: 'Carlsen',
    black: 'Ernst',
    year: '2004',
    note: 'A 13-year-old Magnus Carlsen sacrifices his way to a mating attack at Wijk aan Zee.',
  },
  {
    id: 'aronian-anand-2013',
    title: 'Aronian vs Anand, 2013',
    player: 'anand',
    white: 'Aronian',
    black: 'Anand',
    year: '2013',
    event: ['Tata', 'Wijk'],
    note: 'Anand, with Black, launches a stunning series of sacrifices. Often called the best game of his career.',
  },
  {
    id: 'ding-gukesh-14',
    title: 'Ding vs Gukesh, 2024 Game 14',
    player: 'gukesh',
    white: 'Ding',
    black: 'Gukesh',
    year: '2024',
    round: '14',
    moveAt: [109, 'Rf2'],
    note: 'The last classical game of the 2024 World Championship. Heading for a draw, Ding blunders with 55.Rf2 and Gukesh becomes the youngest world champion.',
  },
  {
    id: 'byrne-fischer-1963',
    title: 'R. Byrne vs Fischer, 1963',
    player: 'fischer',
    white: 'Byrne, R',
    black: 'Fischer',
    year: '1963',
    moveAt: [30, 'Nxf2'],
    note: 'Fischer sacrifices with 15...Nxf2 in the US Championship. Byrne resigned while commentators still thought White was fine.',
  },
  {
    id: 'paulsen-morphy-1857',
    title: 'Paulsen vs Morphy, 1857',
    player: 'morphy',
    white: 'Paulsen',
    black: 'Morphy',
    year: '1857',
    moveAt: [34, 'Qxf3'],
    note: 'Morphy gives up his queen with 17...Qxf3 for a crushing attack at the First American Chess Congress.',
  },
  {
    id: 'botvinnik-tal-1960-6',
    title: 'Botvinnik vs Tal, 1960 Game 6',
    player: 'tal',
    white: 'Botvinnik',
    black: 'Tal',
    year: '1960',
    round: '6',
    moveAt: [42, 'Nf4'],
    note: 'Tal’s knight sacrifice 21...Nf4 throws the world champion into chaos. Tal went on to win the title.',
  },
  {
    id: 'tal-larsen-1965',
    title: 'Tal vs Larsen, 1965',
    player: 'tal',
    white: 'Tal',
    black: 'Larsen',
    year: '1965',
    round: '10',
    moveAt: [31, 'Nd5'],
    note: 'The deciding game of their Candidates match. Tal’s speculative 16.Nd5 sacrifice is one of the most debated moves in chess history.',
  },
  {
    id: 'capablanca-tartakower-1924',
    title: 'Capablanca vs Tartakower, 1924',
    player: 'capablanca',
    white: 'Capablanca',
    black: 'Tartakower',
    year: '1924',
    result: '1-0',
    note: 'A classic rook endgame: Capablanca gives up pawns so his king can march in. Still taught as a model of endgame technique.',
  },
  {
    id: 'karpov-kasparov-24',
    title: 'Karpov vs Kasparov, 1985 Game 24',
    player: 'kasparov',
    white: 'Karpov',
    black: 'Kasparov',
    year: '1985',
    round: '24',
    note: 'The last game of the 1985 match. Kasparov wins with Black and becomes the youngest world champion at the time.',
  },
  {
    id: 'topalov-anand-2010-12',
    title: 'Topalov vs Anand, 2010 Game 12',
    player: 'anand',
    white: 'Topalov',
    black: 'Anand',
    year: '2010',
    round: '12',
    note: 'The final game of the 2010 World Championship. Anand wins with Black to keep his title.',
  },
  {
    id: 'carlsen-anand-2013-5',
    title: 'Carlsen vs Anand, 2013 Game 5',
    player: 'carlsen',
    white: 'Carlsen',
    black: 'Anand',
    year: '2013',
    round: '5',
    event: ['WCh'],
    note: 'Carlsen’s first win in his World Championship match against Anand, grinding out a long endgame. He won the title a few games later.',
  },
  {
    id: 'carlsen-karjakin-2016-tb4',
    title: 'Carlsen vs Karjakin, 2016 Tiebreak',
    player: 'carlsen',
    white: 'Carlsen',
    black: 'Karjakin',
    year: '2016',
    moveAt: [99, 'Qh6+'],
    note: 'The last tiebreak game of the 2016 World Championship ends with the queen sacrifice 50.Qh6+. Carlsen keeps his title.',
  },
  {
    id: 'carlsen-caruana-2014',
    title: 'Carlsen vs Caruana, 2014',
    player: 'caruana',
    white: 'Carlsen',
    black: 'Caruana',
    year: '2014',
    event: ['Sinquefield'],
    result: '0-1',
    note: 'Part of Caruana’s famous 7-0 start at the 2014 Sinquefield Cup, one of the greatest tournament runs ever.',
  },
  {
    id: 'nepo-ding-2023-tb4',
    title: 'Nepomniachtchi vs Ding, 2023 Tiebreak',
    player: 'ding',
    white: 'Nepomniachtchi',
    black: 'Ding',
    year: '2023',
    event: ['Rapid TB'],
    round: '4',
    note: 'The final rapid tiebreak game of the 2023 World Championship. Ding wins with Black and becomes China’s first men’s world champion.',
  },
  {
    id: 'gukesh-ding-2024-3',
    title: 'Gukesh vs Ding, 2024 Game 3',
    player: 'gukesh',
    white: 'Gukesh',
    black: 'Ding',
    year: '2024',
    event: ['WCh'],
    round: '3',
    note: 'After losing the first game, Gukesh strikes back for his first World Championship win to level the match.',
  },
]

const any = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])
const has = (text, words) => words.length === 0 || words.some((w) => new RegExp(`\\b${w}`, 'i').test(text ?? ''))

/** Games in `games` (app format) that match a famous-game spec. */
export function findFamous(games, spec) {
  return games.filter(
    (g) =>
      has(g.w, any(spec.white)) &&
      has(g.b, any(spec.black)) &&
      (g.d ?? '').startsWith(spec.year) &&
      (!spec.round || (g.rd ?? '').split('.')[0] === spec.round) &&
      (!spec.result || g.r === spec.result) &&
      (!spec.moveAt || (g.m ?? '').split(' ')[spec.moveAt[0] - 1] === spec.moveAt[1]) &&
      has(g.e, any(spec.event)),
  )
}

/**
 * Resolve every famous game against the loaded player collections.
 * Returns the index entries plus a log line for each game that was skipped.
 */
export function resolveFamous(byPlayer) {
  const famous = []
  const log = []
  for (const spec of FAMOUS) {
    const pool = byPlayer[spec.player]
    if (!pool) {
      log.push(`"${spec.title}" skipped (no ${spec.player} file)`)
      continue
    }
    const hits = findFamous(pool, spec)
    if (hits.length !== 1) {
      log.push(`"${spec.title}" ${hits.length ? `matched ${hits.length} games` : 'not found'}, skipped`)
      continue
    }
    famous.push({ id: spec.id, title: spec.title, note: spec.note, player: spec.player, gameId: hits[0].id })
  }
  return { famous, log }
}
