import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlayableBoard } from '../components/PlayableBoard'
import { MoveList } from '../components/MoveList'
import { humanize } from '../lib/themes'
import {
  PHASES,
  countMatching,
  loadIndex,
  preparePuzzle,
  randomPuzzle,
  type Phase,
  type PuzzleFilter,
  type PuzzleIndex,
} from '../lib/puzzles'
import { attemptMove, giveUp, hintSquare, playReply, startSolver, takeHint, type SolverState } from '../lib/puzzleSolver'
import { buildTimeline, lastViewable, step } from '../lib/puzzleTimeline'

const RATINGS = Array.from({ length: 28 }, (_, i) => 400 + i * 100) // 400 … 3100
const REPLY_DELAY = 450
const PHASE_LABEL: Record<Phase, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' }
const WRONG_FLASH = 700

type Feedback = 'none' | 'correct' | 'wrong' | 'solved' | 'gaveUp'
type Score = { firstTry: number; done: number; streak: number }

export function PuzzlesPage() {
  const [index, setIndex] = useState<PuzzleIndex | null>(null)
  const [error, setError] = useState('')
  const [min, setMin] = useState(1000)
  const [max, setMax] = useState(1400)
  const [phases, setPhases] = useState<Phase[]>([...PHASES])
  const [loading, setLoading] = useState(false)

  const [solver, setSolver] = useState<SolverState | null>(null)
  const [feedback, setFeedback] = useState<Feedback>('none')
  const [busy, setBusy] = useState(false) // opponent replying or wrong move flashing
  const [flash, setFlash] = useState<{ fen: string; from: string; to: string } | null>(null)
  const [view, setView] = useState<number | null>(null) // timeline index being viewed, null = live
  const [hintPly, setHintPly] = useState<number | null>(null) // hint shown for this ply only
  const [score, setScore] = useState<Score>({ firstTry: 0, done: 0, streak: 0 })
  const [rangeInfo, setRangeInfo] = useState<{ total: number; left: number } | null>(null)

  const seen = useRef(new Set<string>())
  const recorded = useRef(false)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const record = useCallback((firstTry: boolean) => {
    if (recorded.current) return
    recorded.current = true
    setScore((s) => ({
      firstTry: s.firstTry + (firstTry ? 1 : 0),
      done: s.done + 1,
      streak: firstTry ? s.streak + 1 : 0,
    }))
  }, [])

  const next = useCallback(async (filter: PuzzleFilter) => {
    clearTimers()
    setLoading(true)
    setError('')
    try {
      const p = await randomPuzzle(filter, seen.current)
      if (!p) {
        setError('No puzzles left for these settings. Try a wider range or another phase.')
        return
      }
      seen.current.add(p.id)
      recorded.current = false
      setSolver(startSolver(preparePuzzle(p)))
      setFeedback('none')
      setFlash(null)
      setBusy(false)
      setView(null)
      setHintPly(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIndex()
      .then((ix) => {
        setIndex(ix)
        return next({ min: 1000, max: 1400, phases: [...PHASES] })
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
    return clearTimers
  }, [next])

  const timeline = useMemo(
    () => (solver ? buildTimeline(solver.prepared) : []),
    [solver?.prepared], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const finished = feedback === 'solved' || feedback === 'gaveUp'
  const last = solver ? lastViewable(timeline, solver.ply, finished) : 0
  const showHint = solver !== null && hintPly === solver.ply

  // Count puzzles in the chosen range, and how many haven't been shown yet.
  const currentId = solver?.prepared.puzzle.id
  useEffect(() => {
    if (!index) return
    let cancelled = false
    countMatching({ min, max, phases }, seen.current)
      .then((info) => !cancelled && setRangeInfo(info))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [index, min, max, phases, currentId])

  function togglePhase(ph: Phase) {
    setPhases((cur) => {
      if (cur.includes(ph)) return cur.length > 1 ? cur.filter((x) => x !== ph) : cur
      return PHASES.filter((x) => x === ph || cur.includes(x))
    })
  }

  // Arrow keys step through the puzzle's history (any time, not just after finishing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setView((v) => step(v, -1, last))
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setView((v) => step(v, 1, last))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  function handleMove(from: string, to: string): boolean {
    if (!solver || busy || finished || view !== null) return false
    const r = attemptMove(solver, from, to)
    switch (r.kind) {
      case 'illegal':
        return false
      case 'wrong':
        setSolver(r.state)
        setFeedback('wrong')
        setFlash(r.wrongMove)
        setBusy(true)
        later(() => {
          setFlash(null)
          setBusy(false)
        }, WRONG_FLASH)
        return true
      case 'correct':
        setSolver(r.state)
        setFeedback('correct')
        setBusy(true)
        later(() => {
          setSolver((s) => (s ? playReply(s) : s))
          setBusy(false)
        }, REPLY_DELAY)
        return true
      case 'solved':
        setSolver(r.state)
        setFeedback('solved')
        record(!r.state.failed)
        return true
    }
  }

  function handleGiveUp() {
    if (!solver) return
    clearTimers()
    setFlash(null)
    setBusy(false)
    setSolver(giveUp(solver))
    setFeedback('gaveUp')
    setView(1) // start of the solution
    setHintPly(null)
    record(false)
  }

  function handleHint() {
    if (!solver || finished) return
    setView(null)
    setSolver(takeHint(solver))
    setHintPly(solver.ply)
  }

  if (!index && error) {
    return (
      <div className="placeholder">
        <h2>Puzzle data missing</h2>
        <p>{error}</p>
      </div>
    )
  }
  if (!solver) return <p className="dim">Loading puzzles…</p>

  const { prepared } = solver
  const looking = view !== null
  const frame = looking ? timeline[view] : null
  const fen = frame ? frame.fen : (flash?.fen ?? solver.fen)
  const lastMove = frame ? frame.move : (flash ?? solver.lastMove)
  const shownIndex = view ?? last
  const hint = showHint && !looking && !busy && !finished ? hintSquare(solver) : null
  const side = prepared.orientation === 'white' ? 'White' : 'Black'
  const accuracy = score.done ? Math.round((score.firstTry / score.done) * 100) : 0

  return (
    <div className="layout">
      <section className="board-col">
        <div className={`board-frame fb-${flash ? 'wrong' : feedback}`}>
          <PlayableBoard
            fen={fen}
            orientation={prepared.orientation}
            onMove={handleMove}
            lastMove={lastMove}
            interactive={!busy && !finished && !looking}
            hintSquare={hint}
          />
        </div>
        <p className={`status fb-text-${feedback}`} aria-live="polite">
          {looking && !finished ? (
            <span className="dim">
              {view === 0 ? 'Before the opponent’s move.' : 'Looking back.'} Press → to return to the puzzle.
            </span>
          ) : (
            <StatusText feedback={feedback} side={side} failed={solver.failed} hinted={solver.hinted} />
          )}
        </p>
      </section>

      <aside className="panel">
        <div className="card">
          <div className="card-row">
            {finished ? <span className="rating">{prepared.puzzle.rating}</span> : <span className="rating">?</span>}
            <span className="dim">rating</span>
            <a className="lichess" href={`https://lichess.org/training/${prepared.puzzle.id}`} target="_blank" rel="noreferrer">
              #{prepared.puzzle.id}
            </a>
          </div>
          <p className="dim small">
            <span className={`dot ${prepared.orientation}`} /> You play {side}. Opponent just played {prepared.setupMove.san}.
          </p>
          <div className="chips">
            {finished ? (
              prepared.puzzle.themes.map((t) => (
                <span key={t} className="chip">
                  {humanize(t)}
                </span>
              ))
            ) : (
              <span className="dim small">Rating and themes show after you finish.</span>
            )}
          </div>
        </div>

        <div className="buttons">
          <button onClick={() => setView((v) => step(v, -1, last))} disabled={shownIndex === 0} aria-label="Previous position">
            ←
          </button>
          <button onClick={() => setView((v) => step(v, 1, last))} disabled={!looking} aria-label="Next position">
            →
          </button>
          {!finished && (
            <>
              <button onClick={handleHint} disabled={busy || showHint}>
                Hint
              </button>
              <button onClick={handleGiveUp} disabled={loading}>
                View solution
              </button>
            </>
          )}
          <button className="primary" onClick={() => next({ min, max, phases })} disabled={loading}>
            {finished ? 'Next puzzle' : 'Skip'}
          </button>
        </div>

        <h2>{finished ? 'Solution' : 'Moves'}</h2>
        <MoveList
          sans={timeline.slice(1, last + 1).map((f) => f.san ?? '')}
          startFen={prepared.puzzle.fen}
          current={shownIndex - 1}
          onSelect={(i) => setView(i + 1 === last ? null : i + 1)}
        />
        <p className="dim small">Use ← and → (or your arrow keys) to step through the moves.</p>

        <h2>This session</h2>
        <div className="stats">
          <div>
            <b>{score.firstTry}</b>
            <span>solved first try</span>
          </div>
          <div>
            <b>{score.done}</b>
            <span>finished</span>
          </div>
          <div>
            <b>{accuracy}%</b>
            <span>accuracy</span>
          </div>
          <div>
            <b>{score.streak}</b>
            <span>streak</span>
          </div>
        </div>

        <h2>Game phase</h2>
        <div className="toggles" role="group" aria-label="Game phase">
          {PHASES.map((ph) => (
            <button
              key={ph}
              type="button"
              className={phases.includes(ph) ? 'on' : ''}
              aria-pressed={phases.includes(ph)}
              onClick={() => togglePhase(ph)}
            >
              {PHASE_LABEL[ph]}
            </button>
          ))}
        </div>

        <h2>Difficulty</h2>
        <div className="range">
          <label>
            From
            <select value={min} onChange={(e) => setMin(Number(e.target.value))}>
              {RATINGS.filter((r) => r <= max).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            To
            <select value={max} onChange={(e) => setMax(Number(e.target.value))}>
              {RATINGS.filter((r) => r >= min).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="dim small">
          {rangeInfo
            ? `${rangeInfo.total.toLocaleString()} ${rangeInfo.total === 1 ? 'puzzle matches' : 'puzzles match'}, ${rangeInfo.left.toLocaleString()} you haven't seen yet.`
            : 'Counting puzzles…'}{' '}
          Changes apply from the next puzzle.
        </p>
        {error && <p className="error">{error}</p>}
      </aside>
    </div>
  )
}

function StatusText({ feedback, side, failed, hinted }: { feedback: Feedback; side: string; failed: boolean; hinted: boolean }) {
  switch (feedback) {
    case 'correct':
      return <>Correct! Keep going.</>
    case 'wrong':
      return <>Not that one. Try again.</>
    case 'solved':
      if (hinted) return <>Solved with a hint.</>
      return failed ? <>Solved, but not on the first try.</> : <>Solved!</>
    case 'gaveUp':
      return <>Here's the solution. Step through it with the arrows.</>
    default:
      return hinted ? <>The highlighted piece is the one to move.</> : <>Find the best move for {side}.</>
  }
}
