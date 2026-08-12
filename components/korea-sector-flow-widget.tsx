"use client";

import { useEffect, useState, useCallback } from 'react';
import { Layers, RefreshCw, AlertCircle } from 'lucide-react';

interface SectorData {
  name: string;
  value: number;
  percent: number;
  marketPercent: number;
}

interface ApiResponse {
  basDt: string;
  totalMarketVolume: number;
  totalMappedVolume: number;
  sectors: SectorData[];
}

// 섹터별 컬러 테마 매핑
const SECTOR_COLORS: Record<string, string> = {
  "반도체": "bg-blue-500 dark:bg-blue-500",
  "2차전지": "bg-emerald-500 dark:bg-emerald-500",
  "IT/전자부품": "bg-cyan-500 dark:bg-cyan-400",
  "바이오": "bg-pink-500 dark:bg-pink-500",
  "자동차": "bg-orange-500 dark:bg-orange-500",
  "인터넷/게임/엔터": "bg-violet-500 dark:bg-violet-400",
  "조선/기계/방산": "bg-red-500 dark:bg-red-500",
  "금융/지주": "bg-amber-500 dark:bg-amber-400",
  "철강/에너지/소비재": "bg-slate-500 dark:bg-slate-400"
};

// 기본 백업 컬러
const DEFAULT_COLOR = "bg-primary";

export default function KoreaSectorFlowWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const res = await fetch('/api/stocks/korea/sectors');
      if (!res.ok) throw new Error('섹터 거래대금 데이터를 가져오지 못했습니다.');
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
    const trillion = amount / 1000000000000;
    if (trillion >= 0.1) {
      return `${trillion.toFixed(2)}조원`;
    }
    const eok = amount / 100000000;
    return `${Math.floor(eok).toLocaleString()}억원`;
  };

  return (
    <div className="w-full h-[360px] bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0 select-none">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
          <Layers className="w-3.5 h-3.5 text-black dark:text-white" /> KOSPI 주요 섹터 거래대금 흐름
        </span>
        <button
          onClick={fetchData}
          disabled={isRefreshing}
          className={`p-1 text-muted-foreground hover:text-black dark:hover:text-white transition-colors duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
          title="새로고침"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 p-3.5 flex flex-col justify-between overflow-hidden">
        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground font-sans">섹터 흐름 분석 중...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-500 p-4">
            <AlertCircle className="w-6 h-6" />
            <span className="text-[11px] text-center font-sans">{error}</span>
            <button onClick={fetchData} className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold transition-colors">
              다시 시도
            </button>
          </div>
        ) : data ? (
          <div className="flex-1 flex flex-col justify-between h-full gap-2.5">
            {/* 데이터 리스트 */}
            <div className="flex-1 flex flex-col justify-between gap-1 overflow-hidden">
              {data.sectors.map((sector) => {
                const colorClass = SECTOR_COLORS[sector.name] || DEFAULT_COLOR;
                return (
                  <div key={sector.name} className="flex flex-col gap-0.5 group">
                    {/* 라벨 라인 */}
                    <div className="flex items-center justify-between text-[10.5px] font-sans">
                      <span className="font-semibold text-foreground/90">{sector.name}</span>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {formatTrillion(sector.value)} <strong className="text-foreground font-bold ml-1">{sector.percent}%</strong>
                      </span>
                    </div>
                    {/* 프로그레스 바 */}
                    <div className="w-full h-1 bg-secondary overflow-hidden rounded-none relative">
                      <div 
                        className={`h-full ${colorClass} transition-all duration-500 ease-out`} 
                        style={{ width: `${sector.percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 하단 요약 및 메타 정보 */}
            <div className="border-t border-border/20 pt-2 flex items-center justify-between text-[9px] font-mono text-muted-foreground shrink-0 leading-none select-none">
              <span>주요 섹터 거래 합산: {formatTrillion(data.totalMappedVolume)}</span>
              <span>기준일: {data.basDt}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
