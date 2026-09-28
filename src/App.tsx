import { useHashRoute, type Route } from './lib/useHashRoute'
import { PuzzlesPage } from './pages/PuzzlesPage'
import { BoardPage } from './pages/BoardPage'
import { GamesPage } from './pages/GamesPage'
import './App.css'

const TABS: { route: Route; label: string }[] = [
  { route: 'puzzles', label: 'Puzzles' },
  { route: 'games', label: 'Games' },
  { route: 'board', label: 'Board' },
]

export default function App() {
  const { route, params } = useHashRoute()

  return (
    <div className="app">
      <header className="top">
        <h1>Chess Study</h1>
        <nav aria-label="Sections">
          {TABS.map((t) => (
            <a key={t.route} href={`#/${t.route}`} className={route === t.route ? 'active' : ''}>
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {route === 'puzzles' && <PuzzlesPage />}
        {route === 'games' && <GamesPage params={params} />}
        {route === 'board' && <BoardPage />}
      </main>

      <footer className="credits">
        Puzzles from the <a href="https://database.lichess.org/#puzzles">Lichess puzzle database</a> (CC0) · Games from{' '}
        <a href="https://www.pgnmentor.com/files.html">PGN Mentor</a> · Engine:{' '}
        <a href="https://github.com/official-stockfish/Stockfish">Stockfish</a> 19 (GPL-3.0,{' '}
        <a href="engine/COPYING-stockfish.txt">license</a>)
      </footer>
    </div>
  )
}
