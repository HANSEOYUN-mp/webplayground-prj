"use client"

import { useState, useEffect } from "react"
import { TrendingUp, BarChart3, RefreshCw, AlertCircle, Bitcoin, MessageSquareText } from "lucide-react"

interface StockRow {
  rank: number
  itmsNm: string
  clpr: string
  fltRt: string
  mrktTotAmt: string
}

interface PolymarketRow {
  rank: number
  id: string
  title: string
  volume: number
  yesPrice: number | null
}

function formatMarketCap(s: string): string {
  const n = Number(s)
  if (Number.isNaN(n) || n === 0) return "-"
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}조`
  if (n >= 1e8) return `${(n / 1e8).toFixed(0)}억`
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`
  return n.toLocaleString()
}

function formatVolume(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${Math.round(v)}`
}

const FALLBACK_STOCKS: StockRow[] = [
  { rank: 1, itmsNm: "삼성전자", clpr: "80000", fltRt: "1.2", mrktTotAmt: "460000000000000" },
  { rank: 2, itmsNm: "SK하이닉스", clpr: "180000", fltRt: "2.5", mrktTotAmt: "135000000000000" },
  { rank: 3, itmsNm: "LG에너지솔루션", clpr: "390000", fltRt: "-0.5", mrktTotAmt: "91000000000000" },
  { rank: 4, itmsNm: "삼성바이오로직스", clpr: "850000", fltRt: "0.0", mrktTotAmt: "60000000000000" },
  { rank: 5, itmsNm: "현대차", clpr: "240000", fltRt: "1.8", mrktTotAmt: "50000000000000" },
]

export function GalaxyHero() {
  const [stocks, setStocks] = useState<StockRow[]>([])
  const [polys, setPolys] = useState<PolymarketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [stockRes, polyRes] = await Promise.all([
        fetch("/api/stocks/top"),
        fetch("/api/polymarket/top"),
      ])
      
      const stockJson = await stockRes.json()
      const polyJson = await polyRes.json()

      if (!stockRes.ok || !polyRes.ok) throw new Error("데이터 조회 실패")

      let fetchedStocks = stockJson.items?.slice(0, 5) || []
      if (fetchedStocks.length === 0) {
        fetchedStocks = FALLBACK_STOCKS
      }
      setStocks(fetchedStocks)
      setPolys(polyJson.items?.slice(0, 5) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="relative w-full h-[750px] md:h-[900px] mt-4 mb-24 overflow-hidden">
      {/* 로딩 / 에러 처리 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black/60 backdrop-blur-md rounded-full px-6 py-3 border border-indigo-500/30 text-indigo-200 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="font-semibold tracking-wide">데이터 초기화 중...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-950/80 backdrop-blur-md rounded-xl px-6 py-4 border border-red-500/50 text-red-200 flex items-center gap-3">
            <AlertCircle className="h-6 w-6" />
            <div className="flex flex-col">
              <span className="font-semibold text-white">오류 발생</span>
              <span className="text-sm opacity-80">{error}</span>
            </div>
            <button onClick={fetchData} className="ml-4 bg-red-800/80 hover:bg-red-700/80 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              재시도
            </button>
          </div>
        </div>
      )}

      {/* 불규칙하게 흩뿌려진 4개의 앱솔루트 박스 레이아웃 (중앙 지구 보호) */}
      {!loading && !error && (
        <div className="absolute inset-0 max-w-[1400px] mx-auto z-10 pointer-events-none">
          
          {/* 상단 좌측: 주식 데이터 (위로 바짝 올리고 약간 안쪽으로) */}
          <div 
            className="absolute top-[3%] left-[2%] md:top-[8%] md:left-[5%] w-full md:w-[320px] lg:w-[340px] bg-cyan-950/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,255,255,0.15)] transition-colors duration-300 pointer-events-auto hover:bg-cyan-900/50 hover:border-cyan-500/60"
          >
             <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cyan-500/30">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white tracking-widest">STOCK MARKET</h2>
             </div>
             <div className="flex flex-col gap-3">
                {stocks.map((stock, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-cyan-50">{stock.rank}. {stock.itmsNm}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${Number(stock.fltRt) >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {stock.fltRt}%
                      </span>
                    </div>
                    <div className="text-[11px] text-cyan-200/60 font-medium">
                      시총: {formatMarketCap(stock.mrktTotAmt)}
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* 상단 우측: Polymarket (주식보다 아래로 살짝 내리고 오른쪽 끝으로) */}
          <div 
            className="absolute top-[25%] right-[2%] md:top-[22%] md:right-[4%] w-full md:w-[320px] lg:w-[340px] bg-fuchsia-950/40 backdrop-blur-xl border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(255,0,255,0.15)] transition-colors duration-300 pointer-events-auto hover:bg-fuchsia-900/50 hover:border-fuchsia-500/60"
          >
             <div className="flex items-center gap-2 mb-4 pb-3 border-b border-fuchsia-500/30">
                <BarChart3 className="w-5 h-5 text-fuchsia-400" />
                <h2 className="text-base font-black text-white tracking-widest">POLYMARKET</h2>
             </div>
             <div className="flex flex-col gap-3">
                {polys.map((poly, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-semibold text-fuchsia-50 line-clamp-1 leading-tight">
                      <span className="text-fuchsia-400 mr-1">{poly.rank}.</span>
                      {poly.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-fuchsia-200/70 font-medium">Vol: {formatVolume(poly.volume)}</span>
                      <span className="font-bold text-fuchsia-300 bg-fuchsia-900/50 px-1.5 py-0.5 rounded">
                        YES {((poly.yesPrice ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* 하단 좌측: Crypto Market (가운데에서 좌측 하단으로, 조금 높게) */}
          <div 
            className="absolute bottom-[20%] left-[2%] md:bottom-[15%] md:left-[8%] w-full md:w-[320px] lg:w-[340px] bg-amber-950/40 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(255,191,0,0.15)] transition-colors duration-300 pointer-events-auto hover:bg-amber-900/50 hover:border-amber-500/60"
          >
             <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-500/30">
                <Bitcoin className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black text-white tracking-widest">CRYPTO MARKET</h2>
             </div>
             <div className="flex flex-col gap-3">
                {[
                  {name: "Bitcoin (BTC)", price: "$93,400", change: "+2.4%"},
                  {name: "Ethereum (ETH)", price: "$3,200", change: "+1.1%"},
                  {name: "Solana (SOL)", price: "$180", change: "-0.5%"},
                  {name: "XRP", price: "$0.55", change: "+0.1%"},
                  {name: "Cardano (ADA)", price: "$0.45", change: "-1.2%"}
                ].map((coin, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="font-bold text-amber-50 text-[13px]">{coin.name}</span>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-amber-100 text-[12px]">{coin.price}</span>
                      <span className={coin.change.startsWith("+") ? "text-emerald-400 text-[10px]" : "text-rose-400 text-[10px]"}>{coin.change}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* 하단 우측: Hot Posts (가장 아랫단, 약간 안쪽 깊숙이 배치) */}
           <div 
            className="absolute bottom-[2%] right-[2%] md:bottom-[5%] md:right-[12%] w-full md:w-[320px] lg:w-[340px] bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-colors duration-300 pointer-events-auto hover:bg-emerald-900/50 hover:border-emerald-500/60"
          >
             <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-500/30">
                <MessageSquareText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-black text-white tracking-widest">HOT POSTS</h2>
             </div>
             <div className="flex flex-col gap-3">
                {[
                  {title: "머스크 AI 규제 발언 요약", author: "김인태"},
                  {title: "넥스트JS 15 서버액션 정리본", author: "한서윤"},
                  {title: "최신 비트코인 기술적 분석", author: "무지개떡"},
                  {title: "React 19 마이그레이션 후기", author: "개발자A"},
                  {title: "Awwwards 트렌드 분석 리포트", author: "디자이너K"}
                ].map((post, i) => (
                   <div key={i} className="flex flex-col gap-0.5 cursor-pointer hover:bg-emerald-900/60 px-2 py-1 -mx-2 rounded transition-colors border-l-2 border-transparent hover:border-emerald-400">
                    <span className="font-bold text-emerald-50 text-[13px] truncate">{post.title}</span>
                    <span className="text-[10px] text-emerald-300">by {post.author}</span>
                  </div>
                ))}
             </div>
          </div>

        </div>
      )}
    </div>
  )
}
