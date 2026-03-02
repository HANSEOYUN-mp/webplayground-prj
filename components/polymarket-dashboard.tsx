"use client"

import { useState, useEffect } from "react"
import { BarChart3, RefreshCw, AlertCircle, ExternalLink } from "lucide-react"

interface PolymarketRow {
  rank: number
  id: string
  slug: string
  title: string
  volume: number
  liquidity: number | null
  yesPrice: number | null
  endDate: string | null
}

interface ApiRes {
  items?: PolymarketRow[]
}

/** 베팅 금액 포맷 (USD) */
function formatVolume(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${Math.round(v)}`
}

export function PolymarketDashboard() {
  const [data, setData] = useState<ApiRes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTop = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/polymarket/top")
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
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Polymarket 베팅 금액 순 이벤트</h2>
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
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Polymarket 베팅 금액 순 이벤트</h2>
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

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Polymarket 베팅 금액 순 이벤트</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">출처: Polymarket</span>
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
              <th className="pb-2 pr-3 font-medium">이벤트</th>
              <th className="pb-2 pr-3 font-medium text-right">베팅 금액</th>
              <th className="pb-2 pr-3 font-medium text-right">Yes 확률</th>
              <th className="pb-2 font-medium text-right">바로가기</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id || row.rank}
                className="border-b border-border/60 last:border-0"
              >
                <td className="py-2.5 pr-3 font-medium text-foreground">{row.rank}</td>
                <td className="py-2.5 pr-3 text-foreground">
                  <span className="line-clamp-2" title={row.title}>
                    {row.title}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right font-medium text-foreground">
                  {formatVolume(row.volume)}
                </td>
                <td className="py-2.5 pr-3 text-right text-muted-foreground">
                  {row.yesPrice != null ? `${(row.yesPrice * 100).toFixed(0)}%` : "-"}
                </td>
                <td className="py-2.5 text-right">
                  {row.slug ? (
                    <a
                      href={`https://polymarket.com/event/${row.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      보기
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && !loading && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          이벤트 데이터가 없습니다.
        </p>
      )}
    </section>
  )
}
