"use client"

import { useState, useEffect } from "react"
import { Calendar, Search, RefreshCw, AlertCircle, Sun, Moon } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area } from "recharts"

// 투자의견 컨센서스 막대그래프 컴포넌트
function ConsensusBar({ buy, hold, sell }: { buy: number; hold: number; sell: number }) {
  const total = buy + hold + sell
  if (total === 0) {
    return <span className="text-[9px] text-muted-foreground/40 font-mono">-</span>
  }

  const sellPct = (sell / total) * 100
  const holdPct = (hold / total) * 100
  const buyPct = (buy / total) * 100

  return (
    <div className="flex flex-col gap-1 w-24 select-none" title={`매수: ${buy} | 보유: ${hold} | 매도: ${sell}`}>
      {/* 3색 누적 막대 그래프 (먹색 -> 미색 -> 적색) */}
      <div className="w-full h-1.5 bg-neutral-100 flex overflow-hidden border border-border/20 rounded-none">
        {sell > 0 && <div className="h-full bg-foreground" style={{ width: `${sellPct}%` }} />}
        {hold > 0 && <div className="h-full bg-[#d5d2c1]" style={{ width: `${holdPct}%` }} />}
        {buy > 0 && <div className="h-full bg-primary" style={{ width: `${buyPct}%` }} />}
      </div>
      <div className="flex justify-between text-[8px] font-mono text-muted-foreground leading-none">
        <span>{sell}</span>
        <span>{hold}</span>
        <span className="text-primary font-bold">{buy}</span>
      </div>
    </div>
  )
}

// 개별 기업 행 컴포넌트 (Lazy Loading & 병렬 API 요청 최적화)
interface EarningsRowProps {
  item: any
  idx: number
  renderSessionBadge: (hour: string) => JSX.Element
  renderSurpriseBadge: (actual: number | null, estimate: number | null) => JSX.Element
}

