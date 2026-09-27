# Chess Puzzles

A puzzle trainer with an endless supply of chess puzzles at the difficulty you choose.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open the link it prints (usually http://localhost:5173).

Other commands:

- `npm test` runs the unit tests
- `npm run build` makes a production build in `dist/`
- `npm run lint` checks the code

## Stack

- React + TypeScript, built with Vite
- [chess.js](https://github.com/jhlywa/chess.js) for rules and move checking
- [react-chessboard](https://github.com/Clariity/react-chessboard) for the board
- Vitest for tests

## Project layout

```
src/
  App.tsx                   page layout (Phase 0: board sandbox)
  components/PlayableBoard  board with drag, click-to-move, highlights
  lib/chessUtils.ts         pure chess helpers (tested)
```

## Roadmap

- [x] Phase 0: project setup and a playable board
- [ ] Phase 1: puzzle data from the Lichess open puzzle database
- [ ] Phase 2: puzzle player (solve, check, auto-reply)
- [ ] Phase 3: settings (difficulty, count, themes) and session summary
- [ ] Phase 4: hints, personal rating, stats
- [ ] Phase 5: extras (puzzle rush, streaks, review missed puzzles)
