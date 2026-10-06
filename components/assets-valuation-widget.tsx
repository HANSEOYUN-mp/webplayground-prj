"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  Coins, 
  Calendar,
  Layers,
  Droplet,
  Landmark
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from "recharts";

interface AssetHistoryPoint {
  date: string;
  price: number;
}

interface AssetValuationData {
  key: string;
  symbol: string;
  name: string;
  unit: string;
  currentPrice: number;
  prevClose: number;
  change: number;
  changePercent: number;
  mean3y: number;
  disparity: number;
  isBuyZone: boolean;
  high3y: number;
  low3y: number;
  dataPoints: number;
  history: AssetHistoryPoint[];
  error?: string;
}

interface ApiResponse {
  assets: Record<string, AssetValuationData>;
  assetKeys: string[];
  updatedAt: string;
  error?: string;
}

function formatPrice(val: number, key: string) {
  if (val === undefined || val === null || isNaN(val)) return "-";
  if (key === "USDKRW" || key === "JPYKRW") {
    return new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + "원";
  }
  if (key === "BTC") {
    return "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
  }
  if (key === "TLT" || key === "GOLD" || key === "WTI") {
    return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }
  return val.toLocaleString();
}

function formatChartDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length >= 2) {
    return `${parts[0].slice(2)}.${parts[1]}`;
  }
  return dateStr;
}

const ASSET_ICONS: Record<string, React.ReactNode> = {
  USDKRW: <DollarSign className="w-3.5 h-3.5 text-emerald-500" />,
  JPYKRW: <span className="text-[11px] font-bold text-cyan-500">¥</span>,
  BTC: <Coins className="w-3.5 h-3.5 text-amber-500" />,
  TLT: <Landmark className="w-3.5 h-3.5 text-blue-500" />,
  GOLD: <Layers className="w-3.5 h-3.5 text-yellow-500" />,
  WTI: <Droplet className="w-3.5 h-3.5 text-orange-500" />
};

