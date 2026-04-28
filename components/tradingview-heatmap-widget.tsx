"use client"

import { useEffect, useRef } from "react"
import { LayoutGrid } from "lucide-react"

export function TradingViewHeatmapWidget() {
  const containerRef = useRef<HTMLDivElement>(null)

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
      colorTheme: "dark",
      hasTopBar: false,
      isDataSetEnabled: false,
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
    <div className="w-full h-[360px] bg-slate-900/60 backdrop-blur-xl border border-slate-600/40 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(148,163,184,0.1)] transition-colors duration-300 hover:border-slate-500/60 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-600/30 shrink-0 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-slate-300" />
          <div className="flex flex-col">
            <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">STOCK HEATMAP</h2>
            <span className="text-[10px] text-slate-400/80 mt-1">S&P 500 · 시가총액 크기 · 등락률 색상</span>
          </div>
        </div>
        <a
          href="https://www.tradingview.com/heatmap/stock/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors font-medium"
        >
          TradingView ↗
        </a>
      </div>

      {/* TradingView Widget Container */}
      <div className="flex-1 tradingview-widget-container relative overflow-hidden">
        <div
          ref={containerRef}
          className="tradingview-widget-container__widget w-full h-full"
        />
      </div>
    </div>
  )
}
