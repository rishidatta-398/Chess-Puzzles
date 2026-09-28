import { useState } from 'react'
import { GameViewer } from '../components/GameViewer'
import { displayName, formatDate, moveCount, resultText } from '../lib/games'
import { deleteMyGame, loadMyGames, parseImport, saveMyGames, type MyGame } from '../lib/myGames'
import { hrefFor } from '../lib/useHashRoute'

// ---------- "Your games" section on the library home ----------

export function YourGames() {
  const [games, setGames] = useState<MyGame[]>(loadMyGames)
  return (
    <section>
      <h2 className="section-title">Your games</h2>
      <p className="dim small">
        Import any game (like your own, exported from Chess.com or Lichess) and get a full Stockfish review.
      </p>
      <div className="cards">
        <a className="game-card import-card" href={hrefFor('games', 'import')}>
          <b>＋ Import a game</b>
          <span className="dim small">Paste a PGN or upload a .pgn file</span>
        </a>
        {games.map((g) => (
          <div key={g.id} className="game-card mine">
            <a href={hrefFor('games', 'mine', g.id)}>
              <b>
                {displayName(g.w)} <span className="dim">vs</span> {displayName(g.b)}
              </b>
              <span className="dim small">
                {[resultText(g.r), formatDate(g.d), `${moveCount(g)} moves`].filter(Boolean).join(' · ')}
              </span>
            </a>
            <button
              className="remove"
              aria-label="Remove this game"
              title="Remove"
              onClick={() => setGames(deleteMyGame(g.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- import page ----------

const EXAMPLE = `[White "You"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`

export function ImportPage() {
  const [text, setText] = useState('')
  const [me, setMe] = useState<'' | 'white' | 'black'>('')
  const [errors, setErrors] = useState<string[]>([])
  const [done, setDone] = useState<MyGame[] | null>(null)

  function doImport() {
    const { games, errors } = parseImport(text, me || undefined)
    setErrors(errors)
    if (!games.length) return
    saveMyGames(games)
    if (games.length === 1 && !errors.length) {
      window.location.hash = hrefFor('games', 'mine', games[0].id)
      return
    }
    setDone(games)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setText(await file.text())
    setErrors([])
  }

  return (
    <div className="library import-page">
      <p className="crumbs">
        <a href={hrefFor('games')}>Library</a> / Import a game
      </p>
      <h2 className="section-title">Import a game</h2>
      <ol className="steps dim small">
        <li>
          <b>Chess.com:</b> open the game, click Share (↗), choose PGN, then copy it or download it.
        </li>
        <li>
          <b>Lichess:</b> open the game, click Share &amp; export, then copy the PGN.
        </li>
        <li>Paste it below (or upload the .pgn file). A file with several games imports them all.</li>
      </ol>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setErrors([])
        }}
        placeholder={EXAMPLE}
        rows={12}
        spellCheck={false}
        aria-label="Game PGN"
      />
      <div className="buttons import-row">
        <label className="file-btn">
          Upload .pgn
          <input type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" onChange={(e) => onFile(e.target.files?.[0])} hidden />
        </label>
        <label className="inline">
          I played
          <select value={me} onChange={(e) => setMe(e.target.value as '' | 'white' | 'black')}>
            <option value="">Not me / don’t say</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </label>
        <button className="primary" onClick={doImport} disabled={!text.trim()}>
          Import
        </button>
      </div>

      {errors.length > 0 && (
        <div className="error-box">
          {errors.map((e, i) => (
            <p key={i} className="error">
              {e}
            </p>
          ))}
        </div>
      )}

      {done && (
        <div className="card">
          <p>
            <b>Imported {done.length} {done.length === 1 ? 'game' : 'games'}.</b>
          </p>
          <ul className="plain">
            {done.map((g) => (
              <li key={g.id}>
                <a href={hrefFor('games', 'mine', g.id)}>
                  {displayName(g.w)} vs {displayName(g.b)} ({resultText(g.r)})
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------- one imported game ----------

export function MyGamePage({ id }: { id: string }) {
  const game = loadMyGames().find((g) => g.id === id)
  if (!game) {
    return (
      <div className="placeholder">
        <h2>Game not found</h2>
        <p>
          It may have been removed. <a href={hrefFor('games')}>Back to the library</a>
        </p>
      </div>
    )
  }
  const elo = (e?: string) => (e ? ` (${e})` : '')
  return (
    <div>
      <p className="crumbs">
        <a href={hrefFor('games')}>Library</a> / Your games / {displayName(game.w)} vs {displayName(game.b)}
      </p>
      <GameViewer game={game} orientation={game.me ?? 'white'}>
        <div className="card">
          <p className="matchup">
            <span className="dot white" /> {displayName(game.w)}
            {elo(game.we)}
            {game.me === 'white' && <span className="you"> (you)</span>}
            <br />
            <span className="dot black" /> {displayName(game.b)}
            {elo(game.be)}
            {game.me === 'black' && <span className="you"> (you)</span>}
          </p>
          <p className="dim small">{[game.e, game.s, formatDate(game.d)].filter(Boolean).join(' · ')}</p>
          <p>
            <b>Result: {resultText(game.r)}</b>
          </p>
        </div>
      </GameViewer>
    </div>
  )
}
