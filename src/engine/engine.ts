import { SearchCollector, type Analysis } from './uci'

/** How we talk to a Stockfish process: a browser Worker, or a Node child process in tests. */
export type Transport = {
  send: (cmd: string) => void
  onLine: (fn: (line: string) => void) => void
  terminate: () => void
}

export type AnalyzeOptions = { depth?: number; multipv?: number; /** Only consider these moves (UCI). */ searchmoves?: string[] }

export class CancelledError extends Error {
  constructor() {
    super('Analysis cancelled')
  }
}

/**
 * A UCI engine with a one-at-a-time queue. analyze() calls run in order;
 * cancelAll() stops the current search and rejects everything queued.
 */
export class Engine {
  private listeners: ((line: string) => void)[] = []
  private queue: Promise<unknown> = Promise.resolve()
  private generation = 0
  private ready: Promise<void>
  private multipv = 1
  private t: Transport

  constructor(transport: Transport) {
    this.t = transport
    transport.onLine((raw) => {
      for (const line of raw.split('\n')) if (line.trim()) this.listeners.forEach((fn) => fn(line.trim()))
    })
    this.ready = this.handshake()
  }

  private waitFor(pred: (line: string) => boolean): Promise<void> {
    return new Promise((resolve) => {
      const fn = (line: string) => {
        if (pred(line)) {
          this.listeners = this.listeners.filter((f) => f !== fn)
          resolve()
        }
      }
      this.listeners.push(fn)
    })
  }

  private async handshake() {
    const ok = this.waitFor((l) => l === 'uciok')
    this.t.send('uci')
    await ok
    await this.isReady()
  }

  private async isReady() {
    const ok = this.waitFor((l) => l === 'readyok')
    this.t.send('isready')
    await ok
  }

  /** Analyse one position (FEN). Resolves with the best lines, best first. */
  analyze(fen: string, { depth = 14, multipv = 1, searchmoves }: AnalyzeOptions = {}): Promise<Analysis> {
    const gen = this.generation
    const run = async (): Promise<Analysis> => {
      await this.ready
      if (gen !== this.generation) throw new CancelledError()
      if (multipv !== this.multipv) {
        this.t.send(`setoption name MultiPV value ${multipv}`)
        this.multipv = multipv
        await this.isReady()
      }
      const collector = new SearchCollector()
      const done = new Promise<void>((resolve) => {
        const fn = (line: string) => {
          collector.add(line)
          if (collector.done) {
            this.listeners = this.listeners.filter((f) => f !== fn)
            resolve()
          }
        }
        this.listeners.push(fn)
      })
      this.t.send(`position fen ${fen}`)
      this.t.send(`go depth ${depth}${searchmoves?.length ? ` searchmoves ${searchmoves.join(' ')}` : ''}`)
      await done
      if (gen !== this.generation) throw new CancelledError()
      return collector.result()
    }
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => undefined)
    return p
  }

  /** Stop the current search and cancel everything queued. */
  cancelAll() {
    this.generation++
    this.t.send('stop')
  }

  terminate() {
    this.generation++
    this.t.terminate()
  }
}

let shared: Engine | null = null

/** The app's single browser engine (created on first use). */
export function getBrowserEngine(): Engine {
  if (!shared) {
    const url = `${import.meta.env?.BASE_URL ?? '/'}engine/stockfish-19-lite-single.js`
    const worker = new Worker(url)
    shared = new Engine({
      send: (cmd) => worker.postMessage(cmd),
      onLine: (fn) => {
        worker.onmessage = (e: MessageEvent) => {
          if (typeof e.data === 'string') fn(e.data)
        }
      },
      terminate: () => worker.terminate(),
    })
  }
  return shared
}
