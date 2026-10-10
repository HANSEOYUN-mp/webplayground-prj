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
    gold: IndicatorSummary;
  };
  history: MacroDataPoint[];
  updatedAt: string;
}

type Period = "5Y" | "10Y" | "20Y" | "50Y";
type ViewMode = "ALL" | "RATES" | "GOLD";

interface LineConfig {
  key: keyof Omit<MacroDataPoint, "date">;
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
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
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

  const lineConfigs = useMemo<Record<keyof Omit<MacroDataPoint, "date">, LineConfig>>(() => ({
    dgs10: {
      key: "dgs10",
      label: "국채 10년물",
      color: isDark ? "#9ca3af" : "#9ca3af", // 회색
      yAxisId: "left",
      unit: "%",
      strokeWidth: 1.8
    },
    dgs20: {
      key: "dgs20",
      label: "국채 20년물",
      color: isDark ? "#cbd5e1" : "#4b5563", // 진회색
      yAxisId: "left",
      unit: "%",
      strokeWidth: 2
    },
    dgs30: {
      key: "dgs30",
      label: "국채 30년물",
      color: isDark ? "#ffffff" : "#111827", // 검은색 (다크: 화이트)
      yAxisId: "left",
      unit: "%",
      strokeWidth: 2.4
    },
    fedfunds: {
      key: "fedfunds",
      label: "기준금리",
      color: "#ef4444", // 빨간색
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
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    dgs10: true,
    dgs20: true,
    dgs30: true,
    fedfunds: true,
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

  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isLineActive = (key: keyof typeof lineConfigs) => {
    if (!visibleLines[key]) return false;
    if (viewMode === "RATES") return key !== "gold";
    if (viewMode === "GOLD") return key === "gold";
    return true;
  };

  return (
    <div
      className={`w-full bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 flex flex-col ${
        isExpanded ? "h-[520px]" : "h-[37px]"
      }`}
    >
      {/* 헤더 */}
      <div
        className={`flex items-center justify-between bg-secondary/50 px-4 py-2 ${
          isExpanded ? "border-b border-border" : ""
        } shrink-0 select-none`}
      >
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans select-text cursor-text">
          <Landmark className="w-3.5 h-3.5 text-black dark:text-white" /> 미국 국채 10·20·30Y · 기준금리 & 금(Gold) 50년 추이
        </span>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <>
              {/* 뷰 모드 탭 (전체/금리만/금만) */}
              <div className="hidden sm:flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
                <button
                  onClick={() => setViewMode("ALL")}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    viewMode === "ALL" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  전체 (이중축)
                </button>
                <button
                  onClick={() => setViewMode("RATES")}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    viewMode === "RATES" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  금리만 (%)
                </button>
                <button
                  onClick={() => setViewMode("GOLD")}
                  className={`px-2 py-0.5 text-[9px] font-bold transition-all ${
                    viewMode === "GOLD" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  금 (Gold)만 ($)
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
          {/* 상단 5대 지표 요약 바 (클릭 시 차트 선 켜기/끄기) */}
          {data?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border/20 border-b border-border/30 bg-secondary/20 shrink-0 select-none">
              {(Object.keys(lineConfigs) as (keyof typeof lineConfigs)[]).map((k) => {
                const cfg = lineConfigs[k];
                const item = data.summary[k];
                const active = isLineActive(k);

                return (
                  <button
                    key={k}
                    onClick={() => toggleLine(k)}
                    className={`p-2 text-left flex flex-col justify-between transition-all ${
                      active ? "bg-card shadow-inner" : "opacity-45 hover:opacity-75 bg-secondary/40"
                    }`}
                    title="클릭하여 차트에서 표시/숨기기"
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className="text-[10px] font-bold text-foreground/90 truncate font-sans">
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-muted-foreground/60">{cfg.unit}</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-1 w-full">
                      <span className="text-[13px] font-black font-mono text-foreground tracking-tight">
                        {k === "gold"
                          ? `$${item.current.toLocaleString()}`
                          : `${item.current.toFixed(2)}%`}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-extrabold ${
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
                  20년치 미국채 및 금 시세 데이터 로딩 중...
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
                <div className="flex-1 w-full min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredHistory}
                      margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
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
                        yAxisId="left"
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 9, fill: "#888888" }}
                        tickLine={false}
                        axisLine={{ stroke: "#88888830" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      {/* 우측 Y축: 금 가격 ($) */}
                      {isLineActive("gold") && (
                        <YAxis
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

                      {/* 국채 10년물 */}
                      {isLineActive("dgs10") && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="dgs10"
                          name="국채 10년물"
                          stroke={lineConfigs.dgs10.color}
                          strokeWidth={lineConfigs.dgs10.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                        />
                      )}
                      {/* 국채 20년물 */}
                      {isLineActive("dgs20") && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="dgs20"
                          name="국채 20년물"
                          stroke={lineConfigs.dgs20.color}
                          strokeWidth={lineConfigs.dgs20.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                        />
                      )}
                      {/* 국채 30년물 */}
                      {isLineActive("dgs30") && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="dgs30"
                          name="국채 30년물"
                          stroke={lineConfigs.dgs30.color}
                          strokeWidth={lineConfigs.dgs30.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                        />
                      )}
                      {/* 기준금리 */}
                      {isLineActive("fedfunds") && (
                        <Line
                          yAxisId="left"
                          type="stepAfter"
                          dataKey="fedfunds"
                          name="기준금리"
                          stroke={lineConfigs.fedfunds.color}
                          strokeWidth={lineConfigs.fedfunds.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                        />
                      )}
                      {/* 금 (Gold) */}
                      {isLineActive("gold") && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="gold"
                          name="금 (Gold)"
                          stroke={lineConfigs.gold.color}
                          strokeWidth={lineConfigs.gold.strokeWidth}
                          dot={false}
                          activeDot={{ r: 4 }}
                          connectNulls={true}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 하단 메타/설명 바 */}
                <div className="border-t border-border/20 pt-1.5 mt-1 flex flex-wrap items-center justify-between text-[8.5px] font-mono text-muted-foreground shrink-0 leading-none select-none gap-2">
                  <span>
                    좌축: 국채 금리·기준금리 (%) | 우축: 국제 금 가격 ($) • 상단 카드를 클릭하여 지표별 On/Off
                  </span>
                  <span>출처: 미국 세인트루이스 연방준비은행 (FRED) &amp; Yahoo Finance</span>
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
