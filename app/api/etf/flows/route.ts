import { NextResponse } from "next/server"

type AssetSymbol = "BTC" | "ETH"

/**
 * GET /etfs/summary-history — SoSoValue 2.1 ETF Summary History
 * @see https://sosovalue.gitbook.io/soso-value-api-doc/2.-etf/summary-history.md
 * `total_net_inflow` = 일별 전체 ETF 순유입(USD), API에서 집계된 값 (티커별 합산과 동일하지 않을 수 있음)
 */
type SoSoSummaryRow = {
  date: string
  total_net_inflow: number | string
}

type SoSoEtfHistoryRow = {
  date: string | number
  ticker: string
  net_inflow: number | string
}

type FlowRow = {
  date: string // yyyy-MM-dd
  blackrock: number | null // $M
  fidelity: number | null // $M
  total: number | null // $M
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  return null
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function toYmd(value: string | number): string | null {
  if (typeof value === "string") {
    // already yyyy-MM-dd in summary-history, keep if it matches
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // could be seconds or milliseconds
    const ms = value < 10_000_000_000 ? value * 1000 : value
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return null
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  }

  return null
}

function toMillionsUsd(v: number | null): number | null {
  if (v == null) return null
  return Math.round((v / 1_000_000) * 10) / 10
}

async function sosoFetchJson<T>(path: string, apiKey: string, search?: Record<string, string>) {
  const base = "https://openapi.sosovalue.com/openapi/v1"
  const url = new URL(`${base}${path}`)
  if (search) {
    for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-soso-api-key": apiKey,
    },
    next: { revalidate: 60 },
  })

  const payload = (await res.json().catch(() => null)) as unknown

  // Some SoSoValue responses may wrap data or return an error object.
  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "message" in payload && typeof (payload as any).message === "string"
        ? String((payload as any).message)
        : `SoSoValue API error: ${res.status}`
    throw new Error(msg)
  }

  if (Array.isArray(payload)) return payload as T

  if (payload && typeof payload === "object") {
    // { code, message, data } style wrapper
    if ("data" in payload) {
      const data = (payload as any).data
      if (Array.isArray(data)) return data as T
    }
    if ("message" in payload && typeof (payload as any).message === "string") {
      throw new Error(String((payload as any).message))
    }
  }

  throw new Error("SoSoValue API 응답 형식을 해석하지 못했습니다.")
}

/** 문서상 summary-history 조회 구간은 최근 1개월 이내. UTC yyyy-MM-dd */
function summaryHistoryDateRange(): { start_date: string; end_date: string } {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 29)
  return {
    end_date: `${end.getUTCFullYear()}-${pad2(end.getUTCMonth() + 1)}-${pad2(end.getUTCDate())}`,
    start_date: `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}-${pad2(start.getUTCDate())}`,
  }
}

function pickDailyTotalByDate(
  rows: SoSoSummaryRow[],
  anchorByDate?: Map<string, number>
): Map<string, number> {
  // SoSoValue /etfs/summary-history may return multiple rows for the same date.
  // Most of the time the dashboard "Daily Total Net Inflow" matches the smallest-magnitude value per date,
  // but some dates (e.g. 2026-05-01) don't. When we have a reliable anchor (IBIT/FBTC or ETHA/FETH sum),
  // pick the candidate closest to that anchor; otherwise fall back to smallest magnitude.
  const candidates = new Map<string, number[]>()
  for (const r of rows) {
    const ymd = toYmd(r.date)
    const v = toNumber(r.total_net_inflow)
    if (!ymd || v == null) continue
    const arr = candidates.get(ymd) ?? []
    arr.push(v)
    candidates.set(ymd, arr)
  }

  const picked = new Map<string, number>()
  for (const [date, values] of candidates.entries()) {
    const anchor = anchorByDate?.get(date)
    let best = values[0]
    if (anchor != null && Number.isFinite(anchor)) {
      // 동일 날짜에 summary 행이 여러 개일 때: IBIT+FBTC(또는 ETHA+FETH) 합과 가장 가까운 후보를 택해 대시보드와 맞춤
      for (const v of values) {
        if (Math.abs(v - anchor) < Math.abs(best - anchor)) best = v
      }
    } else {
      for (const v of values) {
        if (Math.abs(v) < Math.abs(best)) best = v
      }
    }
    picked.set(date, best)
  }

  return picked
}

