# Chess Puzzles

A chess study app: endless puzzles at the difficulty you choose, a library of famous games to replay, and (later) an AI coach you can ask about any position.

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

## Puzzle data

Puzzles come from the free [Lichess puzzle database](https://database.lichess.org/#puzzles) (public domain, CC0).
The app reads JSON files in `public/puzzles/`, one per 100 rating points per game phase (opening, middlegame, endgame), so it only loads the difficulty and phases you pick.

To rebuild them:

1. Download `lichess_db_puzzle.csv.zst` from the link above.
2. Run (needs `zstd`; on a Mac: `brew install zstd`):

   ```bash
   zstd -dc lichess_db_puzzle.csv.zst | node scripts/build-puzzles.mjs
   ```

It keeps only well-tested puzzles (popularity 80+, 200+ plays, stable rating) and samples up to 8,000 per rating band per phase (about 480,000 puzzles, 65 MB). Set `PER_FILE=15000` to keep more, or lower it for a smaller app.

Note: in the Lichess data the first move listed is the opponent's. The app plays it for you, then you solve.

## Game library

Famous players' games come from [PGN Mentor](https://www.pgnmentor.com/files.html) (Players section). Download the player `.zip` files, then run:

```bash
node scripts/build-games.mjs ~/Downloads/Fischer.zip ~/Downloads/Carlsen.zip   # or ~/Downloads/*.zip
```

This writes one JSON file per player to `public/games/`, skips any game that can't be replayed legally, and finds the hand-picked famous games listed in `scripts/famous.mjs` (it matches them by players, year and round, so the moves always come from the source files). To add a player, download their file and add them to `PLAYERS` in `scripts/build-games.mjs`.

To add a famous game, add it to `scripts/famous.mjs` (with a signature move so the wrong game can't slip in), then run `node scripts/resolve-famous.mjs`. It only takes a second and doesn't re-import anything.

Each player's games can be sorted by **Most important**, a score based on the event (World Championship, Candidates, Olympiad, top tournaments; blitz and online games count less), the opponent, the result, and whether it was a real fight. Famous games always come first.

## Game review (Stockfish)

Any game in the library can be reviewed by Stockfish 19 (the lite, single-threaded WebAssembly build in `public/engine/`, which runs in the browser with no server). Every move is graded by how much it changes the player's winning chances (the same curve Lichess uses):

| Grade | Rule |
| --- | --- |
| Best | the engine's top move (or within 0.5% winning chances) |
| Excellent / Good | loses at most 2% / 5% |
| Inaccuracy / Mistake / Blunder | loses up to 10% / 20% / more |
| Great | the only good move: the second-best is at least 15% worse |
| Brilliant | a best move that sacrifices material the opponent could reasonably take |

Explanations come from the engine's analysis: material lost, checkmates allowed or missed, and captures missed. Reviews are saved in the browser so each game is only analysed once.

Stockfish is GPL-3.0 licensed (see `public/engine/COPYING-stockfish.txt`). If this app is ever distributed, its source must be available under the GPL too.

## Your own games

On the Games page, **Import a game** takes a PGN (paste it or upload a `.pgn` file). Chess.com and Lichess exports work as-is, including clock comments and variations, and a file with several games imports them all. Every move is checked, and an illegal move is reported with its move number. Imported games are saved in this browser (up to 300) and get the same Stockfish review as the library games.

## Publishing (GitHub Pages)

The site is fully static (Stockfish runs in the browser), so GitHub Pages can host it for free.
`.github/workflows/deploy.yml` builds and publishes it automatically on every push to `main`.

One-time setup:

1. Publish this folder to a **public** GitHub repository (for example `chess-study`).
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push (or re-run the workflow). The site appears at `https://<your-username>.github.io/chess-study/`.

After that, every push updates the site in a couple of minutes.

## Stack

- React + TypeScript, built with Vite
- [chess.js](https://github.com/jhlywa/chess.js) for rules and move checking
- [react-chessboard](https://github.com/Clariity/react-chessboard) for the board
- Vitest for tests

## Project layout

```
src/
  App.tsx                   top menu and page switching (#/puzzles, #/games, #/board)
  pages/                    PuzzlesPage, GamesPage, BoardPage
  components/PlayableBoard  board with drag, click-to-move, highlights
  components/MoveList       numbered, clickable move list
  lib/chessUtils.ts         chess helpers
  components/GameViewer     replay a game move by move
  lib/puzzles.ts            loading and preparing puzzles
  lib/games.ts              loading, searching and replaying games
  engine/                   Stockfish wrapper, UCI parsing, move grading and game review
scripts/
  build-puzzles.mjs         turns the Lichess CSV into public/puzzles/
  build-games.mjs           turns player PGN files into public/games/
  famous.mjs                the hand-picked famous games
public/puzzles/             generated puzzle data
public/games/               generated game data
```

## Roadmap

- [x] Phase 0: project setup and a playable board
- [x] Phase 1: puzzle data from the Lichess database, puzzle browser
- [x] Phase 2: puzzle player (solve, check, auto-reply, session score, game phase filter)
- [ ] Phase 3: settings (difficulty, count, themes) and session summary
- [ ] Phase 4: hints, personal rating, stats
- [x] Phase 5: famous games library (12 players, 43,000+ games, search, viewer, famous games)
- [x] Phase 6: engine analysis (Stockfish in the browser, move grades, explanations, accuracy, eval bar)
- [ ] Phase 7: AI coach chat about the current position (needs a small server to keep the API key private)
- [ ] Phase 8: extras (puzzle rush, streaks, review missed puzzles)