export function AssetsValuationWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeKey, setActiveKey] = useState<string>("USDKRW");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async (bypass = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const url = bypass ? "/api/stocks/assets-valuation?bypassCache=true" : "/api/stocks/assets-valuation";
      const res = await fetch(url);
      if (!res.ok) throw new Error("3년 자산 밸류에이션 데이터를 가져오지 못했습니다.");
      const json: ApiResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeAsset = data?.assets?.[activeKey];
  const isBuy = activeAsset?.isBuyZone ?? false;

  return (
    <div className="w-full flex flex-col h-[520px] bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans select-text cursor-text">
          <TrendingDown className="w-3.5 h-3.5 text-emerald-500" /> 주요 자산 3년 평균가 & BUY Zone 밸류에이션
        </span>
        
        <div className="flex items-center gap-2 select-none">
          <span className="stamp-red text-[8.5px] px-1.5 py-0.5 border border-primary/20 bg-primary/5 text-primary">
            3년 장기 가치평가 • 12시간 주기
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
      </div>

      {/* 상단 6대 자산 요약 시그널 카드 바 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-border/20 border-b border-border/30 bg-secondary/20 shrink-0">
        {data?.assetKeys?.map((key) => {
          const asset = data.assets[key];
          if (!asset) return null;
          const isSelected = activeKey === key;
          const buyZone = asset.isBuyZone;

          return (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              className={`p-2.5 text-left flex flex-col justify-between transition-all relative ${
                isSelected 
                  ? "bg-card shadow-inner border-b-2 border-primary" 
                  : "hover:bg-secondary/40"
              }`}
            >
              {/* 상단: 자산명 + BUY/OVERVALUED 뱃지 */}
              <div className="flex items-center justify-between gap-1 w-full mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  {ASSET_ICONS[key]}
                  <span className="text-[10px] font-bold text-foreground/90 truncate font-sans">{asset.name}</span>
                </div>
                {buyZone ? (
                  <span className="text-[8px] font-extrabold px-1 py-0.2 rounded-none bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> BUY
                  </span>
                ) : (
                  <span className="text-[8px] font-bold px-1 py-0.2 rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                    HIGH
                  </span>
                )}
              </div>

              {/* 현재가 & 괴리율 */}
              <div className="flex items-baseline justify-between gap-1 w-full">
                <span className="text-[13px] font-black font-mono text-foreground tracking-tight">
                  {formatPrice(asset.currentPrice, key)}
                </span>
                <span className={`text-[9px] font-mono font-extrabold ${buyZone ? "text-emerald-500" : "text-amber-500"}`}>
                  {asset.disparity >= 0 ? "+" : ""}{asset.disparity}%
                </span>
              </div>

              {/* 3년 평균가 */}
              <div className="text-[8.5px] text-muted-foreground font-mono mt-0.5 flex justify-between">
                <span>3년 평균:</span>
                <span className="font-semibold text-foreground/70">{formatPrice(asset.mean3y, key)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 본문 콘텐츠 (3년 차트 & BUY Zone 음영) */}
      <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden relative bg-card">
        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground font-sans">3년치 시세 및 평균선 분석 중...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-500 p-4">
            <AlertCircle className="w-6 h-6" />
            <span className="text-[11px] text-center font-sans">{error}</span>
            <button onClick={() => fetchData(true)} className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold transition-colors">
              다시 시도
            </button>
          </div>
        ) : !activeAsset || activeAsset.error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-[11px]">
            {activeAsset?.error || "해당 자산의 시세 데이터를 불러올 수 없습니다."}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between h-full gap-3 overflow-hidden">
            
            {/* 선택 자산 밸류에이션 요약 헤더 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/10 pb-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-extrabold text-foreground font-sans flex items-center gap-1.5">
                  {ASSET_ICONS[activeKey]} {activeAsset.name}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[18px] font-black font-mono text-foreground">
                    {formatPrice(activeAsset.currentPrice, activeKey)}
                  </span>
                  <span className={`text-[11px] font-bold font-mono ${activeAsset.change >= 0 ? "text-red-500" : "text-blue-500"}`}>
                    {activeAsset.change >= 0 ? "▲" : "▼"} {Math.abs(activeAsset.change)} ({activeAsset.changePercent >= 0 ? "+" : ""}{activeAsset.changePercent}%)
                  </span>
                </div>
              </div>

              {/* 3년 평균 대비 분석 배너 */}
              <div className="flex items-center gap-3 text-[10px] font-mono bg-secondary/30 px-3 py-1 border border-border/20">
                <div>
                  <span className="text-muted-foreground">3년 평균가: </span>
                  <strong className="text-foreground">{formatPrice(activeAsset.mean3y, activeKey)}</strong>
                </div>
                <div className="border-l border-border/30 pl-3">
                  <span className="text-muted-foreground">괴리율: </span>
                  <strong className={isBuy ? "text-emerald-500" : "text-amber-500"}>
                    {activeAsset.disparity >= 0 ? "+" : ""}{activeAsset.disparity}% ({isBuy ? "평균 이하 저평가" : "평균 이상 고평가"})
                  </strong>
                </div>
                {isBuy && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    🟢 BUY ZONE 진입
                  </span>
                )}
              </div>
            </div>

            {/* 3년 일봉 + 3년 평균선 Area 차트 */}
            <div className="flex-1 w-full bg-neutral-900/5 dark:bg-black/20 border border-border/10 p-2 rounded-sm relative min-h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeAsset.history} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`grad-val-${activeKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isBuy ? "#10b981" : "#f59e0b"} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={isBuy ? "#10b981" : "#f59e0b"} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 8, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 8, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatPrice(val, activeKey)}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: "10px",
                      background: "rgba(255, 255, 255, 0.98)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      color: "#111",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                    labelFormatter={(label) => `일자: ${label}`}
                    formatter={(value: any) => [
                      formatPrice(Number(value), activeKey),
                      "가격"
                    ]}
                  />

                  {/* 3년 평균선 (점선) */}
                  <ReferenceLine
                    y={activeAsset.mean3y}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `3년 평균: ${formatPrice(activeAsset.mean3y, activeKey)}`,
                      position: "insideTopRight",
                      fill: "#ef4444",
                      fontSize: 9,
                      fontWeight: "bold"
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={isBuy ? "#10b981" : "#f59e0b"}
                    strokeWidth={1.8}
                    fill={`url(#grad-val-${activeKey})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 하단 메타 통계 바 */}
            <div className="border-t border-border/20 pt-1.5 flex flex-wrap items-center justify-between text-[8.5px] font-mono text-muted-foreground shrink-0 leading-none select-none">
              <div className="flex items-center gap-4">
                <span>3년 최고: <strong className="text-foreground">{formatPrice(activeAsset.high3y, activeKey)}</strong></span>
                <span>3년 최저: <strong className="text-foreground">{formatPrice(activeAsset.low3y, activeKey)}</strong></span>
                <span>분석 데이터: <strong className="text-foreground">{activeAsset.dataPoints}개 일봉</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                <span>3년 일봉 종가 기준 • 붉은 점선: 3년 산술평균선 • 출처: Yahoo Finance</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
