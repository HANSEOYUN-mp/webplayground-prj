import { NextResponse } from "next/server"

type Row = {
  timestamp: number
  btc_price: number | null
  open_interest: number | null
  volume: number | null
}

type ApiPayload =
  | {
      configured: false
      message: string
      range: string
      points: Row[]
      source: "SoSoValue"
      chart: string
    }
  | {
      configured: true
      range: string
      points: Row[]
      source: "SoSoValue"
      chart: string
      error?: string
    }

const BASE = "https://openapi.sosovalue.com/openapi/v1"
const CHART = "bitcoin_futures_volume_open_interest"
/** 고정: 최근 90일만 사용 */
const RANGE = "90d"
const MS_90D = 90 * 24 * 60 * 60 * 1000
const CACHE_TTL_MS = 60_000

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

type CacheEntry = { ts: number; payload: ApiPayload }
const g = globalThis as unknown as {
  __soso_cme_cache?: Record<string, CacheEntry>
}
if (!g.__soso_cme_cache) g.__soso_cme_cache = {}

async function sosoFetchJson<T>(path: string, apiKey: string, search?: Record<string, string>) {
  const url = new URL(`${BASE}${path}`)
  if (search) for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    headers: { "x-soso-api-key": apiKey },
    next: { revalidate: 60 },
  })

  const payload = (await res.json().catch(() => null)) as any
  if (!res.ok) {
    const msg = payload?.message ? String(payload.message) : `SoSoValue API error: ${res.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = res.status
    throw err
  }

  if (Array.isArray(payload)) return payload as T
  if (payload && typeof payload === "object" && "data" in payload) return payload.data as T
  return payload as T
}

export async function GET() {
  const apiKey = process.env.SOSOVALUE_API_KEY
  const cacheKey = `${CHART}:${RANGE}`

  const cached = g.__soso_cme_cache?.[cacheKey]
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload, {
      status: 200,
      headers: { "x-cache": "HIT" },
    })
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        message: "차트 데이터를 보려면 SoSoValue API 키가 필요합니다. .env.local / Vercel 환경변수에 SOSOVALUE_API_KEY를 추가하세요.",
        range: RANGE,
        points: [],
        source: "SoSoValue",
        chart: CHART,
      } satisfies ApiPayload,
      { status: 200 }
    )
  }

  try {
    const end = Date.now()
    const start = end - MS_90D
    const search: Record<string, string> = {
      limit: String(500),
      start_time: String(start),
      end_time: String(end),
    }

    let rows = await sosoFetchJson<any[]>(`/analyses/${encodeURIComponent(CHART)}`, apiKey, search)
    if (!rows || rows.length === 0) {
      rows = await sosoFetchJson<any[]>(`/analyses/${encodeURIComponent(CHART)}`, apiKey, { limit: String(500) })
    }

    const points: Row[] = (rows ?? [])
      .map((r) => {
        const ts = Number(r?.timestamp)
        const price = r?.btc_price == null ? null : Number(r.btc_price)
        const oi = r?.open_interest == null ? null : Number(r.open_interest)
        const vol = r?.volume == null ? null : Number(r.volume)
        return {
          timestamp: Number.isFinite(ts) ? ts : NaN,
          btc_price: Number.isFinite(price) ? price : null,
          open_interest: Number.isFinite(oi) ? oi : null,
          volume: Number.isFinite(vol) ? vol : null,
        }
      })
      .filter((p) => Number.isFinite(p.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp)

    const filtered = points.filter((p) => p.timestamp >= start && p.timestamp <= end)
    const sliceFrom = filtered.length > 0 ? filtered : points
    const finalPoints = sliceFrom.slice(-clamp(500, 10, 500))

    const payload = {
      configured: true,
      range: RANGE,
      points: finalPoints,
      source: "SoSoValue",
      chart: CHART,
    } satisfies ApiPayload

    g.__soso_cme_cache![cacheKey] = { ts: Date.now(), payload }
    return NextResponse.json(payload, {
      status: 200,
      headers: { "x-cache": "MISS" },
    })
  } catch (e) {
    const status = typeof e === "object" && e && "status" in e ? Number((e as any).status) : undefined
    if (status === 429) {
      const stale = g.__soso_cme_cache?.[cacheKey]
      if (stale) {
        const { note: _omitNote, ...rest } = stale.payload as ApiPayload & { note?: string }
        const payload: ApiPayload = { ...rest, configured: true }
        return NextResponse.json(payload, {
          status: 200,
          headers: { "x-cache": "STALE-429" },
        })
      }
    }
    return NextResponse.json(
      {
        configured: true,
        range: RANGE,
        points: [],
        source: "SoSoValue",
        chart: CHART,
        error: e instanceof Error ? e.message : "SoSoValue 차트 조회 실패",
      } satisfies ApiPayload,
      { status: 200 }
    )
  }
}
