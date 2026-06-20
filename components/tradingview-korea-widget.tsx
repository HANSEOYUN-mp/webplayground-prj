"use client"

import { useEffect, useRef } from "react"
import { TrendingUp } from "lucide-react"

export function TradingViewKoreaWidget() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
    script.async = true

    script.innerHTML = JSON.stringify({
      symbols: [
        [
          "코스피 (KOSPI)",
          "KRX:KOSPI|1D"
        ],
        [
          "코스닥 (KOSDAQ)",
          "KRX:KOSDAQ|1D"
        ],
        [
          "삼성전자 (Samsung)",
          "KRX:005930|1D"
        ],
        [
          "SK하이닉스 (SK Hynix)",
          "KRX:000660|1D"
        ]
      ],
      chartOnly: false,
      width: "100%",
      height: "100%",
      locale: "ko",
      colorTheme: "light",
      gridLineColor: "rgba(240, 243, 250, 0)",
      fontColor: "#787b86",
      isTransparent: false,
      showFloatingTooltip: true,
      scalePosition: "no",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineColor: "#2962ff",
      bottomColor: "rgba(41, 98, 255, 0)",
      topColor: "rgba(41, 98, 255, 0.3)",
      containerId: "tradingview_korea_overview"
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
            <TrendingUp className="w-3.5 h-3.5" /> 국내 시장 요약 (KOSPI / KOSDAQ)
          </span>
        </div>
        <a
          href="https://kr.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-muted-foreground hover:text-foreground transition-colors font-medium font-sans"
        >
          TradingView ↗
        </a>
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
