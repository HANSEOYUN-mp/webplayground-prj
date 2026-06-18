"use client"

import { useEffect, useRef, useState } from "react"
import { LayoutGrid } from "lucide-react"

interface MarketStatus {
  isOpen: boolean
  dateStr: string
  timeStr: string
  weekday: string
}

export function TradingViewHeatmapWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)

  useEffect(() => {
    // 미국 시장 상태 및 시간 계산
    const updateMarketStatus = () => {
      try {
        const nyFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: false,
          weekday: "short"
        })
        
        const parts = nyFormatter.formatToParts(new Date())
        const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]))
        
        const weekday = partMap.weekday
        const hour = parseInt(partMap.hour, 10)
        const minute = parseInt(partMap.minute, 10)
        
        // 주말 여부
        const isWeekend = weekday === "Sat" || weekday === "Sun"
        
        // 정규 거래 시간: 09:30 ~ 16:00
        const timeInHours = hour + minute / 60
        const isOpenHours = timeInHours >= 9.5 && timeInHours < 16.0
        
        const isOpen = !isWeekend && isOpenHours
        
        const monthStr = partMap.month.padStart(2, "0")
        const dayStr = partMap.day.padStart(2, "0")
        const nyDateStr = `${partMap.year}.${monthStr}.${dayStr}`
        
        setMarketStatus({
          isOpen,
          dateStr: nyDateStr,
          timeStr: `${partMap.hour.padStart(2, "0")}:${partMap.minute.padStart(2, "0")}`,
          weekday
        })
      } catch (e) {
        console.error("Failed to compute US market status", e)
      }
    }

    updateMarketStatus()
    const timer = setInterval(updateMarketStatus, 60000) // 1분마다 갱신

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 기존 스크립트 제거
    container.innerHTML = ""

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js"
    script.async = true

    // TradingView 위젯 설정 (JSON은 script 태그 내부 텍스트로 삽입)
    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: "SPX500",
      grouping: "sector",
      blockSize: "market_cap_basic",
      blockColor: "change",
      locale: "en",
      symbolUrl: "",
      colorTheme: "light",
      hasTopBar: true,
      isDataSetEnabled: true,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "100%",
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ""
    }
  }, [])

  return (
    <div className="w-full h-[520px] bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 flex flex-col">
      {/* IDE Window Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
            <LayoutGrid className="w-3.5 h-3.5" /> S&P 500 맵
          </span>
        </div>
        
        {/* 미국 시장 상태 및 영업 상태 표시 */}
        <div className="flex items-center gap-3">
          {marketStatus && (
            <div className="flex items-center gap-1.5 bg-secondary px-2.5 py-0.5 border border-border/10 text-[9px] font-bold">
              <span className={`w-1.5 h-1.5 rounded-full ${marketStatus.isOpen ? "bg-red-700 animate-pulse" : "bg-blue-700"}`} />
              <span className="text-foreground/85 tracking-wider font-mono">
                NY {marketStatus.dateStr} ({marketStatus.weekday}) {marketStatus.timeStr}
              </span>
              <span className={marketStatus.isOpen ? "text-red-700 font-bold" : "text-blue-700 font-bold"}>
                {marketStatus.isOpen ? "개장" : "마감"}
              </span>
            </div>
          )}
          <a
            href="https://www.tradingview.com/heatmap/stock/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors font-medium font-sans"
          >
            TradingView ↗
          </a>
        </div>
      </div>

      {/* TradingView Widget Container */}
      <div className="flex-1 tradingview-widget-container relative overflow-hidden bg-white">
        <div
          ref={containerRef}
          className="tradingview-widget-container__widget w-full h-full"
        />
      </div>
    </div>
  )
}
