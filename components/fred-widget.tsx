"use client"

import { useState, useEffect } from "react"
import { LineChart, RefreshCw, AlertCircle } from "lucide-react"

interface FredItem {
  id: string
  title: string
  format: "percent" | "index"
  latest: {
    date: string
    value: number
  }
  previous: {
    date: string
    value: number
  }
}

function formatDate(dateStr: string) {
  // 2024-04-26 -> 24.04.26
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
}

export function FredWidget() {
  const [data, setData] = useState<FredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFred = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/fred")
      if (!res.ok) throw new Error("FRED 데이터를 불러오지 못했습니다.")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFred()
  }, [])

  return (
    <div className="w-full flex flex-col h-[360px] bg-violet-950/40 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-colors duration-300 hover:bg-violet-900/50 hover:border-violet-500/60">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-violet-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">MACRO INDICATORS</h2>
        </div>
        <button onClick={fetchFred} disabled={loading} className="p-1 hover:bg-violet-500/20 rounded transition-colors" title="새로고침">
          <RefreshCw className={`w-3.5 h-3.5 text-violet-400/80 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-violet relative">
        {loading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-6 h-6 border-2 border-violet-500/50 border-t-violet-300 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-6 h-6 text-rose-400 mb-2" />
            <span className="text-[11px] text-rose-200/80">{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-violet-200/50 text-[11px]">데이터가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((item) => {
              const diff = item.latest.value - item.previous.value;
              const isUp = diff > 0;
              const isDown = diff < 0;
              
              let changeText = "";
              if (item.format === "percent") {
                changeText = `${isUp ? "+" : ""}${diff.toFixed(2)}%p`;
              } else {
                const pct = (diff / item.previous.value) * 100;
                changeText = `${isUp ? "+" : ""}${pct.toFixed(2)}%`;
              }

              // Color semantics:
              // Unemployment, CPI, PPI going up is usually "red" for market.
              // GDP going up is "green".
              // Let's just stick to a consistent UP=Green, DOWN=Red to keep it simple, or neutral Violet.
              // For consistent UI, let's use Emerald for UP, Rose for DOWN.
              const colorClass = isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "text-violet-300";
              const bgColorClass = isUp ? "bg-emerald-950/40" : isDown ? "bg-rose-950/40" : "bg-violet-950/40";

              return (
                <div key={item.id} className="flex flex-col gap-1.5 p-2.5 bg-violet-900/20 hover:bg-violet-900/30 rounded-lg transition-colors shrink-0 border border-violet-800/40">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-violet-50 text-[12px]">{item.title}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shadow-inner ${colorClass} ${bgColorClass}`}>
                      {isUp ? "▲" : isDown ? "▼" : "-"} {changeText}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {/* Previous */}
                    <div className="flex flex-col p-1.5 rounded bg-black/20">
                      <span className="text-[9px] text-violet-300/60 mb-0.5">이전 ({formatDate(item.previous.date)})</span>
                      <span className="text-[11px] font-medium text-violet-200/80">
                        {item.previous.value}{item.format === "percent" ? "%" : ""}
                      </span>
                    </div>
                    {/* Latest */}
                    <div className="flex flex-col p-1.5 rounded bg-black/30 border border-violet-500/20">
                      <span className="text-[9px] text-violet-300 mb-0.5 font-medium">최신 ({formatDate(item.latest.date)})</span>
                      <span className="text-[12px] font-bold text-violet-100">
                        {item.latest.value}{item.format === "percent" ? "%" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar-violet::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-violet::-webkit-scrollbar-track {
          background: rgba(139, 92, 246, 0.05); 
          border-radius: 4px;
        }
        .custom-scrollbar-violet::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3); 
          border-radius: 4px;
        }
        .custom-scrollbar-violet::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.6); 
        }
      `}</style>
    </div>
  )
}
