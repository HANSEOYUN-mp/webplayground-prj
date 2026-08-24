"use client"

import { useState, useEffect } from "react"
import { TrendingUp, RefreshCw, AlertCircle, Calendar, Search, X } from "lucide-react"
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

interface USMarketData {
  SPY?: TickerData
  QQQ?: TickerData
  QLD?: TickerData
  SCHD?: TickerData
  JEPI?: TickerData
  SOXX?: TickerData
  TECL?: TickerData
}

type TabType = "SPY" | "QQQ" | "QLD" | "SCHD" | "JEPI" | "SOXX" | "TECL" | "SEARCH"

function formatNumber(val: number, tab: TabType, currency: string = "USD") {
  if (val === undefined || val === null) return "-"
  return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function getTooltipLabel(tab: TabType) {
  return "주가"
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
}

// 꺾은선 차트 X축 날짜 포맷 (YY.MM)
function formatChartDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length >= 2) {
    return `${parts[0].slice(2)}.${parts[1]}`;
  }
  return dateStr;
}

export function TradingViewUSWidget() {
  const [data, setData] = useState<USMarketData | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("SPY")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // 검색 관련 상태
  const [searchTicker, setSearchTicker] = useState("")
  const [searchedData, setSearchedData] = useState<TickerData | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/us-summary")
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "미국 시장 데이터를 가져오지 못했습니다."
        )
      }
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  };

  // 단일 미국 종목/ETF 실시간 검색 함수
  const handleSearch = async () => {
    const query = searchTicker.toUpperCase().trim()
    if (!query) return

    setSearchLoading(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/stocks/us-summary?ticker=${query}`)
      const json = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        throw new Error(json.error || "종목 정보를 조회하지 못했습니다.")
      }

      if (json.singleData) {
        setSearchedData(json.singleData)
        setActiveTab("SEARCH")
      } else {
        throw new Error("올바른 종목 데이터가 반환되지 않았습니다.")
      }
    } catch (err: any) {
      setSearchError(err.message || "종목 코드를 찾을 수 없거나 데이터 수집 실패")
      setSearchedData(null)
      setActiveTab("SEARCH")
    } finally {
      setSearchLoading(false)
    }
  }

  // 검색 초기화 함수
  const handleClearSearch = () => {
    setSearchedData(null)
    setSearchTicker("")
    setSearchError(null)
    setActiveTab("SPY")
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  // 활성화된 탭의 시세 데이터 매핑
  const selectedData = activeTab === "SEARCH" 
    ? searchedData 
    : data?.[activeTab as Exclude<TabType, "SEARCH">]

  const isUp = (selectedData?.change ?? 0) >= 0
  const latestDate = selectedData?.history?.[selectedData.history.length - 1]?.date

  const tabLabels: Record<Exclude<TabType, "SEARCH">, string> = {
    SPY: "SPY (S&P 500)",
    QQQ: "QQQ (나스닥 100)",
    QLD: "QLD (나스닥 2배)",
    SCHD: "SCHD (배당성장)",
    JEPI: "JEPI (고배당)",
    SOXX: "SOXX (반도체)",
    TECL: "TECL (기술주 3배)"
  }

  return (
    <div className={`w-full bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col ${isExpanded ? "h-[560px]" : "h-[37px]"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between bg-secondary/50 px-4 py-2 ${isExpanded ? "border-b border-border" : ""} shrink-0`}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
            <TrendingUp className="w-3.5 h-3.5 text-black dark:text-white" /> Major US ETFs & Stocks
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {isExpanded && latestDate && (
            <span className="stamp-red text-[9px] font-bold rounded-sm border-primary/30 text-primary bg-primary/5 px-1.5 py-0.5 font-mono select-none">
              기준일: {latestDate}
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-0.5 text-[8.5px] font-extrabold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-none transition-colors select-none mr-1"
          >
            {isExpanded ? "접기 ▲" : "펼치기 ▼"}
          </button>

          {isExpanded && (
            <button onClick={fetchData} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {isExpanded && (
        <div className="flex overflow-x-auto bg-secondary/20 border-b border-border/60 p-1 gap-1 shrink-0 scrollbar-none select-none items-center justify-between">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {(["SPY", "QQQ", "QLD", "SCHD", "JEPI", "SOXX", "TECL"] as Exclude<TabType, "SEARCH">[]).map((tab) => (
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
            
            {/* 동적 검색 결과 탭 */}
            {searchedData && (
              <div className="flex items-center gap-0.5 bg-primary/10 border border-primary/20 pl-2.5 pr-1.5 py-0.5">
                <button
                  onClick={() => setActiveTab("SEARCH")}
                  className={`text-[10px] font-bold font-sans whitespace-nowrap ${
                    activeTab === "SEARCH" ? "text-primary font-black" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {searchedData.symbol} (검색결과)
                </button>
                <button
                  onClick={handleClearSearch}
                  className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
                  title="검색 지우기"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticker Search Bar */}
      {isExpanded && (
        <div className="flex px-4 py-1.5 border-b border-border/40 gap-2 items-center bg-secondary/10 shrink-0 select-none">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="미국 주식/ETF 티커 입력 (예: TSLA, NVDA, AAPL, UPRO)"
            value={searchTicker}
            onChange={(e) => setSearchTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-background border border-border px-2.5 py-1 text-[11px] font-medium placeholder-muted-foreground outline-none focus:border-primary font-mono uppercase"
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="px-3 py-1 bg-primary text-white text-[10px] font-bold hover:bg-primary/90 transition-colors shrink-0"
          >
            {searchLoading ? "조회 중..." : "조회"}
          </button>
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 p-5 relative overflow-hidden bg-card flex flex-col justify-between">
          {!mounted || (loading && !data && activeTab !== "SEARCH") || (searchLoading && activeTab === "SEARCH") ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin mb-3"></div>
              <span className="text-muted-foreground text-[10px] font-mono">시세 데이터 수집 중...</span>
            </div>
          ) : activeTab === "SEARCH" && searchError ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle className="w-6 h-6 text-primary mb-2" />
              <span className="text-[11px] font-bold text-primary max-w-[280px] leading-relaxed">{searchError}</span>
              <button 
                onClick={handleClearSearch} 
                className="mt-4 text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3.5 py-1.5 transition-all"
              >
                기본 화면으로 돌아가기
              </button>
            </div>
          ) : error && activeTab !== "SEARCH" ? (
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
                      <linearGradient id={`grad-us-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
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
                      fill={`url(#grad-us-${activeTab})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Footer Notes */}
              <div className="flex items-center justify-between text-[9px] text-muted-foreground shrink-0 border-t border-border/10 pt-2 font-mono">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>최근 1년 종가 기준 차트 • 5분 캐시 갱신 • 데이터 출처: Yahoo Finance</span>
                </div>
                {activeTab === "SEARCH" && (
                  <span className="text-primary font-bold">임시 검색 모드 활성화</span>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  )
}