function EarningsRow({ item, idx, renderSessionBadge, renderSurpriseBadge }: EarningsRowProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/finnhub/earnings/details?symbol=${item.symbol}`)
        if (!res.ok) throw new Error("API error")
        const json = await res.json()
        if (active) {
          setDetails(json)
        }
      } catch (err) {
        console.error(`Error loading details for ${item.symbol}:`, err)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchDetails()
    return () => {
      active = false
    }
  }, [item.symbol])

  return (
    <tr className="hover:bg-secondary/20 transition-colors">
      {/* 기업명 */}
      <td className="px-4 py-2.5 font-bold text-foreground">
        <span className="font-mono text-[11.5px] mr-1.5">{item.symbol}</span>
        <span className="text-muted-foreground text-[9.5px] font-medium hidden md:inline font-sans">
          {item.symbol}
        </span>
      </td>

      {/* 발표 일시 */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">{item.date}</span>
          {renderSessionBadge(item.hour)}
        </div>
      </td>

      {/* PER */}
      <td className="px-4 py-2.5 text-right font-mono font-medium">
        {loading ? (
          <span className="w-8 h-3.5 bg-neutral-100 animate-pulse inline-block" />
        ) : details?.pe !== null && details?.pe !== undefined ? (
          <span className="text-foreground">{details.pe.toFixed(1)}x</span>
        ) : (
          <span className="text-muted-foreground/40">-</span>
        )}
      </td>

      {/* 투자의견 컨센서스 */}
      <td className="px-4 py-2.5">
        <div className="flex justify-center items-center">
          {loading ? (
            <div className="w-24 h-1.5 bg-neutral-100 animate-pulse" />
          ) : (
            <ConsensusBar
              buy={details?.recommendation?.buy ?? 0}
              hold={details?.recommendation?.hold ?? 0}
              sell={details?.recommendation?.sell ?? 0}
            />
          )}
        </div>
      </td>

      {/* 예상 EPS */}
      <td className="px-4 py-2.5 text-right font-mono font-medium text-muted-foreground">
        {item.epsEstimate !== null ? item.epsEstimate.toFixed(2) : "-"}
      </td>

      {/* 실제 EPS */}
      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
        {item.epsActual !== null ? item.epsActual.toFixed(2) : "-"}
      </td>

      {/* 결과 */}
      <td className="px-4 py-2.5 text-center">
        {renderSurpriseBadge(item.epsActual, item.epsEstimate)}
      </td>

      {/* 최근 4분기 추이 Sparkline */}
      <td className="px-4 py-2.5">
        <div className="flex justify-center items-center">
          {loading ? (
            <div className="w-20 h-4 bg-neutral-100 animate-pulse" />
          ) : details?.surprise && details.surprise.length > 0 ? (
            <div className="w-20 h-6 select-none" title="과거 4분기 EPS 추이">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={details.surprise} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id={`grad-${item.symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--primary)"
                    strokeWidth={1.2}
                    fill={`url(#grad-${item.symbol})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <span className="text-[9px] font-mono text-muted-foreground/40">-</span>
          )}
        </div>
      </td>
    </tr>
  )
}

export function EarningsCalendarWidget() {
  const [earnings, setEarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"today" | "week" | "month">("week")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchEarnings = async () => {
    setLoading(true)
    setError(null)

    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const date = String(d.getDate()).padStart(2, "0")
      return `${year}-${month}-${date}`
    }

    const now = new Date()
    const fromDate = getLocalDateString(now)
    let toDate = fromDate

    if (filter === "week") {
      const targetDate = new Date()
      targetDate.setDate(now.getDate() + 7)
      toDate = getLocalDateString(targetDate)
    } else if (filter === "month") {
      const targetDate = new Date()
      targetDate.setDate(now.getDate() + 30)
      toDate = getLocalDateString(targetDate)
    }

    try {
      let endpoint = `/api/finnhub/earnings?from=${fromDate}&to=${toDate}`
      if (searchQuery.trim()) {
        endpoint += `&symbol=${searchQuery.trim()}`
      }

      const res = await fetch(endpoint)
      if (!res.ok) throw new Error("실적 데이터를 가져오지 못했습니다.")
      const data = await res.json()
      setEarnings(data.items || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || "오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchEarnings()
    }, 400)

    return () => clearTimeout(delayDebounce)
  }, [filter, searchQuery])

  const renderSessionBadge = (hour: string) => {
    const isBmo = hour?.toLowerCase() === "bmo" || hour?.toLowerCase() === "am"
    if (isBmo) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 select-none font-sans leading-none">
          <Sun className="w-2.5 h-2.5 text-amber-600" /> 晨 BMO
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-slate-900 text-white border border-slate-900 px-1.5 py-0.5 select-none font-sans leading-none">
        <Moon className="w-2.5 h-2.5 text-slate-300" /> 暮 AMC
      </span>
    )
  }

  const renderSurpriseBadge = (actual: number | null, estimate: number | null) => {
    if (actual === null || estimate === null || estimate === 0) return null

    const diffPercent = ((actual - estimate) / Math.abs(estimate)) * 100
    const isBeat = diffPercent >= 0

    if (isBeat) {
      return (
        <span className="stamp-red text-[8px] font-black scale-90 select-none">
          盈 +{diffPercent.toFixed(1)}%
        </span>
      )
    }

    return (
      <span className="inline-flex items-center justify-center border border-foreground bg-secondary text-foreground text-[8px] font-bold px-1 py-0.5 scale-90 select-none">
        虧 {diffPercent.toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="w-full flex flex-col h-[400px] bg-card border border-border rounded-none overflow-hidden transition-all">
      {/* 위젯 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary px-4 py-2.5 border-b border-border gap-2 shrink-0">
        <span className="text-[11px] font-bold text-foreground tracking-wider flex items-center gap-1.5 font-sans">
          <Calendar className="w-3.5 h-3.5 text-primary" /> 글로벌 주요 기업 실적 발표 일정
        </span>

        {/* 필터 및 검색 바 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border border-border bg-card p-0.5">
            {(["today", "week", "month"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-2 py-0.5 text-[9px] font-bold font-mono transition-colors uppercase ${
                  filter === type
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type === "today" ? "오늘" : type === "week" ? "7일 내" : "30일 내"}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="티커 검색 (예: TSLA)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-0.5 w-[140px] text-[10px] bg-card border border-border rounded-none focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>
      </div>

      {/* 리스트 테이블 영역 */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-card">
        {loading && earnings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] font-mono gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> 실적 일정을 불러오는 중...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-primary text-[10px] font-mono gap-1.5">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : earnings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] font-mono">
            해당 기간 내 예정된 주요 실적 발표 일정이 없습니다.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm border-b border-border/30 text-[9px] font-bold text-muted-foreground uppercase font-mono tracking-wider z-10">
              <tr>
                <th className="px-4 py-2 border-b border-border/20">기업명 (티커)</th>
                <th className="px-4 py-2 border-b border-border/20">발표 일시</th>
                <th className="px-4 py-2 border-b border-border/20 text-right">PER</th>
                <th className="px-4 py-2 border-b border-border/20 text-center">투자의견</th>
                <th className="px-4 py-2 border-b border-border/20 text-right">예상 EPS</th>
                <th className="px-4 py-2 border-b border-border/20 text-right">실제 EPS</th>
                <th className="px-4 py-2 border-b border-border/20 text-center">결과 (서프라이즈)</th>
                <th className="px-4 py-2 border-b border-border/20 text-center">최근 4분기 추이</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-sans">
              {earnings.map((item, idx) => (
                <EarningsRow
                  key={`${item.symbol}-${item.date}-${idx}`}
                  item={item}
                  idx={idx}
                  renderSessionBadge={renderSessionBadge}
                  renderSurpriseBadge={renderSurpriseBadge}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
