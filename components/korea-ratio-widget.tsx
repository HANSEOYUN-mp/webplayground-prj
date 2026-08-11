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

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/stocks/korea/ratio');
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
    fetchData();

    // 1시간 주기 자동 업데이트 (3600000 ms)
    const interval = setInterval(() => {
      fetchData();
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
    <div className={`w-full bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col ${isExpanded ? 'h-[680px]' : 'h-[37px]'}`}>
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0 select-none">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
          <Cpu className="w-3.5 h-3.5 text-black dark:text-white" /> KOSPI 반도체 투톱 지분율 분석
        </span>
        <div className="flex items-center gap-2">
          {data && !loading && !error && isExpanded && (
            <span className="text-[9px] text-muted-foreground font-mono">
              갱신: {formatTime(data.updatedAt)}
            </span>
          )}
          {isExpanded && (
            <button 
              onClick={fetchData} 
              disabled={isRefreshing}
              className={`p-1 text-muted-foreground hover:text-black dark:hover:text-white transition-colors duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
              title="새로고침"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary transition-colors rounded-none font-sans"
          >
            {isExpanded ? (
              <>접기 <ChevronUp className="w-2.5 h-2.5" /></>
            ) : (
              <>펼치기 <ChevronDown className="w-2.5 h-2.5" /></>
            )}
          </button>
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      {isExpanded && (
        <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
          {loading && !data ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-[10px] text-muted-foreground font-sans">데이터를 수집하는 중...</span>
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
            <div className="flex-1 flex flex-col gap-4">
              {/* KOSPI 시장 정보 한눈에 보기 */}
              <div className="flex items-center justify-between bg-secondary/20 p-2.5 border border-border/40 text-[11px] font-mono text-muted-foreground select-none">
                <div className="flex gap-4">
                  <span>KOSPI 지수: <strong className="text-foreground">{data.kospi.index.toLocaleString()}pt</strong></span>
                  <span>KOSPI 시총: <strong className="text-foreground">{formatTrillion(data.kospi.totalMarketCap)}</strong></span>
                  <span>KOSPI 거래대금: <strong className="text-foreground">{formatTrillion(data.kospi.totalVolumeAmount)}</strong></span>
                </div>
                <span className="text-[9px] text-primary bg-primary/5 border border-primary/20 px-1 py-0.2">
                  {data.isFallback ? '백업 실시간망' : '한투 Open API'}
                </span>
              </div>

              {/* 3단 분석 카드 (세로 배치) */}
              <div className="grid grid-cols-1 gap-4 flex-1">
                {/* 1. 삼성전자 */}
                <div className="border border-border p-3.5 bg-card hover:border-blue-300 dark:hover:border-blue-900 transition-colors flex flex-col justify-between select-none">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 font-sans">
                        삼성전자 <span className="text-[9px] font-mono text-muted-foreground">005930</span>
                      </span>
                      <span className="text-xs font-bold font-mono">{data.samsung.price.toLocaleString()}원</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed mb-4 font-sans">
                      시총: {formatTrillion(data.samsung.marketCap)} / 거래대금: {formatTrillion(data.samsung.volumeAmount)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* 코스피 전체 시총 대비 */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span className="text-muted-foreground">코스피 전체 시총 대비</span>
                        <span className="font-bold text-foreground">{data.samsung.marketCapPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary overflow-hidden rounded-none">
                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(data.samsung.marketCapPercent, 100)}%` }}></div>
                      </div>
                    </div>

                    {/* 코스피 전체 거래대금 대비 */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span className="text-muted-foreground">코스피 전체 거래대금 대비</span>
                        <span className="font-bold text-foreground">{data.samsung.volumeAmountPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary overflow-hidden rounded-none">
                        <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${Math.min(data.samsung.volumeAmountPercent, 100)}%` }}></div>
                      </div>
                    </div>

                    {/* 거래대금 / 시총 비율 */}
                    <div className="pt-1.5 border-t border-border/40 flex justify-between items-center text-[10px] font-mono">
                      <span className="text-muted-foreground">당일 거래대금 / 시가총액 비율</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{data.samsung.volumeToCapRatio.toFixed(4)}%</span>
                    </div>
                  </div>
                </div>

                {/* 2. SK하이닉스 */}
                <div className="border border-border p-3.5 bg-card hover:border-orange-300 dark:hover:border-orange-900 transition-colors flex flex-col justify-between select-none">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 font-sans">
                        SK하이닉스 <span className="text-[9px] font-mono text-muted-foreground">000660</span>
                      </span>
                      <span className="text-xs font-bold font-mono">{data.hynix.price.toLocaleString()}원</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed mb-4 font-sans">
                      시총: {formatTrillion(data.hynix.marketCap)} / 거래대금: {formatTrillion(data.hynix.volumeAmount)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* 코스피 전체 시총 대비 */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span className="text-muted-foreground">코스피 전체 시총 대비</span>
                        <span className="font-bold text-foreground">{data.hynix.marketCapPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary overflow-hidden rounded-none">
                        <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.min(data.hynix.marketCapPercent, 100)}%` }}></div>
                      </div>
                    </div>

                    {/* 코스피 전체 거래대금 대비 */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span className="text-muted-foreground">코스피 전체 거래대금 대비</span>
                        <span className="font-bold text-foreground">{data.hynix.volumeAmountPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary overflow-hidden rounded-none">
                        <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${Math.min(data.hynix.volumeAmountPercent, 100)}%` }}></div>
                      </div>
                    </div>

                    {/* 거래대금 / 시총 비율 */}
                    <div className="pt-1.5 border-t border-border/40 flex justify-between items-center text-[10px] font-mono">
                      <span className="text-muted-foreground">당일 거래대금 / 시가총액 비율</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">{data.hynix.volumeToCapRatio.toFixed(4)}%</span>
                    </div>
                  </div>
                </div>

                {/* 3. 반도체 투톱 합산 */}
                <div className="border border-border p-3.5 bg-card hover:border-purple-300 dark:hover:border-purple-900 transition-colors flex flex-col justify-between select-none">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 font-sans">
                        반도체 투톱 <span className="text-[9px] font-mono text-muted-foreground">KOSPI 합산 비중</span>
                      </span>
                      <span className="text-[9px] font-bold text-purple-500 bg-purple-500/5 border border-purple-500/20 px-1 rounded-none">반도체 쏠림도</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed mb-4 font-sans">
                      시총: {formatTrillion(data.samsung.marketCap + data.hynix.marketCap)} / 거래대금: {formatTrillion(data.samsung.volumeAmount + data.hynix.volumeAmount)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* 시총 지분율 */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span className="text-muted-foreground">코스피 전체 시총 대비 (합산)</span>
                        <span className="font-bold text-foreground">{data.combined.marketCapPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary overflow-hidden rounded-none">
                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${Math.min(data.combined.marketCapPercent, 100)}%` }}></div>
                      </div>
                    </div>

                    {/* 거래대금 지분율 */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span className="text-muted-foreground">코스피 전체 거래대금 대비 (합산)</span>
                        <span className="font-bold text-foreground">{data.combined.volumeAmountPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary overflow-hidden rounded-none">
                        <div className="h-full bg-purple-400 transition-all duration-500" style={{ width: `${Math.min(data.combined.volumeAmountPercent, 100)}%` }}></div>
                      </div>
                    </div>

                    {/* 거래대금 / 시총 비율 */}
                    <div className="pt-1.5 border-t border-border/40 flex justify-between items-center text-[10px] font-mono">
                      <span className="text-muted-foreground">당일 거래대금 / 시가총액 비율 (합산)</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{data.combined.volumeToCapRatio.toFixed(4)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
