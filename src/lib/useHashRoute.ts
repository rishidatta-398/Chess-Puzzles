import { useEffect, useState } from 'react'

export const ROUTES = ['puzzles', 'board', 'games'] as const
export type Route = (typeof ROUTES)[number]
export type Location = { route: Route; params: string[] }

/** "#/games/fischer/abc" → { route: 'games', params: ['fischer', 'abc'] } */
export function parseHash(hash: string): Location {
  const [first, ...rest] = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const route = ROUTES.includes(first as Route) ? (first as Route) : 'puzzles'
  return { route, params: route === first ? rest : [] }
}

export function hrefFor(route: Route, ...params: string[]): string {
  return `#/${[route, ...params].map(encodeURIComponent).join('/')}`
}

/** Tiny hash router: #/puzzles, #/board, #/games/<player>/<game>. Works on any static host. */
export function useHashRoute(): Location {
  const [loc, setLoc] = useState<Location>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setLoc(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return loc
}
