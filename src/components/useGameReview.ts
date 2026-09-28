import { useCallback, useEffect, useRef, useState } from 'react'
import { CancelledError, getBrowserEngine } from '../engine/engine'
import { cachedReview, reviewGame, saveReview, type GameReview, type ReviewProgress } from '../engine/gameReview'
import type { Frame } from '../lib/puzzleTimeline'

export const DEPTHS = { quick: 11, standard: 13, deep: 16 } as const
export type DepthName = keyof typeof DEPTHS

/** Runs (or loads from cache) a Stockfish review of one game. */
/** The deepest review saved for this game, if any. */
function bestCached(gameId: string) {
  return cachedReview(gameId, DEPTHS.deep) ?? cachedReview(gameId, DEPTHS.standard) ?? cachedReview(gameId, DEPTHS.quick)
}

export function useGameReview(gameId: string, frames: Frame[]) {
  const [review, setReview] = useState<GameReview | null>(() => bestCached(gameId))
  const [progress, setProgress] = useState<ReviewProgress | null>(null)
  const [error, setError] = useState('')
  const [forGame, setForGame] = useState(gameId)
  const run = useRef(0)
  const engineUsed = useRef(false)

  // A different game: show its cached review (if any).
  if (forGame !== gameId) {
    setForGame(gameId)
    setProgress(null)
    setError('')
    setReview(bestCached(gameId))
  }

  // ...and ignore results from an analysis that was still running for the old game.
  useEffect(
    () => () => {
      run.current++
    },
    [gameId],
  )

  const start = useCallback(
    async (depthName: DepthName) => {
      const depth = DEPTHS[depthName]
      const cached = cachedReview(gameId, depth)
      if (cached) {
        setReview(cached)
        return
      }
      const token = ++run.current
      engineUsed.current = true
      const engine = getBrowserEngine()
      setError('')
      setProgress({ done: 0, total: frames.length })
      try {
        const r = await reviewGame(engine, frames, {
          depth,
          onProgress: (p) => token === run.current && setProgress(p),
        })
        if (token !== run.current) return
        saveReview(gameId, r)
        setReview(r)
      } catch (e) {
        if (!(e instanceof CancelledError) && token === run.current) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (token === run.current) setProgress(null)
      }
    },
    [gameId, frames],
  )

  const cancel = useCallback(() => {
    run.current++
    if (engineUsed.current) getBrowserEngine().cancelAll()
    setProgress(null)
  }, [])

  // Stop the engine if the page is closed mid-analysis.
  useEffect(
    () => () => {
      if (engineUsed.current) getBrowserEngine().cancelAll()
    },
    [],
  )

  return { review, progress, error, start, cancel }
}
