"use client"

import { useEffect, useRef } from "react"
import { BarChart2 } from "lucide-react"

export function TradingViewCryptoWidget() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true

    // TradingView 무료 위젯(Advanced Chart)은 코드 레벨에서(JSON 설정으로) 
    // 다중 심볼 오버레이(Compare) 및 개별 축(Axis) 설정을 지원하지 않습니다.
    // 따라서 기본 메인 차트(BTCUSDT)를 설정하고 제공합니다.
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:BTCUSDT",
      interval: "D",
      timezone: "Asia/Seoul",
      theme: "dark",
      style: "1", // 1: 캔들
      locale: "kr",
      enable_publishing: false,
      backgroundColor: "rgba(15, 23, 42, 0.4)", // 슬롯 배경과 어울리게 설정
      gridColor: "rgba(255, 255, 255, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: "tradingview_crypto",
      studies: ["RSI@tv-basicstudies"],
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ""
    }
  }, [])

  return (
    <div className="w-full flex flex-col h-[440px] bg-slate-950/40 backdrop-blur-xl border border-slate-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(100,116,139,0.15)] transition-colors duration-300 hover:bg-slate-900/50 hover:border-slate-500/60">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-slate-400" />
          <div className="flex flex-col">
            <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">BTC PRICE</h2>
            <span className="text-[10px] text-slate-400/80 mt-1">Binance BTCUSDT · 일봉</span>
          </div>
        </div>
        <a
          href="https://kr.tradingview.com/chart/?symbol=BINANCE%3ABTCUSDT"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors font-medium"
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
