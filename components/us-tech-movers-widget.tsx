"use client"

import { useState, useEffect } from "react"
import { BarChart3, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"

interface MoverItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

interface MoversData {
  gainers: MoverItem[];
  losers: MoverItem[];
}

interface ApiResponse {
  premarket: MoversData;
  regular: MoversData;
  postmarket: MoversData;
}

interface UsTechMoversWidgetProps {
  isDetailed?: boolean;
  onEnterDetail?: () => void;
}

export function UsTechMoversWidget({ isDetailed = false, onEnterDetail }: UsTechMoversWidgetProps) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [activeTab, setActiveTab] = useState<"premarket" | "regular" | "postmarket">("regular")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMovers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/movers")
      if (!res.ok) throw new Error("급등락 데이터를 불러오는데 실패했습니다.")
      const json = await res.json()
      setData(json)
      
      // Auto-detect tab based on current NY time if possible
      // But default to regular or premarket
      const hour = new Date().getUTCHours() // UTC hour
      if (hour >= 8 && hour < 13) {
        setActiveTab("premarket")
      } else if (hour >= 20 || hour < 1) {
        setActiveTab("postmarket")
      } else {
        setActiveTab("regular")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovers()
  }, [])

  const currentData = data ? data[activeTab] : null

  return (
    <div className={`w-full flex flex-col bg-card border border-border rounded-none overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 relative ${isDetailed ? 'h-auto pb-4' : 'h-[360px]'}`}>
      {/* Widget Header */}
      <div 
        onClick={!isDetailed ? onEnterDetail : undefined}
        className={`flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0 ${!isDetailed && onEnterDetail ? 'cursor-pointer hover:bg-secondary transition-colors group' : ''}`}
      >
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 select-none">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /> US Tech Movers
          {!isDetailed && onEnterDetail && (
            <span className="text-[9.5px] text-primary/75 dark:text-primary-foreground/75 font-normal ml-1.5 group-hover:underline flex items-center gap-0.5">
              (상세보기)
            </span>
          )}
          {isDetailed && (
            <span className="text-[9.5px] text-muted-foreground/80 font-normal ml-1.5 select-none">
              (실시간 시세 분석 - Top 20)
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {/* Market Status Tabs */}
          <div className="flex items-center gap-1 bg-background/50 border border-border p-0.5 rounded-none select-none">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab("premarket"); }}
              className={`px-1.5 py-0.5 text-[8.5px] font-bold transition-all rounded-none ${
                activeTab === "premarket"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PRE
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab("regular"); }}
              className={`px-1.5 py-0.5 text-[8.5px] font-bold transition-all rounded-none ${
                activeTab === "regular"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              REG
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab("postmarket"); }}
              className={`px-1.5 py-0.5 text-[8.5px] font-bold transition-all rounded-none ${
                activeTab === "postmarket"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              POST
            </button>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); fetchMovers(); }} 
            disabled={loading}
            className="p-1 hover:bg-secondary rounded-sm transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Widget Body */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5 min-h-[250px]">
          <div className="w-5 h-5 border-2 border-primary/45 border-t-primary rounded-full animate-spin mb-3"></div>
          <span className="text-muted-foreground text-[10px] font-mono">시세 분석 중...</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center min-h-[250px]">
          <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
          <span className="text-[11px] text-muted-foreground font-medium mb-3">{error}</span>
          <button 
            onClick={fetchMovers} 
            className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : !currentData ? (
        <div className="flex-1 flex items-center justify-center p-5 text-muted-foreground text-[11px] font-mono min-h-[250px]">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <div className={`flex-1 p-3.5 ${isDetailed ? "flex flex-col md:flex-row gap-6 h-auto" : "flex flex-col gap-2 overflow-y-auto custom-scrollbar-movers"}`}>
          {/* Top Gainers */}
          <div className="flex-1 flex flex-col">
            <span className="text-[10px] font-bold text-emerald-600 tracking-wider flex items-center gap-1 mb-1.5 border-b border-emerald-500/20 pb-1 select-none uppercase">
              <TrendingUp className="w-3.5 h-3.5" /> Top Gainers
            </span>
            <div className="flex flex-col gap-1">
              {currentData.gainers.slice(0, isDetailed ? 20 : 5).map((stock, i) => (
                <div key={stock.symbol} className="flex items-center justify-between py-1.5 px-2 hover:bg-secondary/35 transition-colors border-b border-border/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-muted-foreground font-mono font-bold select-none">{i + 1}.</span>
                    <span className="text-[11.5px] font-extrabold text-foreground font-sans">{stock.symbol}</span>
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline max-w-[150px]">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-right shrink-0">
                    <span className="text-[11.5px] font-bold text-emerald-600">
                      +{stock.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      ${stock.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div className={`flex-1 flex flex-col ${!isDetailed ? "mt-1.5" : ""}`}>
            <span className="text-[10px] font-bold text-rose-600 tracking-wider flex items-center gap-1 mb-1.5 border-b border-rose-500/20 pb-1 select-none uppercase">
              <TrendingDown className="w-3.5 h-3.5" /> Top Losers
            </span>
            <div className="flex flex-col gap-1">
              {currentData.losers.slice(0, isDetailed ? 20 : 5).map((stock, i) => (
                <div key={stock.symbol} className="flex items-center justify-between py-1.5 px-2 hover:bg-secondary/35 transition-colors border-b border-border/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-muted-foreground font-mono font-bold select-none">{i + 1}.</span>
                    <span className="text-[11.5px] font-extrabold text-foreground font-sans">{stock.symbol}</span>
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline max-w-[150px]">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-right shrink-0">
                    <span className="text-[11.5px] font-bold text-rose-600">
                      {stock.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      ${stock.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Internal Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-movers::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-movers::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-movers::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.2);
          border-radius: 0px;
        }
        .custom-scrollbar-movers:hover::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.45);
        }
      `}} />
    </div>
  )
}
