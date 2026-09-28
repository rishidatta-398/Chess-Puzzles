// Types for pgn.mjs, so the app (TypeScript) can share it with the build scripts.
export function splitPgn(text: string): string[]
export function parseHeaders(gameText: string): Record<string, string>
export function moveText(gameText: string): string
export function normalizeDate(d: string | undefined): string
export function clean(v: string | undefined): string
export function hash(str: string): string
export function gameId(white: string, black: string, date: string, sans: string[]): string
export function displayName(pgnName: string): string
export function nameMatches(pgnName: string | undefined, surname: string): boolean
export function sanTokens(text: string): string[]
