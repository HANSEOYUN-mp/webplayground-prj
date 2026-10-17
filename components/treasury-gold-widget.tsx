"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUp, RefreshCw, AlertCircle, Coins, Landmark, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

interface MacroDataPoint {
  date: string;
  dgs10?: number;
  dgs20?: number;
  dgs30?: number;
  fedfunds?: number;
  kr10y?: number;
  krbase?: number;
  gold?: number;
}

interface IndicatorSummary {
  name: string;
  current: number;
  prev: number;
  change: number;
  changePercent: number;
  unit: string;
}

interface ApiResponse {
  summary: {
    dgs10: IndicatorSummary;
    dgs20: IndicatorSummary;
    dgs30: IndicatorSummary;
    fedfunds: IndicatorSummary;
    kr10y: IndicatorSummary;
    krbase: IndicatorSummary;
    gold: IndicatorSummary;
  };
  history: MacroDataPoint[];
  updatedAt: string;
}

type Period = "5Y" | "10Y" | "20Y" | "50Y";
type LineKey = keyof Omit<MacroDataPoint, "date">;

interface LineConfig {
  key: LineKey;
  label: string;
  color: string;
  yAxisId: "left" | "right";
  unit: string;
  strokeWidth: number;
}

export function TreasuryGoldWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // 디폴트 접힌 상태

  const [period, setPeriod] = useState<Period>("20Y");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const lineConfigs = useMemo<Record<LineKey, LineConfig>>(() => ({
    dgs10: {
      key: "dgs10",
      label: "미국채 10년물",
      color: isDark ? "#9ca3af" : "#9ca3af", // 회색
      yAxisId: "left",
      unit: "%",
      strokeWidth: 1.8
    },
    dgs20: {
      key: "dgs20",
      label: "미국채 20년물",
      color: isDark ? "#cbd5e1" : "#4b5563", // 진회색
      yAxisId: "left",
      unit: "%",
      strokeWidth: 2
    },
    dgs30: {
      key: "dgs30",
      label: "미국채 30년물",
      color: isDark ? "#ffffff" : "#111827", // 검은색 (다크: 화이트)
      yAxisId: "left",
      unit: "%",
      strokeWidth: 2.4
    },
    fedfunds: {
      key: "fedfunds",
      label: "미국 기준금리",
      color: "#ef4444", // 빨간색
      yAxisId: "left",
      unit: "%",
      strokeWidth: 2.5
    },
    kr10y: {
      key: "kr10y",
      label: "한국 국고채 10Y",
      color: "#84cc16", // 연두색 (Lime)
      yAxisId: "left",
      unit: "%",
      strokeWidth: 2.2
    },
    krbase: {
      key: "krbase",
      label: "한국은행 기준금리",
      color: "#16a34a", // 초록색 (Green)
      yAxisId: "left",
      unit: "%",
      strokeWidth: 2.5
    },
    gold: {
      key: "gold",
      label: "금 (Gold)",
      color: "#f59e0b", // 골드
      yAxisId: "right",
      unit: "$",
      strokeWidth: 2.5
    }
  }), [isDark]);

  // 개별 라인 표시 토글 상태
  const [visibleLines, setVisibleLines] = useState<Record<LineKey, boolean>>({
    dgs10: true,
    dgs20: true,
    dgs30: true,
    fedfunds: true,
    kr10y: true,
    krbase: true,
    gold: true
  });

  const fetchData = useCallback(async (bypass = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const url = bypass ? "/api/stocks/treasury-gold?bypassCache=true" : "/api/stocks/treasury-gold";
      const res = await fetch(url);
      if (!res.ok) throw new Error("데이터를 가져오는 데 실패했습니다.");
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 기간에 따른 필터링 데이터
  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    const count = data.history.length;
    let sliceMonths = count;
    if (period === "5Y") sliceMonths = 60;
    else if (period === "10Y") sliceMonths = 120;
    else if (period === "20Y") sliceMonths = 240;
    else if (period === "50Y") sliceMonths = count; // 50년 (전체)
    return data.history.slice(-sliceMonths);
  }, [data?.history, period]);

  const toggleLine = (key: LineKey) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const applyPreset = (activeKeys: LineKey[]) => {
    const next: Record<LineKey, boolean> = {
      dgs10: false,
      dgs20: false,
      dgs30: false,
      fedfunds: false,
      kr10y: false,
      krbase: false,
      gold: false
    };
    activeKeys.forEach((k) => {
      next[k] = true;
    });
    setVisibleLines(next);
  };

  const isLineActive = (key: LineKey) => !!visibleLines[key];

  const allKeys: LineKey[] = ["dgs10", "dgs20", "dgs30", "fedfunds", "kr10y", "krbase", "gold"];
  const activeCount = allKeys.filter((k) => visibleLines[k]).length;

  return (
    <div
      className={`w-full bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col ${
        isExpanded ? "h-[545px]" : "h-[37px]"
      }`}
    >
      {/* 헤더 */}
      <div
        className={`flex items-center justify-between bg-secondary/50 px-4 py-2 ${
          isExpanded ? "border-b border-border" : ""
        } shrink-0 select-none`}
      >
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans select-text cursor-text">
          <Landmark className="w-3.5 h-3.5 text-black dark:text-white" /> 미국 국채 10·20·30Y · 한국 국고채 10Y · 한·미 기준금리 & 금(Gold) 50년 추이
        </span>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <>
              {/* 빠른 프리셋 ON/OFF 버튼 */}
              <div className="hidden sm:flex bg-secondary/80 border border-border/60 p-0.5 rounded-none gap-0.5">
                <button
                  onClick={() => applyPreset(["dgs10", "dgs20", "dgs30", "fedfunds", "kr10y", "krbase", "gold"])}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    activeCount === allKeys.length
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  전체 ON
                </button>
                <button
                  onClick={() => applyPreset([])}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    activeCount === 0
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  전체 OFF
                </button>
                <button
                  onClick={() => applyPreset(["dgs10", "fedfunds", "kr10y", "krbase"])}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    visibleLines.dgs10 &&
                    visibleLines.fedfunds &&
                    visibleLines.kr10y &&
                    visibleLines.krbase &&
                    !visibleLines.dgs20 &&
                    !visibleLines.dgs30 &&
                    !visibleLines.gold
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  한·미 핵심금리
                </button>
                <button
                  onClick={() => applyPreset(["dgs10", "dgs20", "dgs30", "fedfunds"])}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    visibleLines.dgs10 &&
                    visibleLines.dgs20 &&
                    visibleLines.dgs30 &&
                    visibleLines.fedfunds &&
                    !visibleLines.kr10y &&
                    !visibleLines.krbase &&
                    !visibleLines.gold
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  미국 금리만
                </button>
                <button
                  onClick={() => applyPreset(["kr10y", "krbase"])}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    visibleLines.kr10y &&
                    visibleLines.krbase &&
                    activeCount === 2
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  한국 금리만
                </button>
                <button
                  onClick={() => applyPreset(["gold"])}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    visibleLines.gold && activeCount === 1
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  금(Gold)만
                </button>
              </div>

              {/* 기간 선택 (5Y, 10Y, 20Y, 50Y) */}
              <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
                {(["5Y", "10Y", "20Y", "50Y"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                      period === p ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "50Y" ? "50년 (전체)" : p === "20Y" ? "20년" : p === "10Y" ? "10년" : "5년"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className={`p-1 text-muted-foreground hover:text-black dark:hover:text-white transition-colors duration-200 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                title="데이터 새로고침"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-0.5 text-[8.5px] font-extrabold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-none transition-colors select-none mr-1"
          >
            {isExpanded ? "접기 ▲" : "펼치기 ▼"}
          </button>
        </div>
      </div>

      {/* 펼쳐졌을 때의 본문 */}
      {isExpanded && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* 상단 7대 지표 요약 & 개별 ON/OFF 토글 카드 바 */}
          {data?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 divide-x divide-y sm:divide-y-0 divide-border/20 border-b border-border/30 bg-secondary/20 shrink-0 select-none">
              {(Object.keys(lineConfigs) as LineKey[]).map((k) => {
                const cfg = lineConfigs[k];
                const item = data.summary[k];
                if (!item) return null;
                const active = isLineActive(k);

                return (
                  <button
                    key={k}
                    onClick={() => toggleLine(k)}
                    style={{
                      borderTop: active ? `2.5px solid ${cfg.color}` : "2.5px solid transparent"
                    }}
                    className={`p-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                      active
                        ? "bg-card shadow-inner hover:bg-secondary/30"
                        : "opacity-45 hover:opacity-80 bg-secondary/40"
                    }`}
                    title={`${cfg.label} 그래프 ${active ? "끄기 (OFF)" : "켜기 (ON)"}`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: active ? cfg.color : "#9ca3af" }}
                        />
                        <span
                          className={`text-[10px] font-bold truncate font-sans ${
                            active ? "text-foreground/95" : "text-muted-foreground line-through"
                          }`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <span
                        className={`px-1 py-0.2 text-[7.5px] font-mono font-extrabold border leading-tight shrink-0 ${
                          active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-secondary text-muted-foreground border-border/50"
                        }`}
                      >
                        {active ? "ON" : "OFF"}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-1 w-full">
                      <span className="text-[12.5px] font-black font-mono text-foreground tracking-tight">
                        {k === "gold"
                          ? `$${item.current.toLocaleString()}`
                          : `${item.current.toFixed(2)}%`}
                      </span>
                      <span
                        className={`text-[8.5px] font-mono font-extrabold ${
                          item.change >= 0 ? "text-red-500" : "text-blue-500"
                        }`}
                      >
                        {item.change >= 0 ? "+" : ""}
                        {k === "gold" ? `$${item.change.toFixed(1)}` : `${item.change.toFixed(2)}%p`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 차트 영역 */}
          <div className="flex-1 p-3.5 relative overflow-hidden bg-card flex flex-col justify-between">
            {loading && !data ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[10px] text-muted-foreground font-sans">
                  한·미 국채, 기준금리 및 금 시세 데이터 로딩 중...
                </span>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-500 p-4">
                <AlertCircle className="w-6 h-6" />
                <span className="text-[11px] text-center font-sans">{error}</span>
                <button
                  onClick={() => fetchData(true)}
                  className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-bold transition-colors"
                >
                  다시 시도
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 w-full min-h-[260px] relative">
                  {activeCount === 0 && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-[1px]">
                      <span className="text-[11px] font-bold text-muted-foreground font-sans">
                        상단 지표 카드를 클릭하거나 프리셋을 선택하여 그래프를 켜주세요 (ON)
                      </span>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredHistory}
                      margin={{
                        top: 10,
                        right: 15,
                        left:
                          visibleLines.dgs10 ||
                          visibleLines.dgs20 ||
                          visibleLines.dgs30 ||
                          visibleLines.fedfunds ||
                          visibleLines.kr10y ||
                          visibleLines.krbase
                            ? -15
                            : 5,
                        bottom: 0
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: "#888888" }}
                        tickLine={false}
                        axisLine={{ stroke: "#88888830" }}
                        minTickGap={28}
                      />
                      {/* 좌측 Y축: 금리 (%) */}
                      <YAxis
                        key="yaxis-left"
                        yAxisId="left"
                        hide={
                          !(
                            visibleLines.dgs10 ||
                            visibleLines.dgs20 ||
                            visibleLines.dgs30 ||
                            visibleLines.fedfunds ||
                            visibleLines.kr10y ||
                            visibleLines.krbase
                          )
                        }
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 9, fill: "#888888" }}
                        tickLine={false}
                        axisLine={{ stroke: "#88888830" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      {/* 우측 Y축: 금 가격 ($) */}
                      {isLineActive("gold") && (
                        <YAxis
                          key="yaxis-right"
                          yAxisId="right"
                          orientation="right"
                          domain={["auto", "auto"]}
                          tick={{ fontSize: 9, fill: "#f59e0b" }}
                          tickLine={false}
                          axisLine={{ stroke: "#f59e0b40" }}
                          tickFormatter={(v) => `$${v}`}
                        />
                      )}

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0px",
                          fontSize: "11px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                        }}
                        labelStyle={{ fontWeight: "bold", color: "hsl(var(--foreground))", marginBottom: "4px" }}
                        formatter={(val: any, name: any) => {
                          const num = Number(val);
                          if (name === "gold" || name === "금 (Gold)") {
                            return [`$${num.toLocaleString()} / oz`, "국제 금 시세"];
                          }
                          const cfg = Object.values(lineConfigs).find((c) => c.key === name || c.label === name);
                          return [`${num.toFixed(2)}%`, cfg?.label || name];
                        }}
                      />

                      {/* 미국채 10년물 */}
                      {isLineActive("dgs10") && (
                        <Line
                          key="dgs10"
                          yAxisId="left"
                          type="monotone"
                          dataKey="dgs10"
                          name="미국채 10년물"
                          stroke={lineConfigs.dgs10.color}
                          strokeWidth={lineConfigs.dgs10.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      )}
                      {/* 미국채 20년물 */}
                      {isLineActive("dgs20") && (
                        <Line
                          key="dgs20"
                          yAxisId="left"
                          type="monotone"
                          dataKey="dgs20"
                          name="미국채 20년물"
                          stroke={lineConfigs.dgs20.color}
                          strokeWidth={lineConfigs.dgs20.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      )}
                      {/* 미국채 30년물 */}
                      {isLineActive("dgs30") && (
                        <Line
                          key="dgs30"
                          yAxisId="left"
                          type="monotone"
                          dataKey="dgs30"
                          name="미국채 30년물"
                          stroke={lineConfigs.dgs30.color}
                          strokeWidth={lineConfigs.dgs30.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      )}
                      {/* 미국 기준금리 */}
                      {isLineActive("fedfunds") && (
                        <Line
                          key="fedfunds"
                          yAxisId="left"
                          type="stepAfter"
                          dataKey="fedfunds"
                          name="미국 기준금리"
                          stroke={lineConfigs.fedfunds.color}
                          strokeWidth={lineConfigs.fedfunds.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      )}
                      {/* 한국 국고채 10년물 (연두색) */}
                      {isLineActive("kr10y") && (
                        <Line
                          key="kr10y"
                          yAxisId="left"
                          type="monotone"
                          dataKey="kr10y"
                          name="한국 국고채 10Y"
                          stroke={lineConfigs.kr10y.color}
                          strokeWidth={lineConfigs.kr10y.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      )}
                      {/* 한국은행 기준금리 (초록색) */}
                      {isLineActive("krbase") && (
                        <Line
                          key="krbase"
                          yAxisId="left"
                          type="stepAfter"
                          dataKey="krbase"
                          name="한국은행 기준금리"
                          stroke={lineConfigs.krbase.color}
                          strokeWidth={lineConfigs.krbase.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      )}
                      {/* 금 (Gold) */}
                      {isLineActive("gold") && (
                        <Line
                          key="gold"
                          yAxisId="right"
                          type="monotone"
                          dataKey="gold"
                          name="금 (Gold)"
                          stroke={lineConfigs.gold.color}
                          strokeWidth={lineConfigs.gold.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 하단 메타/설명 바 */}
                <div className="border-t border-border/20 pt-1.5 mt-1 flex flex-wrap items-center justify-between text-[8.5px] font-mono text-muted-foreground shrink-0 leading-none select-none gap-2">
                  <span>
                    좌축: 한·미 국채 및 기준금리 (%) | 우축: 국제 금 가격 ($) • 상단 카드를 클릭하여 지표별 On/Off
                  </span>
                  <span>출처: 미국 세인트루이스 연방준비은행 (FRED · OECD) &amp; Yahoo Finance</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default TreasuryGoldWidget;
