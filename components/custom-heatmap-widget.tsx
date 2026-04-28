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
  "S&P 500": { icon: "📈", desc: "미국 대형주" },
  "RUSS 2K": { icon: "🏢", desc: "미국 중소형주" },
  "BTC":     { icon: "₿",  desc: "비트코인" },
  "DXY":     { icon: "💵", desc: "달러 인덱스" },
  "GOLD":    { icon: "🥇", desc: "금 선물" },
  "WTI":     { icon: "🛢️", desc: "WTI 원유" },
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
  if (symbol === "DXY")     return price.toFixed(2)
  if (symbol === "GOLD")    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  if (symbol === "WTI")     return `$${price.toFixed(2)}`
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function HeatmapTile({ item }: { item: HeatmapItem }) {
  const pct = item.changePercent
  const isUp = pct >= 0
  const meta = ASSET_META[item.symbol] ?? { icon: "•", desc: "" }

  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-300 hover:brightness-110 cursor-default select-none overflow-hidden"
      style={{
        background: getHeatBg(pct),
        border: `1px solid ${getBorderColor(pct)}`,
      }}
      title={`${item.name}\n현재가: ${formatPrice(item.price, item.symbol)}\n변동: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
    >
      {/* 아이콘 + 심볼 */}
      <div className="flex items-center gap-1">
        <span className="text-base leading-none">{meta.icon}</span>
        <span className="text-white font-black text-sm tracking-wider leading-none">{item.symbol}</span>
      </div>

      {/* 등락률 (핵심) */}
      <div className={`flex items-center gap-0.5 font-black text-lg leading-none ${isUp ? "text-emerald-300" : "text-rose-300"}`}>
        <span className="text-xs">{isUp ? "▲" : "▼"}</span>
        <span>{Math.abs(pct).toFixed(2)}%</span>
      </div>

      {/* 현재가 */}
      <span className="text-white/60 text-xs font-medium leading-none">
        {formatPrice(item.price, item.symbol)}
      </span>

      {/* 자산 설명 */}
      <span className="text-white/30 text-[9px] tracking-wide leading-none hidden sm:block">
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

  useEffect(() => { fetchData() }, [])

  return (
    <div className="w-full h-[360px] bg-slate-950/60 backdrop-blur-xl border border-slate-600/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(148,163,184,0.08)] transition-colors duration-300 hover:border-slate-500/60 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-0.5 w-5 h-3.5">
            {["emerald","rose","emerald","rose","emerald","rose"].map((c,i) => (
              <div key={i} className={`rounded-[2px] bg-${c}-500/70`} />
            ))}
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">MONEY FLOW</h2>
            <span className="text-[10px] text-slate-400/80 mt-1">거시경제 자금 흐름 · 색상: 전일 대비 등락률</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <span className="text-[9px] text-slate-500">{updatedAt} 기준</span>}
          <button onClick={fetchData} disabled={loading} className="p-1 hover:bg-slate-600/30 rounded transition-colors" title="새로고침">
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Heatmap 3×2 Grid */}
      <div className="flex-1 p-3 relative">
        {loading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-500/50 border-t-slate-300 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span className="text-[11px] text-rose-200/80">{error}</span>
            <button onClick={fetchData} className="text-[10px] text-slate-300 bg-slate-700/60 px-3 py-1 rounded hover:bg-slate-600/60 transition-colors">재시도</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full">
            {data.slice(0, 6).map((item) => (
              <HeatmapTile key={item.symbol} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 px-4 py-1.5 border-t border-slate-700/30 shrink-0">
        {[
          { label: "급등", pct: 5 }, { label: "상승", pct: 2 }, { label: "보합", pct: 0.2 },
          { label: "하락", pct: -2 }, { label: "급락", pct: -5 },
        ].map(({ label, pct }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ background: getHeatBg(pct) }} />
            <span className="text-[8px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
