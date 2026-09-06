"use client";

import { useEffect, useState, useCallback } from 'react';
import { Layers, RefreshCw, AlertCircle } from 'lucide-react';

interface NaverSector {
  no: string;
  name: string;
  changeRate: number;
  changeText: string;
}

interface ApiResponse {
  source?: string;
  basDt?: string;
  totalCount?: number;
  sectors?: NaverSector[];
  updatedAt?: string;
  error?: string;
}

export default function KoreaSectorFlowWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async (bypass = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const url = bypass ? '/api/stocks/korea/sectors?bypassCache=true' : '/api/stocks/korea/sectors';
      const res = await fetch(url);
      if (!res.ok) throw new Error('섹터 데이터를 가져오지 못했습니다.');
      const json: ApiResponse = await res.json();
      if (json.error) throw new Error(json.error);
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

  const sectors = data?.sectors || [];
  const leftSectors = sectors.slice(0, 8);
  const rightSectors = sectors.slice(8, 16);

  return (
    <div className="w-full h-[360px] bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans select-text cursor-text">
          <Layers className="w-3.5 h-3.5 text-black dark:text-white" /> KOSPI 주요 섹터 흐름
        </span>
        
        <div className="flex items-center gap-2 select-none">
          {data?.basDt && (
            <span className="stamp-red text-[8.5px] px-1.5 py-0.5 border border-primary/20 bg-primary/5 text-primary">
              네이버 실시간 • {data.basDt}
            </span>
          )}

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
            <span className="text-[10px] text-muted-foreground font-sans">실시간 업종 흐름 분석 중...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-500 p-4">
            <AlertCircle className="w-6 h-6" />
            <span className="text-[11px] text-center font-sans">{error}</span>
            <button onClick={() => fetchData(true)} className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold transition-colors">
              다시 시도
            </button>
          </div>
        ) : sectors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-[11px]">
            실시간 업종 데이터를 불러올 수 없습니다.
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between h-full gap-2">
            {/* 2열 그리드 레이아웃 (좌: 1~8위, 우: 9~16위) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 overflow-hidden">
              {/* 왼쪽 1~8위 */}
              <div className="flex flex-col justify-between gap-1 overflow-hidden">
                {leftSectors.map((sector, idx) => {
                  const isUp = (sector.changeRate ?? 0) >= 0;
                  const barWidth = Math.min(100, Math.max(10, (Math.abs(sector.changeRate) / 10) * 100));
                  return (
                    <div key={sector.no} className="flex flex-col gap-0.5 group">
                      <div className="flex items-center justify-between text-[10px] font-sans">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[9px] text-muted-foreground w-3 font-bold shrink-0">{idx + 1}</span>
                          <span className="font-semibold text-foreground/90 truncate">{sector.name}</span>
                        </div>
                        <span className={`font-mono text-[9.5px] font-bold shrink-0 ml-1 ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
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

              {/* 오른쪽 9~16위 */}
              <div className="hidden md:flex flex-col justify-between gap-1 overflow-hidden">
                {rightSectors.map((sector, idx) => {
                  const isUp = (sector.changeRate ?? 0) >= 0;
                  const barWidth = Math.min(100, Math.max(10, (Math.abs(sector.changeRate) / 10) * 100));
                  return (
                    <div key={sector.no} className="flex flex-col gap-0.5 group">
                      <div className="flex items-center justify-between text-[10px] font-sans">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[9px] text-muted-foreground w-3 font-bold shrink-0">{idx + 9}</span>
                          <span className="font-semibold text-foreground/90 truncate">{sector.name}</span>
                        </div>
                        <span className={`font-mono text-[9.5px] font-bold shrink-0 ml-1 ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
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
            </div>

            {/* 하단 요약 정보 */}
            <div className="border-t border-border/20 pt-1.5 flex items-center justify-between text-[8.5px] font-mono text-muted-foreground shrink-0 leading-none select-none">
              <span>실시간 상위 급상승 업종 (총 {data?.totalCount || 79}개 업종 집계)</span>
              <span>데이터 출처: 네이버 증권</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
