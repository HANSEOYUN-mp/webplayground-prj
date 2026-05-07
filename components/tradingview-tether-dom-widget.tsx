"use client"

import { useEffect, useRef } from "react"
import { DollarSign } from "lucide-react"

export function TradingViewTetherDomWidget() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "CRYPTOCAP:USDT.D",
      interval: "D",
      timezone: "Asia/Seoul",
      theme: "dark",
      style: "3", // 3: Area (도미넌스는 주로 영역이나 선 차트로 봄)
      locale: "kr",
      enable_publishing: false,
      backgroundColor: "rgba(15, 23, 42, 0.4)", 
      gridColor: "rgba(255, 255, 255, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: "tradingview_usdt_dom",
      studies: ["RSI@tv-basicstudies"],
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ""
    }
  }, [])

  return (
    <div className="w-full flex flex-col h-[440px] bg-indigo-950/40 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-colors duration-300 hover:bg-indigo-900/50 hover:border-indigo-500/60">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-400" />
          <div className="flex flex-col">
            <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">TETHER DOMINANCE</h2>
            <span className="text-[10px] text-indigo-400/80 mt-1">USDT 도미넌스 (시장 대기 자금)</span>
          </div>
        </div>
        <a
          href="https://kr.tradingview.com/chart/?symbol=CRYPTOCAP%3AUSDT.D"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-indigo-500 hover:text-indigo-300 transition-colors font-medium"
        >
          TradingView ↗
        </a>
      </div>

      <div className="flex-1 tradingview-widget-container relative overflow-hidden rounded-lg">
        <div ref={containerRef} className="tradingview-widget-container__widget w-full h-full" />
      </div>
    </div>
  )
}
