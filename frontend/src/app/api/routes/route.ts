import { NextRequest, NextResponse } from 'next/server'
import { NSW_ROUTES } from '@/lib/mockData'
import { RouteData } from '@/types'

const BACKEND = process.env.BACKEND_URL ?? 'https://routescout-j0o4.onrender.com/'

function snakeToCamel(r: Record<string, unknown>): RouteData {
  const stops = ((r.stops ?? []) as Record<string, unknown>[]).map((s) => ({
    id: String(s.id),
    name: String(s.name),
    coordinates: [Number(s.lat), Number(s.lng)] as [number, number],
    demand: (s.demand ?? 'medium') as 'high' | 'medium' | 'low',
    demandScore: Number(s.demand_score ?? s.demandScore ?? 50),
    avgRiders: Number(s.avg_riders ?? s.avgRiders ?? 40),
    boardingFrequency: Number(s.boarding_frequency ?? s.boardingFrequency ?? 25),
    growthTrend: Number(s.growth_trend ?? s.growthTrend ?? 2),
  }))

  return {
    id: String(r.id),
    routeNumber: String(r.route_number ?? r.routeNumber ?? ''),
    routeName: String(r.route_name ?? r.routeName ?? ''),
    operator: String(r.operator ?? 'Transport for NSW'),
    stops,
    path: (r.path ?? []) as [number, number][],
    color: String(r.color ?? '#3b82f6'),
    frequency: Number(r.frequency ?? 6),
    avgTravelTime: Number(r.avg_travel_time ?? r.avgTravelTime ?? 30),
    totalDistance: Number(r.total_distance ?? r.totalDistance ?? 5),
    peakHours: (r.peak_hours ?? r.peakHours ?? ['8:00', '17:00']) as string[],
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  try {
    const url = q
      ? `${BACKEND}/routes/search?q=${encodeURIComponent(q)}&limit=100`
      : `${BACKEND}/routes?limit=500`

    const res = await fetch(url, { next: { revalidate: 30 }, signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(`Backend ${res.status}`)

    const data = await res.json()
    const raw: Record<string, unknown>[] = Array.isArray(data) ? data : data.routes ?? []
    return NextResponse.json(raw.map(snakeToCamel))
  } catch {
    // Fallback: mock data filtered by query
    const ql = q.toLowerCase()
    const routes = ql
      ? NSW_ROUTES.filter(
          (r) => r.routeNumber.toLowerCase().includes(ql) || r.routeName.toLowerCase().includes(ql)
        )
      : NSW_ROUTES
    return NextResponse.json(routes)
  }
}
