"use client"

import { useState, useEffect } from "react"
import { TrendingUp, RefreshCw, AlertCircle, Sparkles } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

interface ComparisonDataPoint {
  date: string
  nasdaq: number
  bigTech: number
}

interface ComparisonResponse {
  baseDate: string
  latest: {
    date: string
    nasdaqYield: number
    bigTechYield: number
    difference: number
  }
  items: ComparisonDataPoint[]
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
}

function formatChartDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length >= 2) {
    return `${parts[0].slice(2)}.${parts[1]}`;
  }
  return dateStr;
}

export function TechVsNasdaqWidget() {
  const [data, setData] = useState<ComparisonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/compare")
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "비교 데이터를 불러오지 못했습니다."
        )
      }
      if (json.error) throw new Error(String(json.error))
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const latest = data?.latest
  const diffVal = latest?.difference ?? 0
  const isBigTechWinning = diffVal >= 0

  return (
    <div className="w-full flex flex-col h-auto bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50">
      {/* Widget Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 select-none font-sans">
          <TrendingUp className="w-3.5 h-3.5 text-black dark:text-white" /> MAGS vs 나스닥 올해(YTD) 수익률 추이
        </span>
        <button onClick={fetchData} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 p-5 relative">
        {!mounted || (loading && !data) ? (
          <div className="flex flex-col items-center justify-center min-h-[350px]">
             <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin mb-3"></div>
             <span className="text-muted-foreground text-[10px] font-mono">시계열 데이터 연산 및 정규화 중...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[350px] text-center">
            <AlertCircle className="w-6 h-6 text-primary mb-2" />
            <span className="text-[11px] text-primary">{error}</span>
            <button onClick={fetchData} className="mt-3 text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5">다시 시도</button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex items-center justify-center min-h-[350px] text-muted-foreground text-[11px] font-mono">데이터가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Top Cards: Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Big Tech Yield Card */}
              <div className="flex flex-col gap-1 p-3.5 bg-secondary/15 rounded-sm border border-border/20">
                <span className="text-[9.5px] font-bold text-indigo-500 uppercase tracking-wider">MAGS (Magnificent 7) 평균 수익률</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[20px] font-black text-foreground font-mono leading-none">
                    {latest?.bigTechYield && latest.bigTechYield >= 0 ? `+${latest.bigTechYield}` : latest?.bigTechYield}%
                  </span>
                  <span className="text-[9px] text-muted-foreground">올해 누적 (YTD)</span>
                </div>
                <span className="text-[8.5px] text-muted-foreground mt-0.5 font-sans truncate">시장을 주도하는 7대 기술 기업 평균 수익률</span>
              </div>

              {/* Nasdaq Yield Card */}
              <div className="flex flex-col gap-1 p-3.5 bg-secondary/15 rounded-sm border border-border/20">
                <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">나스닥 종합지수 수익률</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[20px] font-black text-foreground/80 font-mono leading-none">
                    {latest?.nasdaqYield && latest.nasdaqYield >= 0 ? `+${latest.nasdaqYield}` : latest?.nasdaqYield}%
                  </span>
                  <span className="text-[9px] text-muted-foreground">올해 누적 (YTD)</span>
                </div>
                <span className="text-[8.5px] text-muted-foreground mt-0.5 font-sans truncate">나스닥 종합지수 (^IXIC) 등락 기준</span>
              </div>

              {/* Difference Card */}
              <div className="flex flex-col gap-1 p-3.5 bg-secondary/20 rounded-sm border border-border/40 relative overflow-hidden">
                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" /> MAGS 상대 초과수익률
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-[20px] font-black font-mono leading-none ${isBigTechWinning ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isBigTechWinning ? `+${diffVal}` : diffVal}%p
                  </span>
                  <span className="text-[9px] text-muted-foreground">{isBigTechWinning ? '아웃퍼폼' : '언더퍼폼'}</span>
                </div>
                <span className="text-[8.5px] text-muted-foreground mt-0.5 font-sans">지수 대비 MAGS의 성과차</span>
              </div>

            </div>

            {/* Performance Line Chart */}
            <div className="w-full h-[320px] bg-neutral-900/5 dark:bg-black/20 border border-border/10 p-3 rounded-sm relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.items}
                  margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: "10px",
                      background: "rgba(255, 255, 255, 0.98)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#111",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
                    }}
                    labelFormatter={(label) => `날짜: ${formatDate(label)}`}
                    formatter={(value: any, name: any) => [
                      `${value >= 0 ? '+' : ''}${value}%`,
                      name === 'bigTech' ? 'MAGS 평균' : '나스닥 종합지수'
                    ]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconSize={10} 
                    iconType="plainline"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    formatter={(value) => (value === 'bigTech' ? 'MAGS 평균' : '나스닥 종합지수')}
                  />
                  {/* Big Tech Line (Indigo) */}
                  <Line
                    type="monotone"
                    dataKey="bigTech"
                    name="bigTech"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {/* Nasdaq Line (Slate) */}
                  <Line
                    type="monotone"
                    dataKey="nasdaq"
                    name="nasdaq"
                    stroke="#94a3b8"
                    strokeWidth={1.8}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory notes */}
            <div className="flex flex-col gap-3 p-4 bg-secondary/10 rounded-sm border border-border/10 text-[9.5px] leading-relaxed text-muted-foreground">
              <p>• <strong>수익률 기준점:</strong> {formatDate(data.baseDate)} 의 종가를 기준 수익률 0.00%로 설정(정규화)하여 일자별 상대적인 누적 성장률을 비교합니다.</p>
              
              <div className="flex flex-col gap-1 border-t border-border/10 pt-2.5">
                <strong className="text-foreground text-[10px]">구성 종목 (The Magnificent 7)</strong>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[9px] font-sans text-muted-foreground/80 mt-0.5">
                  <span>엔비디아 (NVDA)</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>마이크로소프트 (MSFT)</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>애플 (AAPL)</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>알파벳 (GOOGL)</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>아마존 (AMZN)</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>메타 (META)</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span>테슬라 (TSLA)</span>
                </div>
              </div>
              
              <p className="border-t border-border/10 pt-2 font-mono text-[8.5px]">
                • 본 데이터는 매 영업일 종료 후 종가(Close) 기준으로 갱신되며, 4시간 주기로 캐싱되어 제공됩니다.
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
