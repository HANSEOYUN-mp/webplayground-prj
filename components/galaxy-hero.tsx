"use client"

import { useState, useEffect } from "react"
import { TrendingUp, BarChart3, ChevronLeft, ChevronRight, Calendar, RefreshCw, AlertCircle, MessageSquareText, Flame, Plus } from "lucide-react"
import { MinskyWidget } from "@/components/minsky-widget"
import { FredWidget } from "@/components/fred-widget"
import { TradingViewHeatmapWidget } from "@/components/tradingview-heatmap-widget"
import { CustomHeatmapWidget } from "@/components/custom-heatmap-widget"
import { FinlifeProductsWidget } from "@/components/finlife-products-widget"
import { TradingViewKoreaWidget } from "@/components/tradingview-korea-widget"
import { TradingViewUSWidget } from "@/components/tradingview-us-widget"
import { EarningsCalendarWidget } from "@/components/earnings-calendar-widget"
import { CnnTechNewsWidget } from "@/components/cnn-tech-news-widget"
import { UsTechMoversWidget } from "@/components/us-tech-movers-widget"
import { CnnBeforeTheBellWidget } from "@/components/cnn-before-the-bell-widget"
import { TechVsNasdaqWidget } from "@/components/tech-vs-nasdaq-widget"
import { AssetsCompareWidget } from "@/components/assets-compare-widget"
import { EtfPerformanceWidget } from "@/components/etf-performance-widget"
import { Ush2EventsWidget } from "@/components/ush2-events-widget"
import KoreaSectorFlowWidget from "@/components/korea-sector-flow-widget"
import { AssetsValuationWidget } from "@/components/assets-valuation-widget"
import { EplFixturesWidget } from "@/components/epl-fixtures-widget"
import { TreasuryGoldWidget } from "@/components/treasury-gold-widget"

