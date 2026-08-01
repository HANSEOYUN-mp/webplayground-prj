"use client"

import { useState, useEffect } from "react"
import { BarChart3, RefreshCw, AlertCircle } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

interface AssetPoint {
  date: string
  stocks: number
  gold: number
  reits: number
  oil: number
  bonds: number
  crypto: number
}

interface AssetResponse {
  baseDate: string
  latest: {
    date: string
    stocks: number
    gold: number
    reits: number
    oil: number
    bonds: number
    crypto: number
  }
  items: AssetPoint[]
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

export function AssetsCompareWidget() {
  const [data, setData] = useState<AssetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/compare-assets")
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "자산군 비교 데이터를 불러오지 못했습니다."
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

  const assetMeta = [
    { key: "stocks", label: "주식 (S&P 500)", color: "#3b82f6", bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-500" },
    { key: "gold", label: "금 (Gold)", color: "#eab308", bg: "bg-yellow-500/5", border: "border-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400" },
    { key: "reits", label: "리츠 (REITs)", color: "#a855f7", bg: "bg-purple-500/5", border: "border-purple-500/20", text: "text-purple-500" },
    { key: "oil", label: "원유 (WTI)", color: "#14b8a6", bg: "bg-teal-500/5", border: "border-teal-500/20", text: "text-teal-500" },
    { key: "bonds", label: "채권 (미 장기채)", color: "#64748b", bg: "bg-slate-500/5", border: "border-slate-500/20", text: "text-slate-500" },
    { key: "crypto", label: "코인 (비트코인)", color: "#f43f5e", bg: "bg-rose-500/5", border: "border-rose-500/20", text: "text-rose-500" }
  ]

  return (
    <div className="w-full flex flex-col h-auto bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50">
      {/* Widget Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 select-none font-sans">
          <BarChart3 className="w-3.5 h-3.5 text-black dark:text-white" /> 글로벌 주요 자산군 올해(YTD) 수익률 비교
        </span>
        <button onClick={fetchData} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 p-5 relative">
        {!mounted || (loading && !data) ? (
          <div className="flex flex-col items-center justify-center min-h-[350px]">
             <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin mb-3"></div>
             <span className="text-muted-foreground text-[10px] font-mono">자산별 데이터 갱신 및 변동률 정규화 중...</span>
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
            
            {/* Grid of Individual Asset Mini Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetMeta.map((asset) => {
                const yieldVal = (latest as any)?.[asset.key] ?? 0
                return (
                  <div key={asset.key} className={`flex flex-col gap-3.5 p-4 bg-secondary/15 rounded-sm border ${asset.border} transition-all hover:bg-secondary/25`}>
                    
                    {/* Header: Name and Yield */}
                    <div className="flex items-center justify-between border-b border-border/10 pb-2">
                      <span className={`text-[10px] font-bold ${asset.text} uppercase tracking-wider`}>{asset.label}</span>
                      <span className="text-[13.5px] font-black text-foreground font-mono">
                        {yieldVal >= 0 ? `+${yieldVal}` : yieldVal}%
                      </span>
                    </div>

                    {/* Mini Sparkline Chart */}
                    <div className="w-full h-24 select-none relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.items} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.08)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatChartDate}
                            tick={{ fontSize: 7, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 7, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${val}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: "9px",
                              background: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "3px",
                              padding: "4px 8px",
                              color: "#111"
                            }}
                            labelFormatter={(label) => `날짜: ${formatDate(label)}`}
                            formatter={(value: any) => [`${value >= 0 ? '+' : ''}${value}%`, '수익률']}
                          />
                          <Line
                            type="monotone"
                            dataKey={asset.key}
                            stroke={asset.color}
                            strokeWidth={1.8}
                            dot={false}
                            activeDot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                  </div>
                )
              })}
            </div>

            {/* Asset explanations / notes */}
            <div className="flex flex-col gap-1.5 p-3.5 bg-secondary/10 rounded-sm border border-border/10 text-[9.5px] leading-relaxed text-muted-foreground">
              <p>• <strong>수익률 기준점:</strong> {formatDate(data.baseDate)} 의 종가를 기준 수익률 0.00%로 설정(정규화)하여 일자별 상대적인 누적 수익률을 비교합니다.</p>
              <p>• <strong>매핑 자산군:</strong> 주식(S&P 500 선물), 금(GLD ETF), 리츠(VNQ ETF), 원유(USO ETF), 채권(TLT 미 장기채 ETF), 코인(BTC-USD 비트코인 현물)</p>
              <p>• 가상자산(비트코인)은 365일 연중무휴 거래되나, 타 자산군과의 공정한 비교 및 일자별 동기화를 위해 전통 시장 휴장일(주말 및 미국 공휴일)은 제외하고 매칭하여 집계합니다.</p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
