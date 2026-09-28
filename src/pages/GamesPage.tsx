import { useEffect, useMemo, useState } from 'react'
import { GameViewer } from '../components/GameViewer'
import {
  EVENT_LABEL,
  colorOf,
  displayName,
  eventKinds,
  formatDate,
  loadGamesIndex,
  loadPlayerGames,
  moveCount,
  outcomeFor,
  resultText,
  searchGames,
  sortGames,
  type Game,
  type GameSort,
  type GameSearch,
  type GamesIndex,
  type PlayerInfo,
} from '../lib/games'
import { hrefFor } from '../lib/useHashRoute'
import { ImportPage, MyGamePage, YourGames } from './MyGames'

const PAGE = 50

/** Famous games library: #/games, #/games/<player>, #/games/<player>/<gameId>. */
export function GamesPage({ params }: { params: string[] }) {
  const [index, setIndex] = useState<GamesIndex | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadGamesIndex()
      .then(setIndex)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  // Your own games don't need the library data.
  if (params[0] === 'import') return <ImportPage />
  if (params[0] === 'mine' && params[1]) return <MyGamePage key={params[1]} id={params[1]} />

  if (error) {
    return (
      <div className="placeholder">
        <h2>Game library missing</h2>
        <p>{error}</p>
      </div>
    )
  }
  if (!index) return <p className="dim">Loading games…</p>

  const [playerId, gameId] = params
  const player = index.players.find((p) => p.id === playerId)
  if (playerId && !player) {
    return (
      <div className="placeholder">
        <h2>Player not found</h2>
        <p>
          <a href={hrefFor('games')}>Back to the library</a>
        </p>
      </div>
    )
  }
  if (player && gameId) return <GamePage key={player.id} index={index} player={player} gameId={gameId} />
  // key: start with fresh filters when switching players
  if (player) return <PlayerPage key={player.id} player={player} index={index} />
  return <LibraryHome index={index} />
}

// ---------- library home ----------

