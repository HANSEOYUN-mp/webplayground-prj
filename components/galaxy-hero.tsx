"use client"

import { useState, useEffect } from "react"
import { TrendingUp, BarChart3, ChevronLeft, ChevronRight, Calendar, RefreshCw, AlertCircle, Bitcoin, MessageSquareText, Flame } from "lucide-react"
import { MinskyWidget } from "@/components/minsky-widget"

interface StockRow {
  rank: number
  itmsNm: string
  clpr: string
  fltRt: string
  mrktTotAmt: string
  trPrc: string
}

interface PolymarketRow {
  id: string
  slug: string
  title: string
  description?: string
  image?: string
  volume: number
  markets: Array<{ id: string, title: string, yesPrice: number | null }>
}

interface PolymarketFinanceRow {
  id: string
  slug: string
  title: string
  volume: number
  endDate: string | null
  yesPrice: number | null
}

interface WhaleTrade {
  code: string
  price: number
  volume: number
  amount: number
  ask_bid: "ASK" | "BID"
  timestamp: number
}

interface TrendItem {
  title: string
  traffic: string
}

function formatAmount(amt: number) {
  const eok = Math.floor(amt / 100000000);
  const man = Math.floor((amt % 100000000) / 10000);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`;
  if (eok > 0) return `${eok}억`;
  return `${man.toLocaleString()}만`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
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


function EmptySlot({ index, title = `EMPTY SLOT ${index}`, subtitle = 'To be filled with a chart or data' }: { index: number, title?: string, subtitle?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center h-[320px] bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 border-dashed rounded-2xl p-5 shadow-inner transition-colors duration-300 hover:bg-slate-800/40">
      <span className="text-slate-500 font-bold tracking-widest text-sm">{title}</span>
      {subtitle && <span className="text-slate-600/70 text-xs mt-2 text-center">{subtitle}</span>}
    </div>
  )
}

const FALLBACK_STOCKS: StockRow[] = [
  { rank: 1, itmsNm: "삼성전자", clpr: "80000", fltRt: "1.2", mrktTotAmt: "460000000000000", trPrc: "1500000000000" },
  { rank: 2, itmsNm: "SK하이닉스", clpr: "180000", fltRt: "2.5", mrktTotAmt: "135000000000000", trPrc: "800000000000" },
  { rank: 3, itmsNm: "루닛", clpr: "55000", fltRt: "15.5", mrktTotAmt: "1500000000000", trPrc: "650000000000" },
  { rank: 4, itmsNm: "에코프로머티", clpr: "150000", fltRt: "5.0", mrktTotAmt: "10000000000000", trPrc: "550000000000" },
  { rank: 5, itmsNm: "오픈엣지테크놀로지", clpr: "24000", fltRt: "8.8", mrktTotAmt: "500000000000", trPrc: "450000000000" },
  { rank: 6, itmsNm: "포스코DX", clpr: "54000", fltRt: "-2.5", mrktTotAmt: "8000000000000", trPrc: "400000000000" },
  { rank: 7, itmsNm: "LG에너지솔루션", clpr: "390000", fltRt: "-0.5", mrktTotAmt: "91000000000000", trPrc: "350000000000" },
  { rank: 8, itmsNm: "제주반도체", clpr: "28000", fltRt: "11.2", mrktTotAmt: "900000000000", trPrc: "300000000000" },
  { rank: 9, itmsNm: "카카오", clpr: "58000", fltRt: "0.5", mrktTotAmt: "25000000000000", trPrc: "250000000000" },
  { rank: 10, itmsNm: "현대차", clpr: "240000", fltRt: "1.8", mrktTotAmt: "50000000000000", trPrc: "200000000000" },
  { rank: 11, itmsNm: "기아", clpr: "128000", fltRt: "-0.8", mrktTotAmt: "45000000000000", trPrc: "180000000000" },
  { rank: 12, itmsNm: "네이버", clpr: "192000", fltRt: "1.1", mrktTotAmt: "32000000000000", trPrc: "150000000000" },
  { rank: 13, itmsNm: "셀트리온", clpr: "185000", fltRt: "2.3", mrktTotAmt: "41000000000000", trPrc: "130000000000" },
  { rank: 14, itmsNm: "포스코홀딩스", clpr: "360000", fltRt: "-1.5", mrktTotAmt: "29000000000000", trPrc: "120000000000" },
  { rank: 15, itmsNm: "LG화학", clpr: "375000", fltRt: "0.2", mrktTotAmt: "26000000000000", trPrc: "110000000000" },
]

export function GalaxyHero({ activeTab }: { activeTab: "stock" | "crypto" | "prediction" | "news" }) {
  const [stocks, setStocks] = useState<StockRow[]>([])
  const [polys, setPolys] = useState<PolymarketRow[]>([])
  const [fedPolys, setFedPolys] = useState<PolymarketFinanceRow[]>([])
  const [polyIndex, setPolyIndex] = useState(0)
  const [whales, setWhales] = useState<WhaleTrade[]>([])
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [usTrends, setUsTrends] = useState<TrendItem[]>([])
  const [trendsTab, setTrendsTab] = useState<"kr" | "us">("kr")
  const [stockDate, setStockDate] = useState<string>("로딩중...")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [stockRes, polyRes, financeRes, trendsRes, usTrendsRes] = await Promise.all([
        fetch("/api/stocks/top"),
        fetch("/api/polymarket/top"),
        fetch("/api/polymarket/finance"),
        fetch("/api/trends/top"),
        fetch("/api/trends/us"),
      ])
      
      const stockJson = await stockRes.json()
      const polyJson = await polyRes.json()
      const financeJson = financeRes.ok ? await financeRes.json() : { items: [] }
      const trendsJson = await trendsRes.json()
      const usTrendsJson = await usTrendsRes.json()

      if (!stockRes.ok || !polyRes.ok || !trendsRes.ok) throw new Error("데이터 조회 실패")

      let fetchedStocks = stockJson.items?.slice(0, 15) || []
      if (fetchedStocks.length === 0) {
        fetchedStocks = FALLBACK_STOCKS
        setStockDate("현재(Fallback)")
      } else {
        const bd = stockJson.basDt
        if (bd && bd !== "N/A" && bd.length === 8) {
          setStockDate(`${bd.slice(0,4)}.${bd.slice(4,6)}.${bd.slice(6,8)}`)
        } else {
          setStockDate("최신영업일")
        }
      }
      setStocks(fetchedStocks)
      setPolys(polyJson.items?.slice(0, 10) || [])
      setFedPolys(financeJson.items?.slice(0, 10) || [])
      setTrends(trendsJson.items || [])
      setUsTrends(usTrendsJson.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류")
    } finally {
      setLoading(false)
    }
  }

  const fetchWhales = async () => {
    try {
      const res = await fetch("/api/whales/today")
      const json = await res.json()
      if (res.ok) {
        setWhales(json.items || [])
      }
    } catch (e) {
      console.error("고래 데이터 갱신 실패:", e)
    }
  }

  useEffect(() => {
    fetchData()
    fetchWhales() // 초기 고래 데이터 호출

    // 10초마다 고래 데이터만 실시간 갱신(Polling)
    const intervalId = setInterval(fetchWhales, 10000)

    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="relative w-full min-h-[600px] mt-2 mb-8">
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

      {/* 2x3 패널 슬롯 배치 */}
      {!loading && !error && (
        <div className="w-full max-w-7xl mx-auto z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {activeTab === 'stock' && (
            <>
              {/* 1. 주식 데이터 */}
            <div className="w-full flex flex-col h-[320px] bg-cyan-950/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,255,255,0.15)] transition-colors duration-300 hover:bg-cyan-900/50 hover:border-cyan-500/60">
               <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/30 shrink-0">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-base font-black text-white tracking-widest">KOREA STOCKS</h2>
                  </div>
                  {stockDate && (
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-900/50 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      기준일: {stockDate}
                    </span>
                  )}
               </div>
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-cyan">
                  <div className="flex flex-col gap-2">
                    {stocks.map((stock, i) => (
                      <div key={i} className="flex flex-col gap-1.5 bg-cyan-900/10 hover:bg-cyan-900/20 p-2.5 rounded shrink-0 transition-colors">
                        <div className="flex justify-between items-center w-full">
                          {/* 종목명 */}
                          <span className="font-bold text-cyan-50 text-[13px] truncate max-w-[130px]" title={stock.itmsNm}>{stock.rank}. {stock.itmsNm}</span>
                          
                          {/* 가격 & 등락률 */}
                          <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-bold tracking-tighter ${Number(stock.fltRt) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {Number(stock.fltRt) > 0 ? "+" : ""}{stock.fltRt}%
                            </span>
                            <span className="font-extrabold text-cyan-50 text-[13px] text-right w-[75px]">{Number(stock.clpr).toLocaleString()}원</span>
                          </div>
                        </div>
                        {/* 하단 보조 지표 */}
                        <div className="text-[10px] text-cyan-200/60 font-medium tracking-wide">
                          거래대금: {formatAmount(Number(stock.trPrc))}원
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            
              <div className="w-full flex flex-col h-[320px]">
                <MinskyWidget />
              </div>
              <EmptySlot index={3} />
              <EmptySlot index={4} />
              <EmptySlot index={5} />
              <EmptySlot index={6} />
            </>
          )}
          {activeTab === 'crypto' && (
            <>
              {/* 3. Crypto Whales */}
            <div className="w-full flex flex-col h-[320px] bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-colors duration-300 hover:bg-emerald-900/50 hover:border-emerald-500/60">
               <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-500/30 shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <div className="flex flex-col">
                    <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">CRYPTO WHALES</h2>
                    <span className="text-[10px] text-emerald-400/80 mt-1">Live: 1억 이상 체결 알림</span>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-emerald">
                  <div className="flex flex-col gap-2">
                    {whales.length === 0 ? (
                       <div className="flex flex-col items-center justify-center p-4 h-full">
                         <div className="w-6 h-6 border-2 border-emerald-500/50 border-t-emerald-300 rounded-full animate-spin mb-3"></div>
                         <span className="text-emerald-200/50 text-[11px] text-center">고래 움직임 대기중... <br/>(BTC, ETH, XRP, SOL, DOGE)</span>
                       </div>
                    ) : whales.map((whale, i) => (
                      <div key={i} className="flex flex-col gap-1 shrink-0 p-2 bg-emerald-900/10 rounded">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-50 flex items-center gap-1.5">
                            {whale.code}
                            <span className="text-[10px] font-normal text-emerald-200/50">{formatTime(whale.timestamp)}</span>
                          </span>
                          <span className={`font-bold tracking-tight ${whale.ask_bid === "BID" ? "text-red-400" : "text-blue-400"}`}>
                            {whale.ask_bid === "BID" ? "매수" : "매도"} {formatAmount(whale.amount)}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-100/60 font-medium">
                          단가: {whale.price.toLocaleString()}원
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            
              <EmptySlot index={2} />
              <EmptySlot index={3} />
              <EmptySlot index={4} />
              <EmptySlot index={5} />
              <EmptySlot index={6} />
            </>
          )}
          {activeTab === 'prediction' && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Slot 1: Featured Carousel */}
              <div className="w-full flex flex-col h-[360px] bg-fuchsia-950/40 backdrop-blur-xl border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(255,0,255,0.15)] relative overflow-hidden group">
                 <div className="flex items-center gap-2 mb-3 pb-2 border-b border-fuchsia-500/30 shrink-0 z-10 relative">
                    <BarChart3 className="w-5 h-5 text-fuchsia-400" />
                    <div className="flex flex-col">
                      <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">HOT ISSUES</h2>
                      <span className="text-[10px] text-fuchsia-400/80 mt-1">폴리마켓 주요 트렌딩 토픽</span>
                    </div>
                 </div>
                 
                 {polys.length > 0 ? (
                   <div className="flex-1 flex flex-col justify-between relative z-10">
                     <div className="flex items-start gap-4 h-full">
                       {polys[polyIndex]?.image && (
                         <img src={polys[polyIndex].image} className="w-16 h-16 rounded-xl object-cover border border-fuchsia-500/30 hidden sm:block" alt="event" />
                       )}
                       <div className="flex-1 min-w-0">
                         <a href={`https://polymarket.com/event/${polys[polyIndex]?.slug}`} target="_blank" rel="noopener noreferrer" className="block mb-3 hover:opacity-80">
                           <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">{polys[polyIndex]?.title}</h3>
                         </a>
                         
                         <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
                           {polys[polyIndex]?.markets?.map((m, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-fuchsia-900/20 px-3 py-1.5 rounded-lg border border-fuchsia-800/50">
                               <span className="text-xs text-fuchsia-100 font-medium truncate pr-2">{m.title}</span>
                               <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/80 px-2 py-0.5 rounded shadow-inner whitespace-nowrap">
                                 {m.yesPrice !== null ? `YES ${(m.yesPrice * 100).toFixed(0)}%` : '-'}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center mt-3 pt-3 border-t border-fuchsia-500/20">
                       <span className="text-xs font-medium text-fuchsia-200/60">Vol: {formatMarketCap(polys[polyIndex]?.volume?.toString() || '0')}</span>
                       <div className="flex gap-1.5">
                         {polys.map((_, idx) => (
                           <div key={idx} onClick={() => setPolyIndex(idx)} className={`w-2 h-2 rounded-full cursor-pointer transition-all ${idx === polyIndex ? 'bg-fuchsia-400 w-4' : 'bg-fuchsia-900/50 hover:bg-fuchsia-400/50'}`} />
                         ))}
                       </div>
                     </div>
                     
                     {/* Arrows */}
                     <button onClick={() => setPolyIndex(i => (i === 0 ? polys.length - 1 : i - 1))} className="absolute top-1/2 -left-3 -translate-y-1/2 p-1 bg-fuchsia-950/80 rounded-full text-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity border border-fuchsia-500/30">
                       <ChevronLeft className="w-5 h-5" />
                     </button>
                     <button onClick={() => setPolyIndex(i => (i === polys.length - 1 ? 0 : i + 1))} className="absolute top-1/2 -right-3 -translate-y-1/2 p-1 bg-fuchsia-950/80 rounded-full text-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity border border-fuchsia-500/30">
                       <ChevronRight className="w-5 h-5" />
                     </button>
                   </div>
                 ) : (
                   <div className="flex-1 flex items-center justify-center text-xs text-fuchsia-300/50">데이터를 불러오는 중...</div>
                 )}
              </div>

              {/* Slot 2: Fed & Finance */}
              <div className="w-full flex flex-col h-[360px] bg-amber-950/40 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-colors duration-300 hover:bg-amber-900/50 hover:border-amber-500/60">
                 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-500/30 shrink-0">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <div className="flex flex-col">
                      <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">FED & FINANCE</h2>
                      <span className="text-[10px] text-amber-400/80 mt-1">경제 지표 및 연준 금리 예측</span>
                    </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-amber">
                   <div className="flex flex-col gap-2.5">
                     {fedPolys.length > 0 ? fedPolys.map((poly, i) => (
                       <a 
                         key={i} 
                         href={`https://polymarket.com/event/${poly.slug}`} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="flex flex-col gap-1 shrink-0 group cursor-pointer bg-amber-900/10 hover:bg-amber-900/20 px-3 py-2.5 rounded-lg transition-colors border border-amber-900/30"
                       >
                         <h3 className="text-[12px] font-bold text-amber-50 line-clamp-2 leading-tight group-hover:text-amber-300 transition-colors">
                           {poly.title}
                         </h3>
                         <div className="flex items-center justify-between mt-1">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-amber-900 bg-amber-400 px-1.5 py-0.5 rounded flex-shrink-0">
                               {poly.endDate ? new Date(poly.endDate).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : 'N/A'}
                             </span>
                             <span className="text-[10px] text-amber-200/50 hidden sm:inline">Vol: {formatMarketCap(poly.volume?.toString() || '0')}</span>
                           </div>
                           <span className="font-extrabold text-[11px] text-amber-300 bg-amber-950/80 shadow-inner px-2 py-0.5 rounded">
                             YES {poly.yesPrice !== null ? (poly.yesPrice * 100).toFixed(0) : '-'}%
                           </span>
                         </div>
                       </a>
                     )) : (
                       <div className="flex items-center justify-center h-full text-amber-200/50 text-[11px] text-center p-4">데이터 로딩 중...</div>
                     )}
                   </div>
                 </div>
              </div>

              {/* Fill remaining slots if 2x3 is maintained globally, but prediction is isolated here */}
              {/* Wait, the container grid is already defined outside! 
                  The prediction block itself only renders its own fragments.
                  I should render the remaining empty slots to match the global layout.
                  Wait, lg:col-span-3 spans the entire row. But we can just use EmptySlot for the rest.
              */}
              <div className="hidden lg:block lg:col-span-1">
                <EmptySlot index={3} />
              </div>
              <EmptySlot index={4} />
              <EmptySlot index={5} />
              <EmptySlot index={6} />
            </div>
          )}
          {activeTab === 'news' && (
            <>
              {/* 4. Google Trends */}
            <div className="w-full flex flex-col h-[320px] bg-rose-950/40 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(244,63,94,0.15)] transition-colors duration-300 hover:bg-rose-900/50 hover:border-rose-500/60">
               {/* 헤더 + 탭 */}
               <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-500/30 shrink-0">
                 <div className="flex items-center gap-2">
                   <Flame className="w-5 h-5 text-rose-400" />
                   <h2 className="text-base font-black text-white tracking-widest">GOOGLE TRENDS</h2>
                 </div>
                 <div className="flex items-center gap-0.5 bg-rose-950/60 rounded-lg p-0.5">
                   <button
                     onClick={() => setTrendsTab("kr")}
                     className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                       trendsTab === "kr"
                         ? "bg-rose-500 text-white shadow"
                         : "text-rose-300/70 hover:text-rose-200"
                     }`}
                   >
                     🇰🇷 한국
                   </button>
                   <button
                     onClick={() => setTrendsTab("us")}
                     className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                       trendsTab === "us"
                         ? "bg-rose-500 text-white shadow"
                         : "text-rose-300/70 hover:text-rose-200"
                     }`}
                   >
                     🇺🇸 미국
                   </button>
                 </div>
               </div>

               {/* 탭 공통 렌더 함수 */}
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-rose">
                 {(trendsTab === "kr" ? trends : usTrends).length === 0 ? (
                   <div className="flex items-center justify-center h-full text-rose-200/50 text-[11px] text-center p-4">트렌드 로딩 중...</div>
                 ) : (
                   <div className="flex flex-col gap-1.5">
                     {(trendsTab === "kr" ? trends : usTrends).map((trend, i) => (
                       <a
                         key={i}
                         href={`https://www.google.com/search?q=${encodeURIComponent(trend.title)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex justify-between items-center bg-rose-900/10 hover:bg-rose-900/20 px-2.5 py-2 rounded transition-colors overflow-hidden cursor-pointer shrink-0"
                       >
                         <span className="font-bold text-rose-50 text-[11px] line-clamp-1 truncate max-w-[120px] lg:max-w-[160px]" title={trend.title}>
                           <span className="text-rose-400 mr-1 opacity-80">{i+1}.</span>
                           {trend.title}
                         </span>
                         <span className="text-[9px] font-bold text-rose-300/90 bg-rose-950/60 shadow-inner px-1.5 py-0.5 rounded whitespace-nowrap ml-1 flex-shrink-0">
                           {trend.traffic}
                         </span>
                       </a>
                     ))}
                   </div>
                 )}
               </div>
            </div>

              <EmptySlot index={2} />
              <EmptySlot index={3} />
              <EmptySlot index={4} />
              <EmptySlot index={5} />
              <EmptySlot index={6} />
            </>
          )}
        </div>
      )}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 0, 255, 0.05); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 0, 255, 0.3); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 0, 255, 0.6); 
        }

        .custom-scrollbar-emerald::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-emerald::-webkit-scrollbar-track {
          background: rgba(16, 185, 129, 0.05); 
          border-radius: 4px;
        }
        .custom-scrollbar-emerald::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3); 
          border-radius: 4px;
        }
        .custom-scrollbar-emerald::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.6); 
        }

        .custom-scrollbar-cyan::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-cyan::-webkit-scrollbar-track {
          background: rgba(6, 182, 212, 0.05); 
          border-radius: 4px;
        }
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3); 
          border-radius: 4px;
        }
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.6); 
        }

        .custom-scrollbar-rose::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-rose::-webkit-scrollbar-track {
          background: rgba(244, 63, 94, 0.05); 
          border-radius: 4px;
        }
        .custom-scrollbar-rose::-webkit-scrollbar-thumb {
          background: rgba(244, 63, 94, 0.3); 
          border-radius: 4px;
        }
        .custom-scrollbar-rose::-webkit-scrollbar-thumb:hover {
          background: rgba(244, 63, 94, 0.6); 
        }
        .custom-scrollbar-amber::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-amber::-webkit-scrollbar-track { background: rgba(245, 158, 11, 0.05); border-radius: 4px; }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.3); border-radius: 4px; }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.6); }
      `}</style>
    </div>
  )
}
