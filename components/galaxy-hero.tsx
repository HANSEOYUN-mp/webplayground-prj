"use client"

import { useState, useEffect } from "react"
import { TrendingUp, BarChart3, ChevronLeft, ChevronRight, Calendar, RefreshCw, AlertCircle, MessageSquareText, Flame } from "lucide-react"
import { MinskyWidget } from "@/components/minsky-widget"
import { FredWidget } from "@/components/fred-widget"
import { TradingViewHeatmapWidget } from "@/components/tradingview-heatmap-widget"
import { CustomHeatmapWidget } from "@/components/custom-heatmap-widget"
import { FinlifeProductsWidget } from "@/components/finlife-products-widget"

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
    <div className="w-full flex flex-col items-center justify-center h-[360px] bg-white border border-border border-dashed p-5 select-none transition-colors duration-300 hover:bg-neutral-50/50">
      <span className="text-muted-foreground font-mono font-bold tracking-widest text-xs">{title}</span>
      {subtitle && <span className="text-muted-foreground/60 font-mono text-[10px] mt-2 text-center">{subtitle}</span>}
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

export function GalaxyHero({ activeTab }: { activeTab: "stock" | "prediction" | "news" }) {
  const [stocks, setStocks] = useState<StockRow[]>([])
  const [polys, setPolys] = useState<PolymarketRow[]>([])
  const [fedPolys, setFedPolys] = useState<PolymarketFinanceRow[]>([])
  const [polyIndex, setPolyIndex] = useState(0)

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


  useEffect(() => {
    fetchData()
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
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* 미국 주식 히트맵 (슬롯 1, 2 위에 크게 배치) */}
              <div className="md:col-span-2 w-full">
                <TradingViewHeatmapWidget />
              </div>

              {/* 1. 주식 데이터 */}
            <div className="w-full flex flex-col h-[360px] bg-card border border-border overflow-hidden transition-colors hover:bg-neutral-50/50">
               <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> 국내 급등 주식
                  </span>
                  {stockDate && (
                    <span className="stamp-red text-[9px] font-bold rounded-sm border-primary/30 text-primary bg-primary/5 px-1.5 py-0.5">
                      기준일: {stockDate}
                    </span>
                  )}
               </div>
               
               <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-cyan">
                  <div className="flex flex-col gap-1.5">
                    {stocks.map((stock, i) => (
                      <div key={i} className="flex flex-col gap-1 bg-secondary/20 hover:bg-secondary/60 p-2.5 border border-border/10 shrink-0 transition-colors">
                        <div className="flex justify-between items-center w-full">
                          {/* 종목명 */}
                          <span className="font-bold text-foreground text-[13px] truncate max-w-[130px] font-sans" title={stock.itmsNm}>{stock.rank}. {stock.itmsNm}</span>
                          
                          {/* 가격 & 등락률 */}
                          <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-bold tracking-tighter font-mono ${Number(stock.fltRt) >= 0 ? "text-red-700" : "text-blue-700"}`}>
                              {Number(stock.fltRt) > 0 ? "+" : ""}{stock.fltRt}%
                            </span>
                            <span className="font-extrabold text-foreground text-[13px] text-right w-[75px] font-mono">{Number(stock.clpr).toLocaleString()}원</span>
                          </div>
                        </div>
                        {/* 하단 보조 지표 */}
                        <div className="text-[10px] text-muted-foreground font-medium tracking-wide">
                          거래대금: {formatAmount(Number(stock.trPrc))}원
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            
              <div className="w-full flex flex-col h-[360px]">
                <MinskyWidget />
              </div>
              <FredWidget />
              <CustomHeatmapWidget />
            </div>
          )}

          {activeTab === 'prediction' && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Slot 1: Featured Carousel */}
              <div className="w-full flex flex-col h-[360px] bg-card border border-border relative overflow-hidden group">
                 {/* IDE Window Header */}
                 <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0 z-10 relative">
                    <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" /> 실시간 핫 이슈
                    </span>
                    <span className="stamp-red text-[9px] font-bold rounded-sm border-primary/30 text-primary bg-primary/5 px-1.5 py-0.5">
                      폴리마켓 트렌드
                    </span>
                 </div>
                 
                 {polys.length > 0 ? (
                   <div className="flex-1 flex flex-col justify-between p-4 relative z-10">
                     <div className="flex items-start gap-4 h-full">
                       {polys[polyIndex]?.image && (
                         <img src={polys[polyIndex].image} className="w-16 h-16 rounded-sm object-cover border border-border hidden sm:block" alt="event" />
                       )}
                       <div className="flex-1 min-w-0">
                         <a href={`https://polymarket.com/event/${polys[polyIndex]?.slug}`} target="_blank" rel="noopener noreferrer" className="block mb-3 hover:underline">
                           <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug font-sans">{polys[polyIndex]?.title}</h3>
                         </a>
                         
                         <div className="flex flex-col gap-2 overflow-y-auto max-h-[150px] custom-scrollbar pr-2">
                           {polys[polyIndex]?.markets?.map((m, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-secondary/30 px-3 py-1.5 border border-border/10 rounded-sm">
                               <span className="text-xs text-foreground font-medium truncate pr-2 font-sans">{m.title}</span>
                               <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 whitespace-nowrap font-mono select-none">
                                 {m.yesPrice !== null ? `YES ${(m.yesPrice * 100).toFixed(0)}%` : '-'}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/10">
                       <span className="text-xs font-mono font-medium text-muted-foreground">Vol: {formatMarketCap(polys[polyIndex]?.volume?.toString() || '0')}</span>
                       <div className="flex gap-1.5">
                         {polys.map((_, idx) => (
                           <div key={idx} onClick={() => setPolyIndex(idx)} className={`w-2 h-2 cursor-pointer transition-all ${idx === polyIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'}`} />
                         ))}
                       </div>
                     </div>
                     
                     {/* Arrows */}
                     <button onClick={() => setPolyIndex(i => (i === 0 ? polys.length - 1 : i - 1))} className="absolute top-1/2 -left-1 -translate-y-1/2 p-1 bg-white hover:bg-neutral-50 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-border">
                       <ChevronLeft className="w-4 h-4" />
                     </button>
                     <button onClick={() => setPolyIndex(i => (i === polys.length - 1 ? 0 : i + 1))} className="absolute top-1/2 -right-1 -translate-y-1/2 p-1 bg-white hover:bg-neutral-50 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-border">
                       <ChevronRight className="w-4 h-4" />
                     </button>
                   </div>
                  ) : null}
                </div>
 
               {/* Slot 2: Fed & Finance */}
               <div className="w-full flex flex-col h-[360px] bg-card border border-border overflow-hidden transition-colors hover:bg-neutral-50/50">
                  <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
                     <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                       <Calendar className="w-3.5 h-3.5" /> 연준 금리 전망
                     </span>
                     <span className="stamp-red text-[9px] font-bold rounded-sm border-primary/30 text-primary bg-primary/5 px-1.5 py-0.5">
                       연준 예측 지표
                     </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-amber">
                    <div className="flex flex-col gap-2">
                      {fedPolys.length > 0 ? fedPolys.map((poly, i) => (
                        <a 
                          key={i} 
                          href={`https://polymarket.com/event/${poly.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex flex-col gap-1 shrink-0 group cursor-pointer bg-secondary/20 hover:bg-secondary/60 px-3 py-2 border border-border/10 transition-colors"
                        >
                          <h3 className="text-[12px] font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors font-sans">
                            {poly.title}
                          </h3>
                          <div className="flex items-center justify-between mt-1 select-none font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-white bg-foreground px-1.5 py-0.5 rounded-sm flex-shrink-0">
                                {poly.endDate ? new Date(poly.endDate).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : 'N/A'}
                              </span>
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">Vol: {formatMarketCap(poly.volume?.toString() || '0')}</span>
                            </div>
                            <span className="font-extrabold text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5">
                              YES {poly.yesPrice !== null ? (poly.yesPrice * 100).toFixed(0) : '-'}%
                            </span>
                          </div>
                        </a>
                      )) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-[11px] p-4">데이터 로딩 중...</div>
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
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* 4. Google Trends */}
             <div className="w-full flex flex-col h-[360px] bg-card border border-border overflow-hidden transition-colors hover:bg-neutral-50/50">
               <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> 구글 실시간 트렌드
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTrendsTab("kr")}
                      className={`px-2 py-0.5 border text-[9px] font-bold transition-all ${
                        trendsTab === "kr"
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-muted-foreground border-border/20 hover:border-border/60"
                      }`}
                    >
                      🇰🇷 한국
                    </button>
                    <button
                      onClick={() => setTrendsTab("us")}
                      className={`px-2 py-0.5 border text-[9px] font-bold transition-all ${
                        trendsTab === "us"
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-muted-foreground border-border/20 hover:border-border/60"
                      }`}
                    >
                      🇺🇸 미국
                    </button>
                  </div>
               </div>
 
               {/* Content */}
               <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-rose">
                  {(trendsTab === "kr" ? trends : usTrends).length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-[11px] p-4 font-mono">트렌드 로딩 중...</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {(trendsTab === "kr" ? trends : usTrends).map((trend, i) => (
                        <a
                          key={i}
                          href={`https://www.google.com/search?q=${encodeURIComponent(trend.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center bg-secondary/20 hover:bg-secondary/60 px-3 py-2 border border-border/10 transition-colors overflow-hidden cursor-pointer shrink-0"
                        >
                          <span className="font-bold text-foreground text-[11px] line-clamp-1 truncate max-w-[120px] lg:max-w-[160px] font-sans" title={trend.title}>
                            <span className="text-primary mr-1 opacity-80">{i+1}.</span>
                            {trend.title}
                          </span>
                          <span className="text-[9px] font-bold text-white bg-foreground px-1.5 py-0.5 font-mono shrink-0 select-none">
                            {trend.traffic}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
               </div>
             </div>

              <FinlifeProductsWidget />
              <EmptySlot index={3} />
              <EmptySlot index={4} />
              <EmptySlot index={5} />
              <EmptySlot index={6} />
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar,
        .custom-scrollbar-emerald::-webkit-scrollbar,
        .custom-scrollbar-cyan::-webkit-scrollbar,
        .custom-scrollbar-rose::-webkit-scrollbar,
        .custom-scrollbar-amber::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track,
        .custom-scrollbar-emerald::-webkit-scrollbar-track,
        .custom-scrollbar-cyan::-webkit-scrollbar-track,
        .custom-scrollbar-rose::-webkit-scrollbar-track,
        .custom-scrollbar-amber::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 0px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb,
        .custom-scrollbar-emerald::-webkit-scrollbar-thumb,
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb,
        .custom-scrollbar-rose::-webkit-scrollbar-thumb,
        .custom-scrollbar-amber::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.25);
          border-radius: 0px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover,
        .custom-scrollbar-emerald::-webkit-scrollbar-thumb:hover,
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb:hover,
        .custom-scrollbar-rose::-webkit-scrollbar-thumb:hover,
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover {
          background: rgba(17, 17, 17, 0.5);
        }
      `}</style>
    </div>
  )
}
