"use client"

import { useState, useEffect } from "react"
import { RefreshCw, AlertCircle } from "lucide-react"

interface HeatmapItem {
  symbol: string
  name: string
  type: string
  price: number
  change: number
  changePercent: number
}

// 자산 타입별 아이콘/설명
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

function getHeatBg(pct: number): string {
  const clamped = Math.max(-5, Math.min(5, pct))
  const intensity = Math.abs(clamped) / 5
  if (clamped >= 0) {
    const alpha = 0.12 + intensity * 0.68
    return `rgba(16, ${Math.round(120 + intensity * 105)}, 80, ${alpha})`
  } else {
    const alpha = 0.12 + intensity * 0.68
    return `rgba(${Math.round(170 + intensity * 75)}, 30, 50, ${alpha})`
  }
}

function getBorderColor(pct: number): string {
  const intensity = Math.min(Math.abs(pct) / 5, 1)
  return pct >= 0
    ? `rgba(16, 185, 129, ${0.15 + intensity * 0.55})`
    : `rgba(244, 63, 94, ${0.15 + intensity * 0.55})`
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

  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-300 hover:brightness-110 cursor-default select-none overflow-hidden h-full w-full"
      style={{
        background: getHeatBg(pct),
        border: `1px solid ${getBorderColor(pct)}`,
      }}
      title={`${item.name}\n현재가: ${formatPrice(item.price, item.symbol)}\n변동: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
    >
      {/* 아이콘 + 심볼 */}
      <div className="flex items-center gap-1">
        <span className="text-base leading-none">{meta.icon}</span>
        <span className="text-foreground font-bold text-sm tracking-wider leading-none">{item.symbol}</span>
      </div>

      {/* 등락률 (핵심) */}
      <div className="flex items-center gap-0.5 font-black text-lg leading-none text-foreground">
        <span className="text-xs">{isUp ? "▲" : "▼"}</span>
        <span>{Math.abs(pct).toFixed(2)}%</span>
      </div>

      {/* 현재가 */}
      <span className="text-foreground/85 text-xs font-bold leading-none">
        {formatPrice(item.price, item.symbol)}
      </span>

      {/* 자산 설명 */}
      <span className="text-foreground/60 text-[9px] tracking-wide leading-none hidden sm:block">
        {meta.desc}
      </span>
    </div>
  )
}

export function CustomHeatmapWidget() {
  const [data, setData] = useState<HeatmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState("")

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/heatmap")
      if (!res.ok) throw new Error("데이터 로드 실패")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json.items || [])
      setUpdatedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="w-full h-[360px] bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 flex flex-col">
 
      {/* IDE Window Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground tracking-wider">
            주요 자금 흐름
          </span>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <span className="text-[9px] text-muted-foreground font-mono">{updatedAt} 기준</span>}
          <button onClick={fetchData} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
 
      {/* 3×3 Grid */}
      <div className="flex-1 p-3 relative flex flex-col justify-stretch">
        {loading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            <span className="text-[11px] text-primary">{error}</span>
            <button onClick={fetchData} className="text-[10px] text-foreground bg-secondary px-3 py-1 border border-border hover:bg-secondary/60 transition-colors font-mono">재시도</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-full h-full">
            {data.slice(0, 9).map((item) => (
              <HeatmapTile key={item.symbol} item={item} />
            ))}
          </div>
        )}
      </div>
 
      {/* Legend at the bottom with matching title color */}
      <div className="flex items-center justify-center gap-3 px-4 py-1.5 border-t border-border/10 shrink-0 select-none">
        {[
          { label: "급등", pct: 5 }, { label: "상승", pct: 2 }, { label: "보합", pct: 0.2 },
          { label: "하락", pct: -2 }, { label: "급락", pct: -5 },
        ].map(({ label, pct }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm border border-black/10" style={{ background: getHeatBg(pct) }} />
            <span className="text-[9px] text-muted-foreground font-sans font-bold leading-none">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
