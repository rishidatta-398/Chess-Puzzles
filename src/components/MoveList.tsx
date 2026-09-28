import { useEffect, useRef } from 'react'

type Props = {
  /** SAN moves in order. */
  sans: string[]
  /** FEN the moves start from (for numbering and who moves first). */
  startFen: string
  /** Index of the highlighted move, or -1 for none. */
  current?: number
  onSelect?: (index: number) => void
  emptyText?: string
  /** Optional last line, e.g. the result. */
  footer?: React.ReactNode
  /** Optional mark per move (same index as sans), e.g. engine grades. */
  marks?: ({ symbol: string; kind: string; title: string } | null)[]
}

/** Numbered move list: 1. e4 e5 2. Nf3 ... Clicking a move selects it. */
export function MoveList({ sans, startFen, current = -1, onSelect, emptyText = 'No moves yet.', footer, marks }: Props) {
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the current move visible by scrolling the list (not the page).
  useEffect(() => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>('.move.current')
    if (!list || !el) return
    const l = list.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (r.top < l.top) list.scrollTop += r.top - l.top - 8
    else if (r.bottom > l.bottom) list.scrollTop += r.bottom - l.bottom + 8
  }, [current])

  const parts = startFen.split(' ')
  const blackStarts = parts[1] === 'b'
  const firstNumber = Number(parts[5]) || 1

  const rows: { n: number; white?: number; black?: number }[] = []
  sans.forEach((_, i) => {
    const idx = i + (blackStarts ? 1 : 0)
    const row = Math.floor(idx / 2)
    rows[row] ??= { n: firstNumber + row }
    if (idx % 2 === 0) rows[row].white = i
    else rows[row].black = i
  })

  const cell = (i?: number) =>
    i === undefined ? (
      <span className="dim">…</span>
    ) : (
      <button
        type="button"
        className={`move${i === current ? ' current' : ''}`}
        onClick={() => onSelect?.(i)}
        disabled={!onSelect}
      >
        {sans[i]}
        {marks?.[i] && (
          <span className={`mark mark-${marks[i]!.kind}`} title={marks[i]!.title}>
            {marks[i]!.symbol}
          </span>
        )}
      </button>
    )

  return (
    <ol className="moves" ref={listRef}>
      {rows.length === 0 && <li className="empty">{emptyText}</li>}
      {rows.map((r) => (
        <li key={r.n}>
          <span className="num">{r.n}.</span>
          {cell(r.white)}
          {r.black !== undefined ? cell(r.black) : <span />}
        </li>
      ))}
      {footer && <li className="moves-footer">{footer}</li>}
    </ol>
  )
}
