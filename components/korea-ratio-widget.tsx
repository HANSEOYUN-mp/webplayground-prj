import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, ChevronDown, ChevronUp, AlertCircle, ArrowUpRight } from 'lucide-react';

interface RatioData {
  kospi: {
    index: number;
    totalMarketCap: number;
    totalVolumeAmount: number;
  };
  samsung: {
    price: number;
    marketCap: number;
    volumeAmount: number;
    marketCapPercent: number;
    volumeAmountPercent: number;
    volumeToCapRatio: number;
  };
  hynix: {
    price: number;
    marketCap: number;
    volumeAmount: number;
    marketCapPercent: number;
    volumeAmountPercent: number;
    volumeToCapRatio: number;
  };
  combined: {
    marketCapPercent: number;
    volumeAmountPercent: number;
    volumeToCapRatio: number;
  };
  updatedAt: string;
}

export function KoreaRatioWidget() {
  const [data, setData] = useState<RatioData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchData = async (isManual: boolean = false) => {
    try {
      setIsRefreshing(true);
      const url = isManual 
        ? `/api/stocks/korea/ratio?bypassCache=true&t=${Date.now()}` 
        : `/api/stocks/korea/ratio?t=${Date.now()}`;
      
      const res = await fetch(url, isManual ? { cache: 'no-store' } : undefined);
      if (!res.ok) {
        throw new Error('API 응답에 실패했습니다.');
      }
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || '데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    // 1시간 주기 자동 업데이트 (3600000 ms)
    const interval = setInterval(() => {
      fetchData(false);
    }, 3600000);

    return () => clearInterval(interval);
  }, []);

  const formatTrillion = (value: number) => {
    return `${(value / 1e12).toFixed(1)}조`;
  };

  // 포맷팅 헬퍼
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '';
    }
  };
  return (
    <div className="w-full bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col h-[360px]">
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
          <Cpu className="w-3.5 h-3.5 text-black dark:text-white" /> KOSPI 반도체 투톱 지분율 분석
        </span>
        <button 
          onClick={() => fetchData(true)} 
          disabled={isRefreshing}
          className={`p-1 text-muted-foreground hover:text-black dark:hover:text-white transition-colors duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
          title="새로고침"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* 본문 콘텐츠 */}
      <div className="flex-1 p-3.5 flex flex-col justify-between overflow-hidden">
        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground font-sans">데이터를 수집하는 중...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-500 p-4">
            <AlertCircle className="w-6 h-6" />
            <span className="text-[11px] text-center font-sans">{error}</span>
            <button onClick={() => fetchData(true)} className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold transition-colors">
              다시 시도
            </button>
          </div>
        ) : data ? (
          <div className="flex-1 flex flex-col justify-between h-full gap-2">
            {/* KOSPI 시장 정보 한눈에 보기 */}
            <div className="flex items-center justify-between bg-secondary/20 p-2 border border-border/40 text-[10px] font-mono text-muted-foreground select-none shrink-0">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span>지수: <strong className="text-foreground">{data.kospi.index.toLocaleString()}pt</strong></span>
                <span>시총: <strong className="text-foreground">{formatTrillion(data.kospi.totalMarketCap)}</strong></span>
                <span>거래대금: <strong className="text-foreground">{formatTrillion(data.kospi.totalVolumeAmount)}</strong></span>
              </div>
            </div>

            {/* 종목별 비중 요약 리스트 */}
            <div className="flex-1 flex flex-col justify-between py-1 gap-2.5 my-1 overflow-hidden">
              {/* 삼성전자 */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="font-bold text-blue-600 dark:text-blue-400">삼성전자 ({data.samsung.price.toLocaleString()}원)</span>
                  <span className="text-[9.5px] font-mono text-muted-foreground">자체 시총 대비 거래비율: <strong className="text-blue-600 dark:text-blue-400">{data.samsung.volumeToCapRatio.toFixed(4)}%</strong></span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80 leading-none">
                    <span>코스피 시총 비중</span>
                    <span className="font-bold text-foreground">{data.samsung.marketCapPercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-secondary overflow-hidden rounded-none">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${data.samsung.marketCapPercent}%` }}></div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80 leading-none">
                    <span>코스피 거래대금 비중</span>
                    <span className="font-bold text-foreground">{data.samsung.volumeAmountPercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-secondary overflow-hidden rounded-none">
                    <div className="h-full bg-blue-400/80 transition-all duration-500" style={{ width: `${data.samsung.volumeAmountPercent}%` }}></div>
                  </div>
                </div>
              </div>

              {/* SK하이닉스 */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="font-bold text-orange-600 dark:text-orange-400">SK하이닉스 ({data.hynix.price.toLocaleString()}원)</span>
                  <span className="text-[9.5px] font-mono text-muted-foreground">자체 시총 대비 거래비율: <strong className="text-orange-600 dark:text-orange-400">{data.hynix.volumeToCapRatio.toFixed(4)}%</strong></span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80 leading-none">
                    <span>코스피 시총 비중</span>
                    <span className="font-bold text-foreground">{data.hynix.marketCapPercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-secondary overflow-hidden rounded-none">
                    <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${data.hynix.marketCapPercent}%` }}></div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80 leading-none">
                    <span>코스피 거래대금 비중</span>
                    <span className="font-bold text-foreground">{data.hynix.volumeAmountPercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-secondary overflow-hidden rounded-none">
                    <div className="h-full bg-orange-400/80 transition-all duration-500" style={{ width: `${data.hynix.volumeAmountPercent}%` }}></div>
                  </div>
                </div>
              </div>

              {/* 합산 비중 */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="font-bold text-purple-600 dark:text-purple-400">투톱 합산 (삼성 + 하이닉스)</span>
                  <span className="text-[9.5px] font-mono text-muted-foreground">합산 시총 대비 거래비율: <strong className="text-purple-600 dark:text-purple-400">{data.combined.volumeToCapRatio.toFixed(4)}%</strong></span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80 leading-none">
                    <span>코스피 합산 시총 비중</span>
                    <span className="font-bold text-foreground">{data.combined.marketCapPercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-secondary overflow-hidden rounded-none">
                    <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${data.combined.marketCapPercent}%` }}></div>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80 leading-none">
                    <span>코스피 합산 거래대금 비중</span>
                    <span className="font-bold text-foreground">{data.combined.volumeAmountPercent}%</span>
                  </div>
                  <div className="w-full h-1 bg-secondary overflow-hidden rounded-none">
                    <div className="h-full bg-purple-400/80 transition-all duration-500" style={{ width: `${data.combined.volumeAmountPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 쏠림도 및 비율 정보 */}
            <div className="border-t border-border/20 pt-1.5 flex items-center justify-between text-[9px] font-mono text-muted-foreground shrink-0 leading-none">
              <span>투톱 합산 거래대금/시총 비율: {data.combined.volumeToCapRatio.toFixed(4)}%</span>
              <span>{data.isFallback ? '네이버 금융' : '한투 API'} • {formatTime(data.updatedAt)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
