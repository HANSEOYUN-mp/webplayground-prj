import { NextResponse } from "next/server"

type Point = { timestamp: number; value: number | null }

type ApiPayload =
  | {
      configured: false
      message: string
      chart: string
      field: string
      points: Point[]
      source: "SoSoValue"
    }
  | {
      configured: true
      chart: string
      field: string
      points: Point[]
      source: "SoSoValue"
      error?: string
    }

const BASE = "https://openapi.sosovalue.com/openapi/v1"
const CHART = "binance_btcusdt_futures_long_short_ratio_1d"
const FIELD = "top_trader_long/short_ratio_(accounts)"
/** 고정: 최근 90일 · 1일봉(약 90포인트, limit 500 이내) */
const MS_90D = 90 * 24 * 60 * 60 * 1000
const FETCH_LIMIT = 120
const CACHE_TTL_MS = 60_000

type CacheEntry = { ts: number; payload: ApiPayload }
const g = globalThis as unknown as {
  __soso_toptrader_cache?: Record<string, CacheEntry>
}
if (!g.__soso_toptrader_cache) g.__soso_toptrader_cache = {}

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
  const cacheKey = `${CHART}:${FIELD}:90d`

  const cached = g.__soso_toptrader_cache?.[cacheKey]
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
        chart: CHART,
        field: FIELD,
        points: [],
        source: "SoSoValue",
      } satisfies ApiPayload,
      { status: 200 }
    )
  }

  try {
    const end = Date.now()
    const start = end - MS_90D
    const search: Record<string, string> = {
      limit: String(FETCH_LIMIT),
      start_time: String(start),
      end_time: String(end),
    }

    let rows = await sosoFetchJson<any[]>(`/analyses/${encodeURIComponent(CHART)}`, apiKey, search)
    if (!rows || rows.length === 0) {
      rows = await sosoFetchJson<any[]>(`/analyses/${encodeURIComponent(CHART)}`, apiKey, { limit: String(FETCH_LIMIT) })
    }

    let points: Point[] = (rows ?? [])
      .map((r) => {
        const ts = Number(r?.timestamp)
        const raw = r?.[FIELD]
        const v = raw == null ? null : Number(raw)
        return { timestamp: Number.isFinite(ts) ? ts : NaN, value: Number.isFinite(v) ? v : null }
      })
      .filter((p) => Number.isFinite(p.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp)

    points = points.filter((p) => p.timestamp >= start && p.timestamp <= end)
    if (points.length === 0 && rows?.length) {
      const all = (rows as any[])
        .map((r) => {
          const ts = Number(r?.timestamp)
          const raw = r?.[FIELD]
          const v = raw == null ? null : Number(raw)
          return { timestamp: Number.isFinite(ts) ? ts : NaN, value: Number.isFinite(v) ? v : null }
        })
        .filter((p) => Number.isFinite(p.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
      points = all.filter((p) => p.timestamp >= start && p.timestamp <= end)
      if (points.length === 0) points = all.slice(-FETCH_LIMIT)
    }

    const payload = {
      configured: true,
      chart: CHART,
      field: FIELD,
      points,
      source: "SoSoValue",
    } satisfies ApiPayload

    g.__soso_toptrader_cache![cacheKey] = { ts: Date.now(), payload }
    return NextResponse.json(payload, {
      status: 200,
      headers: { "x-cache": "MISS" },
    })
  } catch (e) {
    const status = typeof e === "object" && e && "status" in e ? Number((e as any).status) : undefined
    if (status === 429) {
      const stale = g.__soso_toptrader_cache?.[cacheKey]
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
        chart: CHART,
        field: FIELD,
        points: [],
        source: "SoSoValue",
        error: e instanceof Error ? e.message : "SoSoValue 차트 조회 실패",
      } satisfies ApiPayload,
      { status: 200 }
    )
  }
}
