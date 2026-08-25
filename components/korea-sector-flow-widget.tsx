"use client";

import { useEffect, useState, useCallback } from 'react';
import { Layers, RefreshCw, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';

interface KisSector {
  name: string;
  value: number;
  percent: number;
  marketPercent: number;
  changeRate: number;
  indexPrice: number;
}

interface NaverSector {
  no: string;
  name: string;
  changeRate: number;
  changeText: string;
}

interface ApiResponse {
  kis?: {
    source: string;
    basDt: string;
    totalMarketVolume: number;
    totalMappedVolume: number;
    sectors: KisSector[];
    error?: string;
  };
  naver?: {
    source: string;
    basDt: string;
    totalCount: number;
    sectors: NaverSector[];
    error?: string;
  };
  updatedAt?: string;
  error?: string;
}

// 한투 섹터별 컬러 테마 매핑
const KIS_COLORS: Record<string, string> = {
  "전기전자 (반도체/IT)": "bg-blue-500 dark:bg-blue-500",
  "금융업 (은행/지주)": "bg-amber-500 dark:bg-amber-400",
  "화학 (2차전지/소재)": "bg-emerald-500 dark:bg-emerald-500",
  "운수장비 (자동차/조선)": "bg-orange-500 dark:bg-orange-500",
  "건설업": "bg-yellow-500 dark:bg-yellow-400",
  "기계 (원전/방산)": "bg-red-500 dark:bg-red-500",
  "의약품 (바이오/제약)": "bg-pink-500 dark:bg-pink-500",
  "철강금속": "bg-slate-500 dark:bg-slate-400",
  "운수창고 (물류/해운)": "bg-cyan-500 dark:bg-cyan-400",
  "음식료품": "bg-lime-500 dark:bg-lime-400",
  "통신업": "bg-indigo-500 dark:bg-indigo-400"
};

const DEFAULT_COLOR = "bg-primary";

export default function KoreaSectorFlowWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"kis" | "naver">("kis");

  const fetchData = useCallback(async (bypass = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const url = bypass ? '/api/stocks/korea/sectors?bypassCache=true' : '/api/stocks/korea/sectors';
      const res = await fetch(url);
      if (!res.ok) throw new Error('섹터 데이터를 가져오지 못했습니다.');
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 거래대금 포맷팅 함수 (조원 / 억원)
  const formatTrillion = (amount: number) => {
    if (!amount || isNaN(amount)) return "0원";
    const trillion = amount / 1000000000000;
    if (trillion >= 0.1) {
      return `${trillion.toFixed(2)}조원`;
    }
    const eok = amount / 100000000;
    return `${Math.floor(eok).toLocaleString()}억원`;
  };

  const kisData = data?.kis;
  const naverData = data?.naver;

  return (
    <div className="w-full h-[360px] bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans select-text cursor-text">
          <Layers className="w-3.5 h-3.5 text-black dark:text-white" /> KOSPI 주요 섹터 흐름
        </span>
        
        <div className="flex items-center gap-2 select-none">
          {/* 탭 전환 버튼 */}
          <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
            <button
              onClick={() => setActiveTab("kis")}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all flex items-center gap-1 ${
                activeTab === "kis"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              한투 (거래대금)
            </button>
            <button
              onClick={() => setActiveTab("naver")}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all flex items-center gap-1 ${
                activeTab === "naver"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              네이버 (급상승 업종)
            </button>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className={`p-1 text-muted-foreground hover:text-black dark:hover:text-white transition-colors duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
            title="새로고침 (실시간 조회)"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 p-3.5 flex flex-col justify-between overflow-hidden">
        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground font-sans">실시간 섹터 흐름 분석 중...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-500 p-4">
            <AlertCircle className="w-6 h-6" />
            <span className="text-[11px] text-center font-sans">{error}</span>
            <button onClick={() => fetchData(true)} className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold transition-colors">
              다시 시도
            </button>
          </div>
        ) : activeTab === "kis" ? (
          /* 한투 탭 (실시간 거래대금 비중) */
          !kisData || kisData.error || kisData.sectors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-[11px]">
              {kisData?.error || "한국투자증권 실시간 거래대금 데이터를 불러올 수 없습니다."}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between h-full gap-2">
              <div className="flex-1 flex flex-col justify-between gap-1 overflow-hidden">
                {kisData.sectors.slice(0, 8).map((sector) => {
                  const colorClass = KIS_COLORS[sector.name] || DEFAULT_COLOR;
                  const isUp = (sector.changeRate ?? 0) >= 0;
                  return (
                    <div key={sector.name} className="flex flex-col gap-0.5 group">
                      <div className="flex items-center justify-between text-[10px] font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground/90">{sector.name}</span>
                          <span className={`text-[8.5px] font-mono font-bold ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                            {isUp ? '+' : ''}{sector.changeRate}%
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {formatTrillion(sector.value)} <strong className="text-foreground font-bold ml-1">{sector.percent}%</strong>
                        </span>
                      </div>
                      <div className="w-full h-1 bg-secondary overflow-hidden rounded-none relative">
                        <div 
                          className={`h-full ${colorClass} transition-all duration-500 ease-out`} 
                          style={{ width: `${Math.min(100, sector.percent)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border/20 pt-1.5 flex items-center justify-between text-[8.5px] font-mono text-muted-foreground shrink-0 leading-none select-none">
                <span>코스피 전체 거래: {formatTrillion(kisData.totalMarketVolume)}</span>
                <span className="stamp-red text-[8px] px-1 py-0.2 border border-primary/20 bg-primary/5 text-primary">
                  한투 실시간망 • {kisData.basDt}
                </span>
              </div>
            </div>
          )
        ) : (
          /* 네이버 탭 (실시간 급상승 업종 랭킹) */
          !naverData || naverData.error || naverData.sectors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-[11px]">
              {naverData?.error || "네이버 금융 실시간 업종 데이터를 불러올 수 없습니다."}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between h-full gap-2">
              <div className="flex-1 flex flex-col justify-between gap-1 overflow-hidden">
                {naverData.sectors.slice(0, 8).map((sector, idx) => {
                  const isUp = (sector.changeRate ?? 0) >= 0;
                  // 최대 등락률 기준 게이지 바 비율 (10% 기준)
                  const barWidth = Math.min(100, Math.max(10, (Math.abs(sector.changeRate) / 10) * 100));
                  return (
                    <div key={sector.no} className="flex flex-col gap-0.5 group">
                      <div className="flex items-center justify-between text-[10px] font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] text-muted-foreground w-3 font-bold">{idx + 1}</span>
                          <span className="font-semibold text-foreground/90">{sector.name}</span>
                        </div>
                        <span className={`font-mono text-[9.5px] font-bold ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                          {sector.changeText}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-secondary overflow-hidden rounded-none relative">
                        <div 
                          className={`h-full ${isUp ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-500 ease-out`} 
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border/20 pt-1.5 flex items-center justify-between text-[8.5px] font-mono text-muted-foreground shrink-0 leading-none select-none">
                <span>실시간 상위 핫 업종 (총 {naverData.totalCount}개 업종)</span>
                <span className="stamp-red text-[8px] px-1 py-0.2 border border-primary/20 bg-primary/5 text-primary">
                  네이버 증권 실시간 • {naverData.basDt}
                </span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
