import { RouteData } from '@/types'

/** Search or list all routes. Hits /api/routes which proxies to FastAPI or falls back to mock. */
export async function fetchRoutes(query = ''): Promise<RouteData[]> {
  const url = query
    ? `/api/routes?q=${encodeURIComponent(query)}`
    : '/api/routes'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Fetch full route details (stops + path) by id or route number. */
export async function fetchRouteById(id: string): Promise<RouteData> {
  const res = await fetch(`/api/routes/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
