import { NextResponse } from "next/server"

type AssetSymbol = "BTC" | "ETH"

type SoSoSummaryRow = {
  date: string
  total_net_inflow: number | string
}

type SoSoEtfHistoryRow = {
  date: string | number
  ticker: string
  net_inflow: number | string
}

type SoSoEtfListRow = {
  ticker: string
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

async function loadTotalBySummingTickers(asset: AssetSymbol, days: number, apiKey: string): Promise<Map<string, number>> {
  const list = await sosoFetchJson<SoSoEtfListRow[]>("/etfs", apiKey, {
    symbol: asset,
    country_code: "US",
  })

  const tickers = list
    .map((x) => x?.ticker)
    .filter((t): t is string => typeof t === "string" && t.length > 0)

  const mapTotal = new Map<string, number>()

  // Keep concurrency moderate to avoid timeouts/rate limits.
  const chunkSize = 4
  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize)
    const results = await Promise.all(
      chunk.map(async (ticker) => {
        try {
          return await sosoFetchJson<SoSoEtfHistoryRow[]>(`/etfs/${ticker}/history`, apiKey, {
            limit: String(Math.min(Math.max(days, 1), 30)),
          })
        } catch {
          return [] as SoSoEtfHistoryRow[]
        }
      })
    )

    for (const rows of results) {
      for (const r of rows) {
        const ymd = toYmd(r.date)
        const v = toNumber(r.net_inflow)
        if (!ymd || v == null) continue
        mapTotal.set(ymd, (mapTotal.get(ymd) ?? 0) + v)
      }
    }
  }

  return mapTotal
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
  const tickerBlackrock = asset === "BTC" ? "IBIT" : "ETHA"
  const tickerFidelity = asset === "BTC" ? "FBTC" : "FETH"

  const [blackrock, fidelity, summary, totalByTickers] = await Promise.all([
    sosoFetchJson<SoSoEtfHistoryRow[]>(`/etfs/${tickerBlackrock}/history`, apiKey, {
      limit: String(Math.min(Math.max(days, 1), 30)),
    }).catch(() => [] as SoSoEtfHistoryRow[]),
    sosoFetchJson<SoSoEtfHistoryRow[]>(`/etfs/${tickerFidelity}/history`, apiKey, {
      limit: String(Math.min(Math.max(days, 1), 30)),
    }).catch(() => [] as SoSoEtfHistoryRow[]),
    sosoFetchJson<SoSoSummaryRow[]>("/etfs/summary-history", apiKey, {
      symbol: asset,
      country_code: "US",
      limit: String(Math.min(Math.max(days, 1), 300)),
    }).catch(() => [] as SoSoSummaryRow[]),
    // fallback only (used when summary is empty/unavailable)
    loadTotalBySummingTickers(asset, days, apiKey).catch(() => new Map<string, number>()),
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

  const mapTotal = pickDailyTotalByDate(summary, anchorByDate)
  if (mapTotal.size === 0) {
    // Fallback: sum per-ticker histories (can be rate-limited, but better than empty).
    for (const [k, v] of totalByTickers.entries()) {
      if (typeof k === "string" && typeof v === "number" && Number.isFinite(v)) mapTotal.set(k, v)
    }
  }

  const dates = Array.from(mapTotal.keys()).sort().reverse().slice(0, days)

  return dates.map((date) => ({
    date,
    blackrock: toMillionsUsd(mapBlackrock.get(date) ?? null),
    fidelity: toMillionsUsd(mapFidelity.get(date) ?? null),
    total: toMillionsUsd(mapTotal.get(date) ?? null),
  }))
}

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

  try {
    const [btc, eth] = await Promise.all([
      loadAssetRows("BTC", days, apiKey),
      loadAssetRows("ETH", days, apiKey),
    ])

    return NextResponse.json({
      configured: true,
      days,
      btc,
      eth,
      source: "SoSoValue",
    })
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        days,
        btc: [] as FlowRow[],
        eth: [] as FlowRow[],
        error: e instanceof Error ? e.message : "ETF 데이터 조회 실패",
      },
      { status: 200 }
    )
  }
}