function LibraryHome({ index }: { index: GamesIndex }) {
  const total = index.players.reduce((n, p) => n + p.count, 0)
  const nameOf = (id: string) => index.players.find((p) => p.id === id)?.name ?? id
  return (
    <div className="library">
      <YourGames />

      {index.famous.length > 0 && (
        <section>
          <h2 className="section-title">Famous games</h2>
          <div className="cards">
            {index.famous.map((f) => (
              <a key={f.id} className="game-card" href={hrefFor('games', f.player, f.gameId)}>
                <b>{f.title}</b>
                <span className="dim small">{nameOf(f.player)} collection</span>
                <p>{f.note}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Players</h2>
        <p className="dim small">{total.toLocaleString()} games from {index.players.length} players.</p>
        <div className="cards players">
          {index.players.map((p) => (
            <a key={p.id} className="game-card" href={hrefFor('games', p.id)}>
              <b>{p.name}</b>
              <span className="dim small">
                {p.count.toLocaleString()} games{p.from ? ` · ${p.from}${p.to && p.to !== p.from ? `–${p.to}` : ''}` : ''}
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

// ---------- one player's games ----------

function PlayerPage({ player, index }: { player: PlayerInfo; index: GamesIndex }) {
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState<GameSearch>({ text: '', color: 'any', outcome: 'any' })
  const [sort, setSort] = useState<GameSort>('important')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    loadPlayerGames(player.file)
      .then(setGames)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [player.file])

  const famousIds = useMemo(() => new Set(index.famous.map((f) => f.gameId)), [index.famous])

  // Famous games this player took part in (from any player's collection; ids match across files).
  const pinned = useMemo(() => {
    if (!games) return []
    const mine = new Set(games.map((g) => g.id))
    return index.famous.filter((f) => mine.has(f.gameId))
  }, [games, index.famous])

  const results = useMemo(() => {
    if (!games) return []
    return sortGames(searchGames(games, player.surname, search), sort, player.surname, famousIds)
  }, [games, player.surname, search, sort, famousIds])

  const stats = useMemo(() => {
    const s = { win: 0, draw: 0, loss: 0 }
    for (const g of results) {
      const o = outcomeFor(g, player.surname)
      if (o !== 'other') s[o]++
    }
    return s
  }, [results, player.surname])

  const update = (patch: Partial<GameSearch>) => {
    setSearch((s) => ({ ...s, ...patch }))
    setShown(PAGE)
  }

  return (
    <div className="library">
      <p className="crumbs">
        <a href={hrefFor('games')}>Library</a> / {player.name}
      </p>
      <h2 className="section-title">{player.name}</h2>

      {pinned.length > 0 && (
        <section>
          <h3 className="sub-title">Famous games</h3>
          <div className="cards">
            {pinned.map((f) => (
              <a key={f.id} className="game-card" href={hrefFor('games', player.id, f.gameId)}>
                <b>★ {f.title}</b>
                <p>{f.note}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <h3 className="sub-title">All games</h3>
      <div className="filters">
        <input
          type="search"
          placeholder="Search opponent, event, year, opening code…"
          value={search.text}
          onChange={(e) => update({ text: e.target.value })}
          aria-label="Search games"
        />
        <select value={search.color} onChange={(e) => update({ color: e.target.value as GameSearch['color'] })} aria-label="Colour">
          <option value="any">Any colour</option>
          <option value="white">As White</option>
          <option value="black">As Black</option>
        </select>
        <select value={search.outcome} onChange={(e) => update({ outcome: e.target.value as GameSearch['outcome'] })} aria-label="Result">
          <option value="any">Any result</option>
          <option value="win">Wins</option>
          <option value="draw">Draws</option>
          <option value="loss">Losses</option>
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as GameSort)
            setShown(PAGE)
          }}
          aria-label="Sort"
        >
          <option value="important">Most important</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {!games && !error && <p className="dim">Loading games…</p>}
      {games && (
        <>
          <p className="dim small">
            {results.length.toLocaleString()} games · {stats.win} wins, {stats.draw} draws, {stats.loss} losses
          </p>
          <ul className="game-list">
            {results.slice(0, shown).map((g) => {
              const o = outcomeFor(g, player.surname)
              return (
                <li key={g.id}>
                  <a href={hrefFor('games', player.id, g.id)}>
                    <span className={`res res-${o}`}>{resultText(g.r)}</span>
                    <span className="players">
                      {famousIds.has(g.id) && <span className="star" title="Famous game">★ </span>}
                      {displayName(g.w)} <span className="dim">vs</span> {displayName(g.b)}
                      {eventKinds(g.e)
                        .filter((k) => EVENT_LABEL[k])
                        .map((k) => (
                          <span key={k} className={`badge badge-${k}`}>
                            {EVENT_LABEL[k]}
                          </span>
                        ))}
                    </span>
                    <span className="dim small meta">
                      {[g.e, formatDate(g.d)].filter(Boolean).join(' · ')} · {moveCount(g)} moves
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
          {shown < results.length && (
            <button className="more" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({(results.length - shown).toLocaleString()} left)
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ---------- one game ----------

function GamePage({ index, player, gameId }: { index: GamesIndex; player: PlayerInfo; gameId: string }) {
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPlayerGames(player.file)
      .then(setGames)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [player.file])

  if (error) return <p className="error">{error}</p>
  if (!games) return <p className="dim">Loading game…</p>
  const game = games.find((g) => g.id === gameId)
  if (!game) {
    return (
      <div className="placeholder">
        <h2>Game not found</h2>
        <p>
          <a href={hrefFor('games', player.id)}>Back to {player.name}</a>
        </p>
      </div>
    )
  }

  const famous = index.famous.find((f) => f.gameId === game.id)
  const color = colorOf(game, player.surname) ?? 'white'
  const elo = (e?: string) => (e ? ` (${e})` : '')

  return (
    <div>
      <p className="crumbs">
        <a href={hrefFor('games')}>Library</a> / <a href={hrefFor('games', player.id)}>{player.name}</a> /{' '}
        {famous?.title ?? `${surnameOrName(game.w)} vs ${surnameOrName(game.b)}`}
      </p>
      <GameViewer game={game} orientation={color}>
        <div className="card">
          {famous && <p className="famous-title">{famous.title}</p>}
          <p className="matchup">
            <span className="dot white" /> {displayName(game.w)}
            {elo(game.we)}
            <br />
            <span className="dot black" /> {displayName(game.b)}
            {elo(game.be)}
          </p>
          <p className="dim small">
            {[game.e, game.rd && `Round ${game.rd}`, game.s, formatDate(game.d)].filter(Boolean).join(' · ')}
          </p>
          <p>
            <b>Result: {resultText(game.r)}</b>
            {game.eco && <span className="dim small"> · Opening code {game.eco}</span>}
          </p>
          {famous && <p className="note">{famous.note}</p>}
        </div>
      </GameViewer>
    </div>
  )
}

function surnameOrName(n: string) {
  return n.split(',')[0].trim()
}
