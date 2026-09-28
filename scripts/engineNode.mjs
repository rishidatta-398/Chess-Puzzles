// Run Stockfish (the same lite build the app uses) as a Node child process.
// Used by tests and build-time scripts; the browser app uses a Web Worker instead.

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

export function nodeTransport() {
  const require = createRequire(import.meta.url)
  const bin = join(dirname(require.resolve('stockfish/package.json')), 'bin', 'stockfish-19-lite-single.js')
  const child = spawn(process.execPath, [bin], { stdio: ['pipe', 'pipe', 'inherit'] })
  let buf = ''
  let handler = () => {}
  child.stdout.on('data', (d) => {
    buf += d.toString()
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const l of lines) handler(l)
  })
  return {
    send: (cmd) => child.stdin.write(cmd + '\n'),
    onLine: (fn) => {
      handler = fn
    },
    terminate: () => {
      child.stdin.end('quit\n')
      child.kill()
    },
  }
}
