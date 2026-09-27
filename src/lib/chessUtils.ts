import { Chess, type Square } from 'chess.js'

export type MoveResult = {
  fen: string
  san: string
  from: Square
  to: Square
}

/** Squares the piece on `square` can legally move to. Empty if none or not that side's turn. */
export function legalTargets(fen: string, square: string): Square[] {
  const game = new Chess(fen)
  const piece = game.get(square as Square)
  if (!piece || piece.color !== game.turn()) return []
  return game.moves({ square: square as Square, verbose: true }).map((m) => m.to)
}

/**
 * Try a move from one square to another.
 * Returns the new position, or null if the move is illegal.
 * Pawns reaching the last rank promote to `promotion` (queen by default).
 */
export function tryMove(
  fen: string,
  from: string,
  to: string,
  promotion: 'q' | 'r' | 'b' | 'n' = 'q',
): MoveResult | null {
  const game = new Chess(fen)
  try {
    const move = game.move({ from, to, promotion })
    return { fen: game.fen(), san: move.san, from: move.from, to: move.to }
  } catch {
    return null
  }
}

/** Whose turn it is, as a word. */
export function sideToMove(fen: string): 'white' | 'black' {
  return new Chess(fen).turn() === 'w' ? 'white' : 'black'
}

/** Short human-readable game status. */
export function statusText(fen: string): string {
  const game = new Chess(fen)
  const side = game.turn() === 'w' ? 'White' : 'Black'
  const other = game.turn() === 'w' ? 'Black' : 'White'
  if (game.isCheckmate()) return `Checkmate. ${other} wins.`
  if (game.isStalemate()) return 'Stalemate. Draw.'
  if (game.isInsufficientMaterial()) return 'Draw by insufficient material.'
  if (game.isDraw()) return 'Draw.'
  if (game.inCheck()) return `${side} to move, in check.`
  return `${side} to move.`
}
