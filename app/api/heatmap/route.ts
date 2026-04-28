import { NextResponse } from "next/server"

export const revalidate = 60

// Yahoo Finance 심볼 기반 자산
const YAHOO_ASSETS = [
  { symbol: "^GSPC",    name: "S&P 500",      label: "S&P 500",  type: "index" },
  { symbol: "^RUT",     name: "Russell 2000",  label: "RUSS 2K",  type: "index" },
  { symbol: "DX-Y.NYB", name: "US Dollar",     label: "DXY",      type: "fx" },
  { symbol: "GC=F",     name: "Gold",          label: "GOLD",     type: "commodity" },
  { symbol: "CL=F",     name: "Crude Oil WTI", label: "WTI",      type: "commodity" },
]

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
}

async function fetchYahooChart(symbol: string): Promise<any> {
  const encoded = encodeURIComponent(symbol)
  for (const host of ["query1", "query2"]) {
    const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=5d`
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (res.ok) {
        const json = await res.json()
        const result = json.chart?.result?.[0]
        if (result) return result
      }
    } catch (_) {}
  }
  return null
}

export async function GET() {
  try {
    // Yahoo Finance 병렬 호출 (S&P500, Russell, DXY, Gold, Oil)
    const yahooPromises = YAHOO_ASSETS.map(async (asset) => {
      const result = await fetchYahooChart(asset.symbol)
      if (!result) return null
      const meta = result.meta
      const price: number = meta.regularMarketPrice ?? 0
      const prevClose: number = meta.previousClose ?? meta.chartPreviousClose ?? price
      const change = price - prevClose
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0
      return {
        symbol: asset.label,
        name: asset.name,
        type: asset.type,
        price,
        change,
        changePercent,
      }
    })

    // CoinGecko BTC만
    const btcPromise = fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc&price_change_percentage=24h",
      { headers: { "Accept": "application/json" } }
    )
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])

    const [yahooResults, cryptoJson] = await Promise.all([
      Promise.all(yahooPromises),
      btcPromise,
    ])

    const yahooItems = yahooResults.filter(Boolean)

    const btcItems = Array.isArray(cryptoJson)
      ? cryptoJson.map((c: any) => ({
          symbol: "BTC",
          name: "Bitcoin",
          type: "crypto",
          price: c.current_price ?? 0,
          change: c.price_change_24h ?? 0,
          changePercent: c.price_change_percentage_24h ?? 0,
        }))
      : []

    // 순서: S&P500, Russell, BTC, DXY, Gold, WTI
    const ordered = ["S&P 500", "RUSS 2K", "BTC", "DXY", "GOLD", "WTI"]
    const allItems = [...yahooItems, ...btcItems]
    const items = ordered
      .map((sym) => allItems.find((i) => i?.symbol === sym))
      .filter(Boolean)

    if (items.length === 0) {
      return NextResponse.json({ error: "데이터를 불러올 수 없습니다" }, { status: 500 })
    }

    return NextResponse.json({ items })
  } catch (err) {
    console.error("Heatmap API error:", err)
    return NextResponse.json({ error: "서버 오류" }, { status: 500 })
  }
}
