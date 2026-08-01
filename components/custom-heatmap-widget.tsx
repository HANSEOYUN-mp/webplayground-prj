"use client"

import { useState, useEffect } from "react"
import { RefreshCw, AlertCircle, Coins, HelpCircle } from "lucide-react"

interface HeatmapItem {
  symbol: string
  name: string
  type: string
  price: number
  change: number
  changePercent: number
}

// 자산 타입별 아이콘 및 설명
const ASSET_META: Record<string, { icon: string; desc: string }> = {
  "BTC":     { icon: "₿",  desc: "비트코인 (초고위험)" },
  "NASDAQ":  { icon: "🚀", desc: "미국 기술주 (고위험)" },
  "S&P 500": { icon: "📈", desc: "미국 대형주 (위험)" },
  "VIX":     { icon: "⚠️", desc: "변동성 지수 (단기 공포)" },
  "WTI":     { icon: "🛢️", desc: "WTI 원유 (실물 경기)" },
  "DXY":     { icon: "💵", desc: "달러 인덱스 (기축 통화)" },
  "GOLD":    { icon: "🥇", desc: "금 선물 (안전 자산)" },
  "US 10Y":  { icon: "🏦", desc: "미 10년물 금리 (중장기)" },
  "US 30Y":  { icon: "⏳", desc: "미 30년물 금리 (초장기)" },
}

// 등락률 %에 따른 3x3 타일 배경색 (상승+: 초록 / 0%: 노란색 / 하락-: 빨간색)
function getTileBg(pct: number): string {
  if (pct >= 2.5)   return "rgba(4, 120, 87, 0.18)"    // 진한 에메랄드 초록
  if (pct >= 1.0)   return "rgba(16, 185, 129, 0.15)"   // 선명 초록
  if (pct >= 0.2)   return "rgba(52, 211, 153, 0.12)"   // 라이트 그린
  if (pct > -0.2)   return "rgba(234, 179, 8, 0.12)"    // 선명 노란색 (0% 중립)
  if (pct > -1.0)   return "rgba(249, 115, 22, 0.15)"   // 라이트 레드/주황
  if (pct > -2.5)   return "rgba(239, 68, 68, 0.18)"    // 선명 빨강
  return "rgba(185, 28, 28, 0.22)"                    // 진한 크림슨 빨강
}

// 등락률 %에 따른 3x3 타일 테두리색
function getTileBorder(pct: number): string {
  if (pct >= 0.2) return "rgba(16, 185, 129, 0.4)"   // 초록 테두리
  if (pct > -0.2) return "rgba(234, 179, 8, 0.4)"    // 노란색 테두리
  return "rgba(239, 68, 68, 0.4)"                    // 빨간색 테두리
}

// 등락률 % 텍스트 색상
function getTileTextColor(pct: number): string {
  if (pct >= 0.2) return "text-emerald-700 font-extrabold dark:text-emerald-400"
  if (pct > -0.2) return "text-amber-700 font-extrabold dark:text-amber-400"
  return "text-rose-700 font-extrabold dark:text-rose-400"
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === "BTC")     return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  if (symbol === "NASDAQ")  return price.toLocaleString("en-US", { maximumFractionDigits: 1 })
  if (symbol === "S&P 500") return price.toLocaleString("en-US", { maximumFractionDigits: 1 })
  if (symbol === "DXY")     return price.toFixed(2)
  if (symbol === "GOLD")    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  if (symbol === "WTI")     return `$${price.toFixed(2)}`
  if (symbol === "VIX")     return price.toFixed(2)
  if (symbol === "US 10Y" || symbol === "US 30Y") return `${price.toFixed(2)}%`
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function HeatmapTile({ item }: { item: HeatmapItem }) {
  const pct = item.changePercent
  const isUp = pct >= 0
  const meta = ASSET_META[item.symbol] ?? { icon: "•", desc: "" }

  // VIX와 WTI는 역방향 지표: 상승(+) 시 시장 악재(빨간색), 하락(-) 시 시장 호재(초록색)
  const isInverted = item.symbol === "VIX" || item.symbol === "WTI"
  const colorPct = isInverted ? -pct : pct

  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 rounded-none transition-all duration-300 hover:scale-[1.02] cursor-default p-2.5 h-full select-none"
      style={{
        background: getTileBg(colorPct),
        border: `1.5px solid ${getTileBorder(colorPct)}`,
      }}
      title={`${item.name}\n현재가: ${formatPrice(item.price, item.symbol)}\n변동: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%${isInverted ? " (역방향 지표)" : ""}`}
    >
      {/* 아이콘 + 심볼 */}
      <div className="flex items-center gap-1">
        <span className="text-sm leading-none">{meta.icon}</span>
        <span className="text-foreground font-mono font-extrabold text-xs tracking-wider leading-none">
          {item.symbol}
        </span>
      </div>

      {/* 등락률 */}
      <div className={`flex items-center gap-1 text-sm font-mono leading-none ${getTileTextColor(colorPct)}`}>
        <span className="text-[10px]">{isUp ? "▲" : "▼"}</span>
        <span>{Math.abs(pct).toFixed(2)}%</span>
      </div>

      {/* 현재가 */}
      <span className="text-foreground/80 text-[10px] font-mono font-bold leading-none">
        {formatPrice(item.price, item.symbol)}
      </span>

      {/* 자산 설명 */}
      <span className="text-muted-foreground text-[9px] font-sans leading-none truncate max-w-full hidden sm:block">
        {meta.desc}
      </span>
    </div>
  )
}

