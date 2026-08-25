"use client"

import { useState, useEffect } from "react"
import { TrendingUp, RefreshCw, AlertCircle, Calendar } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface TickerData {
  symbol: string
  currency: string
  currentPrice: number
  prevClose: number
  change: number
  changePercent: number
  high52w: number
  low52w: number
  history: { date: string; value: number }[]
  error?: string
}

interface KoreaMarketData {
  KOSPI?: TickerData
  KOSPI200?: TickerData
  KOSDAQ?: TickerData
  NQ_F?: TickerData
  SAMSUNG?: TickerData
  HYNIX?: TickerData
  DOOSAN?: TickerData
  GOLD?: TickerData
  EXCHANGE?: TickerData
  JPY?: TickerData
}

type TabType = "KOSPI" | "KOSPI200" | "KOSDAQ" | "NQ_F" | "SAMSUNG" | "HYNIX" | "DOOSAN" | "GOLD" | "EXCHANGE" | "JPY"

function formatNumber(val: number, tab: TabType, currency: string = "KRW") {
  if (val === undefined || val === null) return "-"
  if (tab === "KOSPI" || tab === "KOSPI200" || tab === "KOSDAQ") {
    return new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
  }
  if (tab === "NQ_F") {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + " pt"
  }
  if (tab === "GOLD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(val)
  }
  if (tab === "EXCHANGE") {
    return new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + "원"
  }
  if (tab === "JPY") {
    return new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + "원 (100엔)"
  }
  // Stocks (SAMSUNG, HYNIX, DOOSAN) are in KRW (no decimals)
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(val)
}

function getTooltipLabel(tab: TabType) {
  if (tab === "GOLD") return "금 시세"
  if (tab === "EXCHANGE") return "원/달러 환율"
  if (tab === "JPY") return "100엔 환율"
  if (tab === "SAMSUNG" || tab === "HYNIX" || tab === "DOOSAN") return "주가"
  if (tab === "KOSPI200") return "코스피200"
  if (tab === "NQ_F") return "나스닥100 선물"
  return "지수"
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

export function TradingViewKoreaWidget() {
  const [data, setData] = useState<KoreaMarketData | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("KOSPI")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/korea")
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "국내 시장 데이터를 가져오지 못했습니다."
        )
      }
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

  const selectedData = data?.[activeTab]
  const isUp = (selectedData?.change ?? 0) >= 0

  const tabLabels: Record<TabType, string> = {
    KOSPI: "코스피 (KOSPI)",
    KOSPI200: "코스피200 (선물/지수)",
    KOSDAQ: "코스닥 (KOSDAQ)",
    NQ_F: "나스닥 100 선물 (NQ)",
    SAMSUNG: "삼성전자",
    HYNIX: "SK하이닉스",
    DOOSAN: "두산에너빌리티",
    GOLD: "금 (GOLD)",
    EXCHANGE: "원/달러 환율",
    JPY: "엔/원 환율 (100엔)"
  }

  return (
    <div className="w-full flex flex-col h-[520px] bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50">
      {/* Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans select-text cursor-text">
          <TrendingUp className="w-3.5 h-3.5 text-black dark:text-white" /> 국내 시장 및 주요 지표 요약
        </span>
        <button onClick={fetchData} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-secondary/20 border-b border-border/60 p-1 gap-1 shrink-0 scrollbar-none select-none">
        {(["KOSPI", "KOSPI200", "KOSDAQ", "NQ_F", "SAMSUNG", "HYNIX", "DOOSAN", "GOLD", "EXCHANGE", "JPY"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-[10px] font-bold transition-all rounded-none font-sans whitespace-nowrap ${
              activeTab === tab
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-5 relative overflow-hidden bg-card flex flex-col justify-between">
        {!mounted || (loading && !data) ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin mb-3"></div>
            <span className="text-muted-foreground text-[10px] font-mono">시세 데이터 수집 중...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-6 h-6 text-primary mb-2" />
            <span className="text-[11px] text-primary">{error}</span>
            <button onClick={fetchData} className="mt-3 text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5">다시 시도</button>
          </div>
        ) : !selectedData || selectedData.error ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-[11.5px]">
            <AlertCircle className="w-5 h-5 text-muted-foreground/50 mb-2" />
            {selectedData?.error || "이 종목의 시세를 일시적으로 불러올 수 없습니다."}
          </div>
        ) : (
          <div className="flex flex-col flex-1 gap-4 overflow-hidden">
            
            {/* Price Summary Panel */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border/10 pb-4 shrink-0">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[26px] font-black text-foreground font-mono leading-none tracking-tight">
                  {formatNumber(selectedData.currentPrice, activeTab, selectedData.currency)}
                </span>
                <span className={`text-[12.5px] font-black font-mono flex items-center gap-0.5 ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                  {isUp ? '▲' : '▼'} {Math.abs(selectedData.change)} ({selectedData.changePercent >= 0 ? '+' : ''}{selectedData.changePercent.toFixed(2)}%)
                </span>
              </div>

              {/* 52-week High/Low */}
              <div className="flex gap-4 text-[9.5px] text-muted-foreground font-sans bg-secondary/10 px-3 py-1.5 border border-border/10">
                <div>
                  <span className="opacity-80">52주 최고: </span>
                  <span className="font-bold font-mono text-foreground">{formatNumber(selectedData.high52w, activeTab, selectedData.currency)}</span>
                </div>
                <div className="border-l border-border/20 pl-4">
                  <span className="opacity-80">52주 최저: </span>
                  <span className="font-bold font-mono text-foreground">{formatNumber(selectedData.low52w, activeTab, selectedData.currency)}</span>
                </div>
              </div>
            </div>

            {/* 1-Year Area Chart */}
            <div className="flex-1 w-full bg-neutral-900/5 dark:bg-black/20 border border-border/10 p-2.5 rounded-sm relative min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedData.history} margin={{ top: 10, right: 5, left: 15, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`grad-korea-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isUp ? "#ef4444" : "#3b82f6"} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={isUp ? "#ef4444" : "#3b82f6"} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 8, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 8, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatNumber(val, activeTab, selectedData.currency)}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: "10px",
                      background: "rgba(255, 255, 255, 0.98)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      color: "#111",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                    labelFormatter={(label) => `날짜: ${formatDate(label)}`}
                    formatter={(value: any) => [
                      formatNumber(value, activeTab, selectedData.currency),
                      getTooltipLabel(activeTab)
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isUp ? "#ef4444" : "#3b82f6"}
                    strokeWidth={1.8}
                    fill={`url(#grad-korea-${activeTab})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer Notes */}
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground shrink-0 border-t border-border/10 pt-2 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>최근 1년 종가 기준 차트 • 5분 캐시 갱신 • 데이터 출처: Yahoo Finance</span>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