async function loadAssetRows(asset: AssetSymbol, days: number, apiKey: string): Promise<FlowRow[]> {
  // 기관별 표시용: BlackRock = BTC는 IBIT · ETH는 ETHA / Fidelity = BTC는 FBTC · ETH는 FETH
  const tickerBlackrock = asset === "BTC" ? "IBIT" : "ETHA"
  const tickerFidelity = asset === "BTC" ? "FBTC" : "FETH"

  const range = summaryHistoryDateRange()
  const [blackrock, fidelity, summary] = await Promise.all([
    sosoFetchJson<SoSoEtfHistoryRow[]>(`/etfs/${tickerBlackrock}/history`, apiKey, {
      limit: String(Math.min(Math.max(days, 1), 30)),
    }).catch(() => [] as SoSoEtfHistoryRow[]),
    sosoFetchJson<SoSoEtfHistoryRow[]>(`/etfs/${tickerFidelity}/history`, apiKey, {
      limit: String(Math.min(Math.max(days, 1), 30)),
    }).catch(() => [] as SoSoEtfHistoryRow[]),
    sosoFetchJson<SoSoSummaryRow[]>("/etfs/summary-history", apiKey, {
      symbol: asset,
      country_code: "US",
      limit: String(Math.min(Math.max(days * 3, 20), 300)),
      start_date: range.start_date,
      end_date: range.end_date,
    }).catch(() => [] as SoSoSummaryRow[]),
  ])

  const mapBlackrock = new Map<string, number>()
  for (const r of blackrock) {
    const ymd = toYmd(r.date)
    const v = toNumber(r.net_inflow)
    if (!ymd || v == null) continue
    mapBlackrock.set(ymd, v)
  }

  const mapFidelity = new Map<string, number>()
  for (const r of fidelity) {
    const ymd = toYmd(r.date)
    const v = toNumber(r.net_inflow)
    if (!ymd || v == null) continue
    mapFidelity.set(ymd, v)
  }

  const anchorByDate = new Map<string, number>()
  for (const [date, br] of mapBlackrock.entries()) {
    const fd = mapFidelity.get(date)
    if (fd == null) continue
    anchorByDate.set(date, br + fd)
  }

  // Daily Total Net Inflow(USD): API 집계값 total_net_inflow만 사용 (티커 전체 합산 호출 없음)
  const mapTotal = pickDailyTotalByDate(summary, anchorByDate)

  const dateSet = new Set<string>([...mapTotal.keys(), ...mapBlackrock.keys(), ...mapFidelity.keys()])
  const dates = Array.from(dateSet)
    .sort()
    .reverse()
    .slice(0, days)

  return dates.map((date) => ({
    date,
    blackrock: toMillionsUsd(mapBlackrock.get(date) ?? null),
    fidelity: toMillionsUsd(mapFidelity.get(date) ?? null),
    total: toMillionsUsd(mapTotal.get(date) ?? null),
  }))
}

type FlowsCachePayload = {
  configured: true
  days: number
  btc: FlowRow[]
  eth: FlowRow[]
  source: string
  error?: string
}

const FLOWS_CACHE_TTL_MS = 120_000

const gFlows = globalThis as unknown as {
  __soso_etf_flows_route_cache?: Record<string, { ts: number; payload: FlowsCachePayload }>
}
if (!gFlows.__soso_etf_flows_route_cache) gFlows.__soso_etf_flows_route_cache = {}

export async function GET(req: Request) {
  const apiKey = process.env.SOSOVALUE_API_KEY
  const url = new URL(req.url)
  const days = Math.max(1, Math.min(10, Number(url.searchParams.get("days") ?? "10") || 10))

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        message:
          "ETF 유입 데이터를 보려면 SoSoValue API 키가 필요합니다. .env.local / Vercel 환경변수에 SOSOVALUE_API_KEY를 추가하세요.",
        days,
        btc: [] as FlowRow[],
        eth: [] as FlowRow[],
      },
      { status: 200 }
    )
  }

  const routeCacheKey = `flows:v1:${days}`
  const cachedRoute = gFlows.__soso_etf_flows_route_cache?.[routeCacheKey]
  if (cachedRoute && Date.now() - cachedRoute.ts < FLOWS_CACHE_TTL_MS && !cachedRoute.payload.error) {
    return NextResponse.json(cachedRoute.payload, {
      status: 200,
      headers: { "x-cache": "HIT" },
    })
  }

  try {
    // Sequential assets lowers peak concurrency vs Promise.all(BTC, ETH) (fewer parallel SoSo calls).
    const btc = await loadAssetRows("BTC", days, apiKey)
    const eth = await loadAssetRows("ETH", days, apiKey)

    const payload: FlowsCachePayload = {
      configured: true,
      days,
      btc,
      eth,
      source: "SoSoValue",
    }
    gFlows.__soso_etf_flows_route_cache![routeCacheKey] = { ts: Date.now(), payload }

    return NextResponse.json(payload, {
      status: 200,
      headers: { "x-cache": "MISS" },
    })
  } catch (e) {
    const errBody = {
      configured: true as const,
      days,
      btc: [] as FlowRow[],
      eth: [] as FlowRow[],
      error: e instanceof Error ? e.message : "ETF 데이터 조회 실패",
    }
    return NextResponse.json(errBody, { status: 200 })
  }
}

