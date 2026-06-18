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
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "FRED 데이터를 불러오지 못했습니다."
        )
      }
      if (json.error) throw new Error(String(json.error))
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
    <div className="w-full flex flex-col h-[360px] bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50">
      {/* IDE Window Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
          <LineChart className="w-3.5 h-3.5" /> 거시 경제 지표
        </span>
        <button onClick={fetchFred} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-violet relative">
        {loading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-6 h-6 text-primary mb-2" />
            <span className="text-[11px] text-primary">{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[11px] font-mono">데이터가 없습니다.</div>
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

              const colorClass = isUp ? "text-red-700 bg-red-50 border-red-200" : isDown ? "text-blue-700 bg-blue-50 border-blue-200" : "text-foreground bg-secondary/55 border-border/10";

              return (
                <div key={item.id} className="flex flex-col gap-1.5 p-2.5 bg-secondary/20 hover:bg-secondary/60 rounded-sm transition-colors shrink-0 border border-border/10">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground text-[12px] font-sans">{item.title}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border font-mono ${colorClass}`}>
                      {isUp ? "▲" : isDown ? "▼" : "-"} {changeText}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-1 select-none font-mono">
                    {/* Previous */}
                    <div className="flex flex-col p-1.5 rounded-sm bg-secondary/40">
                      <span className="text-[9px] text-muted-foreground mb-0.5">이전 ({formatDate(item.previous.date)})</span>
                      <span className="text-[11px] font-medium text-foreground/80">
                        {item.previous.value}{item.format === "percent" ? "%" : ""}
                      </span>
                    </div>
                    {/* Latest */}
                    <div className="flex flex-col p-1.5 rounded-sm bg-secondary/60 border border-border/10">
                      <span className="text-[9px] text-muted-foreground mb-0.5 font-medium">최신 ({formatDate(item.latest.date)})</span>
                      <span className="text-[12px] font-bold text-foreground">
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
          background: transparent; 
          border-radius: 0px;
        }
        .custom-scrollbar-violet::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.25); 
          border-radius: 0px;
        }
        .custom-scrollbar-violet::-webkit-scrollbar-thumb:hover {
          background: rgba(17, 17, 17, 0.5); 
        }
      `}</style>
    </div>
  )
}
