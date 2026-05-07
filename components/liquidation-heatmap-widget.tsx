"use client"

import { Flame, AlertTriangle } from "lucide-react"

export function LiquidationHeatmapWidget() {
  return (
    <div className="w-full flex flex-col h-[360px] bg-orange-950/40 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-colors duration-300 hover:bg-orange-900/50 hover:border-orange-500/60 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <div className="flex flex-col">
            <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">LIQUIDATION HEATMAP</h2>
            <span className="text-[10px] text-orange-400/80 mt-1">바이낸스 청산 히트맵</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-orange-900/20 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
          <AlertTriangle className="w-8 h-8 text-orange-400" />
        </div>
        <h3 className="text-sm font-bold text-orange-50 mb-2">무료 임베드 위젯 지원 안됨</h3>
        <p className="text-xs text-orange-200/70 leading-relaxed max-w-[250px]">
          바이낸스 거래소 자체에서는 청산 히트맵을 그려주는 무료 위젯이나 직접적인 API 엔드포인트를 제공하지 않습니다.
        </p>
        <p className="text-[10px] text-orange-300/50 mt-4 leading-relaxed max-w-[250px] bg-orange-950/50 p-2 rounded-lg border border-orange-500/20">
          * Coinglass 등의 사이트는 바이낸스 오더북 데이터를 직접 수집해 커스텀 렌더링한 것입니다. 
          이 슬롯을 채우려면 오픈 API 데이터 수집 및 차트(ECharts 등) 직접 구현이 필요합니다.
        </p>
      </div>
      
      {/* 장식용 그래픽 요소 (히트맵 느낌) */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-orange-500/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl pointer-events-none" />
    </div>
  )
}
