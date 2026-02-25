"use client"

import { useState, useEffect } from "react"
import { TrendingUp, RefreshCw, AlertCircle } from "lucide-react"

interface StockRow {
  rank: number
  itmsNm: string
  mrktCtg: string
  clpr: string
  vs: string
  fltRt: string
  mrktTotAmt: string
  trqu: string
  srtnCd: string
}

interface ApiRes {
  basDt?: string
  items?: StockRow[]
}

/** 시가총액 상위 10개 포맷 */
function formatMarketCap(s: string): string {
  const n = Number(s)
  if (Number.isNaN(n) || n === 0) return "-"
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}조`
  if (n >= 1e8) return `${(n / 1e8).toFixed(0)}억`
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`
  return n.toLocaleString()
}

function formatNum(s: string): string {
  const n = Number(s)
  if (Number.isNaN(n)) return s
  return n.toLocaleString()
}

export function StockDashboard() {
  const [data, setData] = useState<ApiRes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTop = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/top")
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? "조회 실패")
        setData(null)
        return
      }
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTop()
  }, [])

  if (loading && !data) {
    return (
      <section className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">시가총액 상위 10종목</h2>
        </div>
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          불러오는 중...
        </div>
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">시가총액 상위 10종목</h2>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-4 px-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchTop}
            className="ml-auto rounded-md border border-border bg-background px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            다시 시도
          </button>
        </div>
      </section>
    )
  }

  const items = data?.items ?? []
  const basDt = data?.basDt ?? ""
  const dateStr = basDt
    ? `${basDt.slice(0, 4)}-${basDt.slice(4, 6)}-${basDt.slice(6, 8)}`
    : ""

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">시가총액 상위 10종목</h2>
        </div>
        <div className="flex items-center gap-2">
          {dateStr && (
            <span className="text-xs text-muted-foreground">기준일: {dateStr}</span>
          )}
          <button
            type="button"
            onClick={fetchTop}
            disabled={loading}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            aria-label="새로고침"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">순위</th>
              <th className="pb-2 pr-3 font-medium">종목명</th>
              <th className="pb-2 pr-3 font-medium">시장</th>
              <th className="pb-2 pr-3 font-medium text-right">종가</th>
              <th className="pb-2 pr-3 font-medium text-right">대비</th>
              <th className="pb-2 pr-3 font-medium text-right">등락률</th>
              <th className="pb-2 pr-3 font-medium text-right">시가총액</th>
              <th className="pb-2 font-medium text-right">거래량</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const fltNum = Number(row.fltRt)
              const isUp = fltNum > 0
              const isDown = fltNum < 0
              return (
                <tr
                  key={`${row.srtnCd}-${row.rank}`}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="py-2.5 pr-3 font-medium text-foreground">{row.rank}</td>
                  <td className="py-2.5 pr-3 font-medium text-foreground">{row.itmsNm}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{row.mrktCtg}</td>
                  <td className="py-2.5 pr-3 text-right text-foreground">
                    {formatNum(row.clpr)}
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right ${
                      isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-muted-foreground"
                    }`}
                  >
                    {row.vs === "0" || row.vs === "" ? "-" : (Number(row.vs) >= 0 ? "+" : "") + formatNum(row.vs)}
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right ${
                      isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-muted-foreground"
                    }`}
                  >
                    {row.fltRt === "" || row.fltRt === "-" ? "-" : `${row.fltRt}%`}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-medium text-foreground">
                    {formatMarketCap(row.mrktTotAmt)}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {formatNum(row.trqu)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !loading && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          해당 기준일에 데이터가 없습니다.
        </p>
      )}
    </section>
  )
}