interface StockRow {
  rank: number
  itmsNm: string
  clpr: string
  fltRt: string
  mrktTotAmt: string
  trPrc: string
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

/** 억/조 단위 표시 (1조 이상은 X.X조, 억 단위는 #,###억) */
function formatAmountEok(amt: number) {
  if (!amt || isNaN(amt)) return "-";
  const jo = amt / 1e12;
  if (jo >= 1) {
    return `${jo.toFixed(1)}조`;
  }
  const eok = Math.floor(amt / 1e8);
  if (eok > 0) return `${eok.toLocaleString()}억`;
  const man = Math.floor(amt / 1e4);
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
  { rank: 16, itmsNm: "삼성SDI", clpr: "320000", fltRt: "-1.2", mrktTotAmt: "22000000000000", trPrc: "100000000000" },
  { rank: 17, itmsNm: "카카오뱅크", clpr: "28000", fltRt: "0.7", mrktTotAmt: "13000000000000", trPrc: "90000000000" },
  { rank: 18, itmsNm: "크래프톤", clpr: "290000", fltRt: "3.2", mrktTotAmt: "14000000000000", trPrc: "80000000000" },
  { rank: 19, itmsNm: "한화에어로스페이스", clpr: "430000", fltRt: "-0.5", mrktTotAmt: "18000000000000", trPrc: "75000000000" },
  { rank: 20, itmsNm: "두산로보틱스", clpr: "68000", fltRt: "6.1", mrktTotAmt: "6000000000000", trPrc: "70000000000" },
]

export function GalaxyHero({ activeTab }: { activeTab: "stock" | "kr-stock" | "news" }) {
  const [stocks, setStocks] = useState<StockRow[]>([])
  const [stockSubView, setStockSubView] = useState<"main" | "minsky" | "fred" | "compare">("main")

  const [trends, setTrends] = useState<TrendItem[]>([])
  const [usTrends, setUsTrends] = useState<TrendItem[]>([])
  const [trendsTab, setTrendsTab] = useState<"kr" | "us">("kr")
  const [stockDate, setStockDate] = useState<string>("로딩중...")
  const [isTop20Expanded, setIsTop20Expanded] = useState(false)
  const [topMarketTab, setTopMarketTab] = useState<"all" | "kospi" | "kosdaq">("all")
  const [topStocksData, setTopStocksData] = useState<{ all: StockRow[]; kospi: StockRow[]; kosdaq: StockRow[] }>({
    all: [],
    kospi: [],
    kosdaq: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isRefreshingTop, setIsRefreshingTop] = useState(false)

  const fetchTopStocksOnly = async (bypass = false) => {
    try {
      setIsRefreshingTop(true)
      const url = bypass ? `/api/stocks/top?bypassCache=true&t=${Date.now()}` : `/api/stocks/top?t=${Date.now()}`
      const stockRes = await fetch(url, { cache: "no-store" })
      if (!stockRes.ok) return
      const stockJson = await stockRes.json()
      const allList: StockRow[] = stockJson.all || stockJson.items || []
      const kospiList: StockRow[] = stockJson.kospi || []
      const kosdaqList: StockRow[] = stockJson.kosdaq || []

      setTopStocksData({
        all: allList.slice(0, 20),
        kospi: kospiList.slice(0, 20),
        kosdaq: kosdaqList.slice(0, 20)
      })

      let fetchedStocks = allList.slice(0, 20)
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
    } catch (e) {
      console.error("Top stocks refresh error:", e)
    } finally {
      setIsRefreshingTop(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [stockRes, trendsRes, usTrendsRes] = await Promise.all([
        fetch(`/api/stocks/top?t=${Date.now()}`, { cache: "no-store" }),
        fetch("/api/trends/top", { cache: "no-store" }),
        fetch("/api/trends/us", { cache: "no-store" }),
      ])
      
      const stockJson = await stockRes.json()
      const trendsJson = await trendsRes.json()
      const usTrendsJson = await usTrendsRes.json()

      if (!stockRes.ok || !trendsRes.ok) throw new Error("데이터 조회 실패")

      const allList: StockRow[] = stockJson.all || stockJson.items || []
      const kospiList: StockRow[] = stockJson.kospi || []
      const kosdaqList: StockRow[] = stockJson.kosdaq || []

      setTopStocksData({
        all: allList.slice(0, 20),
        kospi: kospiList.slice(0, 20),
        kosdaq: kosdaqList.slice(0, 20)
      })

      let fetchedStocks = allList.slice(0, 20)
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

  useEffect(() => {
    setStockSubView("main")
  }, [activeTab])

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
              {stockSubView === "main" ? (
                <>
                  {/* 맨 위 양옆 나란히: 하반기 일정 + CNN Before the Bell (모바일: 세로 스택, md+: 나란히) */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <Ush2EventsWidget />
                    <CnnBeforeTheBellWidget />
                  </div>

                  {/* 미국 주식 히트맵 (슬롯 1, 2 위에 크게 배치) */}
                  <div className="md:col-span-2 w-full">
                    <TradingViewHeatmapWidget />
                  </div>

                  {/* 미국 시장 및 주요 지표 요약 (Major US ETFs) */}
                  <div className="md:col-span-2 w-full">
                    <TradingViewUSWidget />
                  </div>

                  {/* 실적 발표 캘린더 (히트맵 하단에 동일하게 col-span-2로 배치) */}
                  <div className="md:col-span-2 w-full">
                    <EarningsCalendarWidget />
                  </div>

                  {/* US Tech Movers (상세보기를 밖에서 보이도록 col-span-2 크기로 꺼냄) */}
                  <div className="md:col-span-2 w-full">
                    <UsTechMoversWidget isDetailed={true} />
                  </div>

                  {/* MONEY FLOW MATRIX (2열 크게 배치) */}
                  <div className="md:col-span-2 w-full">
                    <CustomHeatmapWidget />
                  </div>

                  {/* 글로벌 거시 경제 지표와 CNN Tech News 를 양옆으로 나란히 배치 */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* 글로벌 거시 경제 지표 슬롯 (웹앱 테마 유지 & 3버튼 구성) */}
                    <div className="w-full flex flex-col h-[360px] bg-card border border-border rounded-none overflow-hidden transition-colors hover:bg-neutral-50/50">
                      {/* 헤더 */}
                      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
                        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
                          <BarChart3 className="w-3.5 h-3.5 text-black dark:text-white" /> 글로벌 거시 경제 지표
                        </span>
                      </div>
                      {/* 본문 콘텐츠 */}
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <p className="text-[11.5px] text-muted-foreground leading-relaxed font-sans mb-4">
                            글로벌 시장 및 거시 경제의 주요 지표 대시보드를 선택해 이동할 수 있습니다.
                          </p>
                        </div>

                        {/* 3개 버튼 배치 */}
                        <div className="flex flex-col gap-3 flex-1 justify-center">
                          {/* 첫번째: 공포 탐욕지수 */}
                          <button 
                            onClick={() => setStockSubView("minsky")}
                            className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition-colors flex items-center justify-between px-4 rounded-none font-sans select-none"
                          >
                            <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 animate-pulse text-amber-300" /> 공포 탐욕 지수 (CNN)</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {/* 두번째: 거시경제 지표 */}
                          <button 
                            onClick={() => setStockSubView("fred")}
                            className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition-colors flex items-center justify-between px-4 rounded-none font-sans select-none"
                          >
                            <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-indigo-300" /> 미국 거시경제 지표 (FRED)</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {/* 세번째: 미국 자산시장 거시흐름 */}
                          <button 
                            onClick={() => setStockSubView("compare")}
                            className="w-full py-2.5 bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition-colors flex items-center justify-between px-4 rounded-none font-sans select-none"
                          >
                            <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-300 animate-pulse" /> 미국 자산시장 거시흐름</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <CnnTechNewsWidget />
                  </div>
                </>
              ) : (
                <>
                  {/* 돌아가기 버튼 */}
                  <div className="md:col-span-2 flex items-center mb-2">
                    <button 
                      onClick={() => setStockSubView("main")}
                      className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors bg-secondary border border-border px-3 py-1.5 select-none"
                    >
                      <ChevronLeft className="w-4 h-4" /> 미국 주식 메인으로 돌아가기
                    </button>
                  </div>

                  {stockSubView === "minsky" ? (
                    /* 공포 탐욕지수 상세 뷰 */
                    <div className="md:col-span-2 w-full flex flex-col">
                      <MinskyWidget className="h-auto" />
                    </div>
                  ) : stockSubView === "fred" ? (
                    /* 거시경제 지표 상세 뷰 */
                    <div className="md:col-span-2 w-full flex flex-col">
                      <FredWidget />
                    </div>
                  ) : (
                    /* 미국 자산시장 거시흐름 상세 뷰 */
                    <div className="md:col-span-2 w-full flex flex-col gap-6">
                      <EtfPerformanceWidget />
                      <TechVsNasdaqWidget />
                      <AssetsCompareWidget />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'kr-stock' && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* 미국 국채 10·20·30Y · 기준금리 및 금(Gold) 50년 추이 슬롯 */}
              <div className="md:col-span-2 w-full">
                <TreasuryGoldWidget />
              </div>

              {/* 국내 시장 요약 (KOSPI/KOSDAQ 차트) */}
              <div className="md:col-span-2 w-full">
                <TradingViewKoreaWidget />
              </div>

              {/* 주요 자산 3년 평균가 & BUY Zone 밸류에이션 슬롯 */}
              <div className="md:col-span-2 w-full">
                <AssetsValuationWidget />
              </div>

              {/* KOSPI 주요 섹터 흐름 슬롯 (네이버 실시간 급상승 업종) */}
              <div className="md:col-span-2 w-full">
                <KoreaSectorFlowWidget />
              </div>

              {/* 거래대금 TOP 20 — 1~10위 왼쪽, 11~20위 오른쪽 */}
              {(() => {
                const activeStocks = topStocksData[topMarketTab]?.length > 0 ? topStocksData[topMarketTab] : stocks;
                return (
                  <div className={`md:col-span-2 w-full flex flex-col bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 ${isTop20Expanded ? 'h-auto md:h-[520px]' : 'h-[37px]'}`}>
                    <div className={`flex items-center justify-between bg-secondary/50 px-4 py-2 ${isTop20Expanded ? 'border-b border-border' : ''} shrink-0`}>
                      <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1 font-sans select-text cursor-text">
                        <TrendingUp className="w-3.5 h-3.5 text-black dark:text-white" /> 거래대금 TOP 20
                      </span>
                      
                      <div className="flex items-center gap-2 select-none">
                        {isTop20Expanded && (
                          <>
                            {/* 코스피/코스닥/전체 탭 버튼 */}
                            <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
                              <button
                                onClick={() => setTopMarketTab("all")}
                                className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                                  topMarketTab === "all" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                전체 (통합)
                              </button>
                              <button
                                onClick={() => setTopMarketTab("kospi")}
                                className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                                  topMarketTab === "kospi" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                코스피 (KOSPI)
                              </button>
                              <button
                                onClick={() => setTopMarketTab("kosdaq")}
                                className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                                  topMarketTab === "kosdaq" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                코스닥 (KOSDAQ)
                              </button>
                            </div>

                            {stockDate && (
                              <span className="stamp-red text-[8.5px] font-bold rounded-sm border-primary/30 text-primary bg-primary/5 px-1.5 py-0.5 select-none hidden sm:inline-block">
                                {stockDate}
                              </span>
                            )}

                            <button
                              onClick={() => fetchTopStocksOnly(true)}
                              disabled={isRefreshingTop}
                              className={`p-1 text-muted-foreground hover:text-black dark:hover:text-white transition-colors duration-200 ${isRefreshingTop ? 'animate-spin' : ''}`}
                              title="거래대금 TOP 20 새로고침"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setIsTop20Expanded(!isTop20Expanded)}
                          className="px-2 py-0.5 text-[8.5px] font-extrabold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-none transition-colors select-none mr-1"
                        >
                          {isTop20Expanded ? "접기 ▲" : "펼치기 ▼"}
                        </button>
                      </div>
                    </div>

                    {isTop20Expanded && (
                      <>
                        {/* 컨럼 레이블 헤더 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border/10 shrink-0 border-b border-border/10 bg-secondary/30">
                          {[0, 1].map((col) => (
                            <div key={col} className={`flex items-center gap-1.5 px-3 py-1.5 ${col === 1 ? 'hidden md:flex' : ''}`}>
                              <span className="w-5 shrink-0" />
                              <span className="flex-1 text-[9px] font-bold text-muted-foreground/60 tracking-wider">종목</span>
                              <span className="w-[46px] text-right text-[9px] font-bold text-muted-foreground/60 shrink-0">등락</span>
                              <span className="w-[66px] text-right text-[9px] font-bold text-muted-foreground/60 shrink-0">주가</span>
                              <span className="w-[44px] text-right text-[9px] font-bold text-muted-foreground/60 shrink-0">거래대금</span>
                              <span className="w-[40px] text-right text-[9px] font-bold text-muted-foreground/60 shrink-0">%/시총</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex-1 overflow-hidden">
                          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border/10 h-full">
                            {/* 1~10위 */}
                            <div className="flex flex-col h-full divide-y divide-border/5">
                              {activeStocks.slice(0, 10).map((stock, i) => {
                                const isUp = Number(stock.fltRt) >= 0
                                const fltColor = isUp ? "text-red-600" : "text-blue-600"
                                const trColor = isUp ? "text-red-500" : "text-blue-500"
                                const rowBg = isUp ? "hover:bg-red-50/50" : "hover:bg-blue-50/50"
                                const ratio = Number(stock.mrktTotAmt) > 0
                                  ? ((Number(stock.trPrc) / Number(stock.mrktTotAmt)) * 100).toFixed(1)
                                  : "-"
                                return (
                                  <div key={i} className={`flex-1 flex items-center gap-1.5 px-3 transition-colors ${rowBg}`}>
                                    <span className="text-[10px] font-extrabold font-mono text-muted-foreground/40 w-5 shrink-0 text-right">{stock.rank}</span>
                                    <span className="flex-1 font-bold text-foreground text-[13px] truncate font-sans min-w-0" title={stock.itmsNm}>{stock.itmsNm}</span>
                                    <span className={`text-[11px] font-extrabold font-mono w-[46px] text-right shrink-0 ${fltColor}`}>
                                      {Number(stock.fltRt) > 0 ? "+" : ""}{stock.fltRt}%
                                    </span>
                                    <span className="text-[11px] font-bold font-mono text-foreground w-[66px] text-right shrink-0">
                                      {Number(stock.clpr).toLocaleString()}
                                    </span>
                                    <span className={`text-[10.5px] font-bold font-mono w-[44px] text-right shrink-0 ${trColor}`}>
                                      {formatAmountEok(Number(stock.trPrc))}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground/70 w-[40px] text-right shrink-0">
                                      {ratio}%
                                    </span>
                                  </div>
                                )
                              })}
                            </div>

                            {/* 11~20위 */}
                            <div className="flex flex-col h-full divide-y divide-border/5">
                              {activeStocks.slice(10, 20).map((stock, i) => {
                                const isUp = Number(stock.fltRt) >= 0
                                const fltColor = isUp ? "text-red-600" : "text-blue-600"
                                const trColor = isUp ? "text-red-500" : "text-blue-500"
                                const rowBg = isUp ? "hover:bg-red-50/50" : "hover:bg-blue-50/50"
                                const ratio = Number(stock.mrktTotAmt) > 0
                                  ? ((Number(stock.trPrc) / Number(stock.mrktTotAmt)) * 100).toFixed(1)
                                  : "-"
                                return (
                                  <div key={i} className={`flex-1 flex items-center gap-1.5 px-3 transition-colors ${rowBg}`}>
                                    <span className="text-[10px] font-extrabold font-mono text-muted-foreground/40 w-5 shrink-0 text-right">{stock.rank}</span>
                                    <span className="flex-1 font-bold text-foreground text-[13px] truncate font-sans min-w-0" title={stock.itmsNm}>{stock.itmsNm}</span>
                                    <span className={`text-[11px] font-extrabold font-mono w-[46px] text-right shrink-0 ${fltColor}`}>
                                      {Number(stock.fltRt) > 0 ? "+" : ""}{stock.fltRt}%
                                    </span>
                                    <span className="text-[11px] font-bold font-mono text-foreground w-[66px] text-right shrink-0">
                                      {Number(stock.clpr).toLocaleString()}
                                    </span>
                                    <span className={`text-[10.5px] font-bold font-mono w-[44px] text-right shrink-0 ${trColor}`}>
                                      {formatAmountEok(Number(stock.trPrc))}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground/70 w-[40px] text-right shrink-0">
                                      {ratio}%
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* 구글 실시간 트렌드 */}
              <div className="w-full flex flex-col h-[360px] bg-card border border-border overflow-hidden transition-colors hover:bg-neutral-50/50">
                <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 animate-pulse text-primary" /> 구글 실시간 트렌드
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
                          className="flex justify-between items-center bg-secondary/20 hover:bg-secondary/60 px-3 py-2 border border-border/10 transition-colors"
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

              {/* 금융 상품 금리 비교 (최고 금리 상품) */}
              <FinlifeProductsWidget />
            </div>
          )}

          {activeTab === 'news' && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* 1. 프리미어리그 다음 라운드 경기 일정 (국내 시장 요약처럼 크게 상단 배치) */}
              <div className="md:col-span-2 w-full">
                <EplFixturesWidget />
              </div>

              {/* 2. 신규 빈 슬롯 (Slot 1) */}
              <div className="w-full flex flex-col h-[360px] bg-card border border-dashed border-border/80 overflow-hidden transition-colors hover:bg-neutral-50/50">
                <div className="flex items-center justify-between bg-secondary/30 px-4 py-2 border-b border-border/40 shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground/70 tracking-wider flex items-center gap-1 font-sans">
                    신규 슬롯
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/50 border border-border/30 px-1.5 py-0.2">
                    EMPTY
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                  <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center text-muted-foreground/50 mb-2.5 border border-dashed border-border/60">
                    <Plus className="w-5 h-5 text-muted-foreground/60" />
                  </div>
                  <span className="text-[12px] font-bold text-muted-foreground/80 font-sans">
                    신규 위젯 준비중
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono mt-1">
                    새로운 데이터 및 위젯이 배치될 슬롯입니다.
                  </span>
                </div>
              </div>

              {/* 3. 신규 빈 슬롯 (Slot 2) */}
              <div className="w-full flex flex-col h-[360px] bg-card border border-dashed border-border/80 overflow-hidden transition-colors hover:bg-neutral-50/50">
                <div className="flex items-center justify-between bg-secondary/30 px-4 py-2 border-b border-border/40 shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground/70 tracking-wider flex items-center gap-1 font-sans">
                    신규 슬롯
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/50 border border-border/30 px-1.5 py-0.2">
                    EMPTY
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                  <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center text-muted-foreground/50 mb-2.5 border border-dashed border-border/60">
                    <Plus className="w-5 h-5 text-muted-foreground/60" />
                  </div>
                  <span className="text-[12px] font-bold text-muted-foreground/80 font-sans">
                    신규 위젯 준비중
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono mt-1">
                    새로운 데이터 및 위젯이 배치될 슬롯입니다.
                  </span>
                </div>
              </div>
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
