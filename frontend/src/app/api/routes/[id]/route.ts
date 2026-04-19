import { NextRequest, NextResponse } from 'next/server'
import { NSW_ROUTES } from '@/lib/mockData'

const BACKEND = process.env.BACKEND_URL ?? 'https://routescout-j0o4.onrender.com/'

function snakeToCamel(r: Record<string, unknown>) {
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  try {
    // Try by ID first, then by route number
    let res = await fetch(`${BACKEND}/routes/${encodeURIComponent(id)/}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      res = await fetch(`${BACKEND}/routes/number/${encodeURIComponent(id)/}`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(4000),
      })
    }
    if (!res.ok) throw new Error(`Backend ${res.status}`)
    return NextResponse.json(snakeToCamel(await res.json()))
  } catch {
    const route = NSW_ROUTES.find((r) => r.id === id || r.routeNumber === id)
    if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(route)
  }
}