export function CustomHeatmapWidget() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [data, setData] = useState<HeatmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState("")
  const [showGuide, setShowGuide] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/heatmap")
      if (!res.ok) throw new Error("데이터를 불러오는데 실패했습니다.")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json.items || [])
      setUpdatedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className={`w-full bg-card border border-border rounded-none overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col ${isExpanded ? "h-[500px]" : "h-[37px]"}`}>
      {/* IDE Window Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
            <Coins className="w-3.5 h-3.5 text-black dark:text-white" /> MONEY FLOW MATRIX
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-0.5 text-[8.5px] font-extrabold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-none transition-colors select-none mr-1"
          >
            {isExpanded ? "접기 ▲" : "펼치기 ▼"}
          </button>

          {isExpanded && (
            <button
              onClick={() => setShowGuide((prev) => !prev)}
              className={`px-2 py-0.5 text-[9px] font-sans font-bold border rounded-none transition-all flex items-center gap-1 cursor-pointer ${
                showGuide
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              <span>가이드 {showGuide ? "OFF" : "ON"}</span>
            </button>
          )}

          {updatedAt && <span className="text-[9px] text-muted-foreground font-mono">{updatedAt} 기준</span>}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1 hover:bg-secondary rounded-none transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3x3 그리드 매트릭스 본문 영역 */}
      {isExpanded && (
        <div className="p-4 relative bg-card flex-1 flex flex-col justify-stretch gap-3 overflow-hidden select-none">
          {/* 가이드 안내 박스 */}
          {showGuide && (
            <div className="p-3 rounded-none bg-primary/5 border border-primary/10 space-y-1.5 text-[10px] shrink-0">
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-primary text-white font-mono text-[9px] font-bold rounded-none shrink-0 mt-0.5">3x3 좌표</span>
                <p className="text-foreground/80 leading-relaxed font-sans">
                  <strong>X축 (기간)</strong>: 좌(단기 1D/1W) ➔ 중(중기 1M/3M) ➔ 우(장기 1Y+) | <strong>Y축 (위험도)</strong>: 위(고위험 자산) ➔ 중간(중위험 자산) ➔ 아래(안전 자산)
                </p>
              </div>
              <div className="flex items-start gap-2 pt-1 border-t border-primary/10">
                <span className="px-1.5 py-0.5 bg-neutral-900 text-white font-mono text-[9px] font-bold rounded-none shrink-0 mt-0.5 dark:bg-white dark:text-neutral-950">색상 해석</span>
                <p className="text-foreground/80 leading-relaxed font-sans">
                  일반 자산은 <strong>상승(+) 초록색 / 하락(-) 빨간색</strong>으로 표시되며, <strong>VIX(공포지수)와 WTI(유가)는 역방향 지표</strong>로서 상승(+) 시 시장 악재(빨간색), 하락(-) 시 시장 호재(초록색)로 적용됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 3x3 Grid Matrix Container with Y-axis on left and X-axis on bottom */}
          <div className="flex-1 min-h-0 border border-border rounded-none bg-secondary/20 p-3 flex flex-col justify-between">
            {loading && data.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary/45 border-t-primary rounded-full animate-spin mb-3"></div>
                <span className="text-muted-foreground text-xs font-mono">Loading Money Flow Matrix...</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
                <span className="text-[11px] text-red-600 font-mono">{error}</span>
                <button onClick={fetchData} className="mt-3 text-[10px] font-mono font-bold bg-secondary border border-border px-3 py-1.5 rounded-none hover:bg-secondary/60">
                  재시도
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between gap-2.5">
                {/* 3x3 Grid with Y-axis label */}
                <div className="flex-1 flex items-stretch gap-2.5 min-h-0">
                  {/* Y-Axis Label (Left) */}
                  <div className="flex flex-col justify-between items-center py-2 px-1 shrink-0 font-mono text-[10px] font-bold text-muted-foreground border-r border-border pr-2 select-none">
                    <span className="text-red-600 dark:text-red-400">고위험</span>
                    <span className="text-muted-foreground my-auto">중위험</span>
                    <span className="text-blue-600 dark:text-blue-400">안전자산</span>
                  </div>

                  {/* 3x3 Grid Cards */}
                  <div className="grid grid-cols-3 grid-rows-3 gap-2 flex-1 min-h-0">
                    {data.slice(0, 9).map((item, idx) => (
                      <HeatmapTile key={idx} item={item} />
                    ))}
                  </div>
                </div>

                {/* X-Axis Label (Bottom) */}
                <div className="flex justify-between items-center pl-14 pr-2 pt-1.5 font-mono text-[10px] font-bold text-muted-foreground border-t border-border select-none shrink-0">
                  <span>단기 (1D / 1W)</span>
                  <span>중기 (1M / 3M)</span>
                  <span>장기 (1Y+)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
