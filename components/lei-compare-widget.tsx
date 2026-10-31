"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface LeiDataPoint {
  date: string; // YYYY-MM
  us?: number;
  kr?: number;
  diff?: number;
}

interface LeiCountrySummary {
  seriesId: string;
  country: string;
  latestDate: string;
  current: number;
  prev: number;
  changeMom: number;
  changeYoy: number;
  phase: "expansion" | "slowdown" | "downturn" | "recovery";
  phaseLabel: string;
}

interface LeiApiResponse {
  summary: {
    us: LeiCountrySummary;
    kr: LeiCountrySummary;
  };
  history: LeiDataPoint[];
  updatedAt: string;
}

type Period = "1Y" | "3Y" | "5Y" | "10Y" | "20Y" | "ALL";

function formatYmShort(ym: string) {
  if (!ym) return "";
  const parts = ym.split("-");
  if (parts.length >= 2) {
    return `${parts[0].slice(2)}.${parts[1]}`;
  }
  return ym;
}

function formatYmKorean(ym: string) {
  if (!ym) return "";
  const parts = ym.split("-");
  if (parts.length >= 2) {
    return `${parts[0]}년 ${parts[1]}월`;
  }
  return ym;
}

function getPhaseStyle(phase: LeiCountrySummary["phase"]) {
  switch (phase) {
    case "expansion":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
    case "slowdown":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "recovery":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "downturn":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  }
}

export function LeiCompareWidget() {
  const [data, setData] = useState<LeiApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("5Y");
  const [visibleLines, setVisibleLines] = useState<{ us: boolean; kr: boolean }>({
    us: true,
    kr: true,
  });

  const fetchData = useCallback(async (bypass = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const url = bypass ? "/api/fred/lei?bypassCache=true" : "/api/fred/lei";
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || "경기선행지수 데이터를 불러오지 못했습니다.");
      }
      setData(json);
    } catch (e: any) {
      setError(e.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    const total = data.history.length;
    let months = total;
    if (period === "1Y") months = 12;
    else if (period === "3Y") months = 36;
    else if (period === "5Y") months = 60;
    else if (period === "10Y") months = 120;
    else if (period === "20Y") months = 240;
    return data.history.slice(-months);
  }, [data?.history, period]);

  const yDomain = useMemo<[number, number]>(() => {
    if (filteredHistory.length === 0) return [96, 104];
    const vals: number[] = [100];
    for (const pt of filteredHistory) {
      if (visibleLines.us && typeof pt.us === "number") vals.push(pt.us);
      if (visibleLines.kr && typeof pt.kr === "number") vals.push(pt.kr);
    }
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const pad = Math.max((maxVal - minVal) * 0.15, 0.4);
    return [
      Math.floor((minVal - pad) * 10) / 10,
      Math.ceil((maxVal + pad) * 10) / 10,
    ];
  }, [filteredHistory, visibleLines]);

  const recent12Months = useMemo(() => {
    if (!data?.history) return [];
    return [...data.history].slice(-12).reverse();
  }, [data?.history]);

  const toggleCountry = (key: "us" | "kr") => {
    setVisibleLines((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.us && !next.kr) return prev; // 최소 1개는 유지
      return next;
    });
  };

  return (
    <div className="w-full flex flex-col bg-card border border-border overflow-hidden transition-colors duration-300">
      {/* 상단 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/50 px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-[12px] font-bold text-foreground tracking-wider font-sans">
            한·미 경기선행지수 (OECD CLI) 월별 시계열 비교
          </span>
          <span className="hidden sm:inline-block text-[9.5px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 border border-border/60">
            기준선 = 100.0 (장기 추세)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* 라인 표시 프리셋 */}
          <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
            <button
              onClick={() => setVisibleLines({ us: true, kr: true })}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                visibleLines.us && visibleLines.kr
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              한·미 동시 비교
            </button>
            <button
              onClick={() => setVisibleLines({ us: true, kr: false })}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                visibleLines.us && !visibleLines.kr
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              미국만
            </button>
            <button
              onClick={() => setVisibleLines({ us: false, kr: true })}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                !visibleLines.us && visibleLines.kr
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              한국만
            </button>
          </div>

          {/* 조회 기간 탭 */}
          <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
            {(
              [
                { key: "1Y", label: "1년" },
                { key: "3Y", label: "3년" },
                { key: "5Y", label: "5년" },
                { key: "10Y", label: "10년" },
                { key: "20Y", label: "20년" },
                { key: "ALL", label: "전체(1990~)" },
              ] as { key: Period; label: string }[]
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                  period === p.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="새로고침"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-muted-foreground ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4 flex flex-col gap-5">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center min-h-[380px] gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[11px] text-muted-foreground font-mono">
              FRED에서 한·미 경기선행지수 월별 시계열 데이터를 불러오는 중...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] text-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <span className="text-[11px] text-red-500 font-bold">{error}</span>
            <button
              onClick={() => fetchData(true)}
              className="mt-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-[10px] font-bold"
            >
              다시 시도
            </button>
          </div>
        ) : data ? (
          <>
            {/* 상단 요약 카드 3개 (미국 / 한국 / 한·미 스프레드 및 국면 비교) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 미국 카드 */}
              <div
                onClick={() => toggleCountry("us")}
                style={{
                  borderTop: visibleLines.us
                    ? "3px solid #3b82f6"
                    : "3px solid transparent",
                }}
                className={`p-3.5 border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 ${
                  !visibleLines.us ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[12px] font-bold text-foreground font-sans">
                      미국 경기선행지수 (US CLI)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatYmKorean(data.summary.us.latestDate)} 기준
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-[22px] font-black font-mono text-foreground tracking-tight">
                    {data.summary.us.current.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span
                      className={`font-bold flex items-center gap-0.5 ${
                        data.summary.us.changeMom >= 0
                          ? "text-red-500"
                          : "text-blue-500"
                      }`}
                    >
                      {data.summary.us.changeMom >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      전월비 {data.summary.us.changeMom >= 0 ? "+" : ""}
                      {data.summary.us.changeMom.toFixed(2)}p
                    </span>
                    <span className="text-muted-foreground">
                      (전년비 {data.summary.us.changeYoy >= 0 ? "+" : ""}
                      {data.summary.us.changeYoy.toFixed(2)}p)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                  <span
                    className={`px-2 py-0.5 text-[9.5px] font-bold border ${getPhaseStyle(
                      data.summary.us.phase
                    )}`}
                  >
                    {data.summary.us.phaseLabel}
                  </span>
                  <span className="text-[8.5px] font-mono text-muted-foreground">
                    FRED: {data.summary.us.seriesId}
                  </span>
                </div>
              </div>

              {/* 한국 카드 */}
              <div
                onClick={() => toggleCountry("kr")}
                style={{
                  borderTop: visibleLines.kr
                    ? "3px solid #10b981"
                    : "3px solid transparent",
                }}
                className={`p-3.5 border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 ${
                  !visibleLines.kr ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[12px] font-bold text-foreground font-sans">
                      한국 경기선행지수 (KR CLI)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatYmKorean(data.summary.kr.latestDate)} 기준
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-[22px] font-black font-mono text-foreground tracking-tight">
                    {data.summary.kr.current.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span
                      className={`font-bold flex items-center gap-0.5 ${
                        data.summary.kr.changeMom >= 0
                          ? "text-red-500"
                          : "text-blue-500"
                      }`}
                    >
                      {data.summary.kr.changeMom >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      전월비 {data.summary.kr.changeMom >= 0 ? "+" : ""}
                      {data.summary.kr.changeMom.toFixed(2)}p
                    </span>
                    <span className="text-muted-foreground">
                      (전년비 {data.summary.kr.changeYoy >= 0 ? "+" : ""}
                      {data.summary.kr.changeYoy.toFixed(2)}p)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                  <span
                    className={`px-2 py-0.5 text-[9.5px] font-bold border ${getPhaseStyle(
                      data.summary.kr.phase
                    )}`}
                  >
                    {data.summary.kr.phaseLabel}
                  </span>
                  <span className="text-[8.5px] font-mono text-muted-foreground">
                    FRED: {data.summary.kr.seriesId}
                  </span>
                </div>
              </div>

              {/* 한·미 격차 및 기준선 비교 카드 */}
              <div
                style={{ borderTop: "3px solid #6366f1" }}
                className="p-3.5 border border-border/60 bg-secondary/15 flex flex-col justify-between gap-2.5 select-none"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-foreground font-sans">
                    한·미 선행지수 스프레드 (KR - US)
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    기준선 100 대비 편차
                  </span>
                </div>

                {(() => {
                  const spread =
                    Math.round(
                      (data.summary.kr.current - data.summary.us.current) * 100
                    ) / 100;
                  const usGap =
                    Math.round((data.summary.us.current - 100) * 100) / 100;
                  const krGap =
                    Math.round((data.summary.kr.current - 100) * 100) / 100;
                  return (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[22px] font-black font-mono text-foreground tracking-tight">
                          {spread >= 0 ? `+${spread.toFixed(2)}p` : `${spread.toFixed(2)}p`}
                        </span>
                        <span className="text-[10px] font-sans text-muted-foreground">
                          {spread >= 0
                            ? "한국 선행지수가 미국 대비 우위"
                            : "미국 선행지수가 한국 대비 우위"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/20 font-mono text-[9.5px]">
                        <div className="flex items-center justify-between bg-background/60 px-2 py-1 border border-border/30">
                          <span className="text-muted-foreground">미국 vs 100:</span>
                          <span
                            className={`font-bold ${
                              usGap >= 0 ? "text-red-500" : "text-blue-500"
                            }`}
                          >
                            {usGap >= 0 ? `+${usGap.toFixed(2)}` : usGap.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-background/60 px-2 py-1 border border-border/30">
                          <span className="text-muted-foreground">한국 vs 100:</span>
                          <span
                            className={`font-bold ${
                              krGap >= 0 ? "text-red-500" : "text-blue-500"
                            }`}
                          >
                            {krGap >= 0 ? `+${krGap.toFixed(2)}` : krGap.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 메인 월별 시계열 그래프 (X축: 시간, Y축: 선행지수) */}
            <div className="w-full bg-neutral-900/5 dark:bg-black/20 border border-border/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-4 text-[11px] font-bold">
                  {visibleLines.us && (
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <span className="w-3 h-0.5 bg-blue-500 inline-block" /> 미국 경기선행지수 (US)
                    </span>
                  )}
                  {visibleLines.kr && (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> 한국 경기선행지수 (KR)
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-normal text-[10px]">
                    <span className="w-3 border-t border-dashed border-amber-500 inline-block" /> 기준선 100.0 (위: 경기 확장 / 아래: 경기 수축)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  X축: 월별 시계열 ({formatYmShort(filteredHistory[0]?.date)} ~{" "}
                  {formatYmShort(filteredHistory[filteredHistory.length - 1]?.date)}, 총{" "}
                  {filteredHistory.length}개월)
                </span>
              </div>

              <div className="w-full h-[340px] select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredHistory}
                    margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(156, 163, 175, 0.18)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatYmShort}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(156, 163, 175, 0.3)" }}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => Number(val).toFixed(1)}
                    />
                    <ReferenceLine
                      y={100}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "기준선 100.0",
                        position: "insideTopRight",
                        fill: "#f59e0b",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const pt = payload[0]?.payload as LeiDataPoint;
                        return (
                          <div className="bg-card/95 backdrop-blur-sm border border-border shadow-lg p-2.5 text-[10.5px] font-mono min-w-[190px]">
                            <div className="font-bold text-foreground border-b border-border/50 pb-1 mb-1.5 font-sans">
                              📅 {formatYmKorean(String(label))}
                            </div>
                            {visibleLines.us && pt.us !== undefined && (
                              <div className="flex items-center justify-between py-0.5">
                                <span className="text-blue-500 font-bold font-sans">
                                  미국 (US CLI):
                                </span>
                                <span className="font-black text-foreground">
                                  {pt.us.toFixed(2)}{" "}
                                  <span className="text-[9px] text-muted-foreground">
                                    ({pt.us >= 100 ? "+" : ""}
                                    {(pt.us - 100).toFixed(2)})
                                  </span>
                                </span>
                              </div>
                            )}
                            {visibleLines.kr && pt.kr !== undefined && (
                              <div className="flex items-center justify-between py-0.5">
                                <span className="text-emerald-500 font-bold font-sans">
                                  한국 (KR CLI):
                                </span>
                                <span className="font-black text-foreground">
                                  {pt.kr.toFixed(2)}{" "}
                                  <span className="text-[9px] text-muted-foreground">
                                    ({pt.kr >= 100 ? "+" : ""}
                                    {(pt.kr - 100).toFixed(2)})
                                  </span>
                                </span>
                              </div>
                            )}
                            {visibleLines.us &&
                              visibleLines.kr &&
                              pt.diff !== undefined && (
                                <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/40 text-[9.5px] text-muted-foreground">
                                  <span className="font-sans">한·미 격차 (KR-US):</span>
                                  <span className="font-bold text-foreground">
                                    {pt.diff >= 0 ? `+${pt.diff.toFixed(2)}p` : `${pt.diff.toFixed(2)}p`}
                                  </span>
                                </div>
                              )}
                          </div>
                        );
                      }}
                    />
                    {visibleLines.us && (
                      <Line
                        type="monotone"
                        dataKey="us"
                        name="미국 경기선행지수"
                        stroke="#3b82f6"
                        strokeWidth={2.3}
                        dot={period === "1Y" || period === "3Y" ? { r: 2, strokeWidth: 1 } : false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    )}
                    {visibleLines.kr && (
                      <Line
                        type="monotone"
                        dataKey="kr"
                        name="한국 경기선행지수"
                        stroke="#10b981"
                        strokeWidth={2.3}
                        dot={period === "1Y" || period === "3Y" ? { r: 2, strokeWidth: 1 } : false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 하단: 최근 12개월 월별 시계열 수치 비교 테이블 & 지표 해석 가이드 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 최근 12개월 월별 테이블 */}
              <div className="lg:col-span-7 border border-border/50 bg-secondary/10 p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-foreground font-sans">
                    최근 12개월 월별 시계열 추이
                  </span>
                  <span className="text-[9.5px] text-muted-foreground font-mono">
                    단위: Index (100 = 장기추세)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                  <table className="w-full text-[10.5px] font-mono border-collapse">
                    <thead className="sticky top-0 bg-secondary text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-1.5 px-2 text-left font-bold">기준월</th>
                        <th className="py-1.5 px-2 text-right font-bold text-blue-600 dark:text-blue-400">
                          미국 (US)
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          한국 (KR)
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold">
                          격차 (KR-US)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {recent12Months.map((row) => (
                        <tr
                          key={row.date}
                          className="hover:bg-secondary/40 transition-colors"
                        >
                          <td className="py-1.5 px-2 font-bold text-foreground">
                            {row.date}
                          </td>
                          <td className="py-1.5 px-2 text-right text-foreground">
                            {row.us !== undefined ? row.us.toFixed(2) : "-"}
                          </td>
                          <td className="py-1.5 px-2 text-right text-foreground">
                            {row.kr !== undefined ? row.kr.toFixed(2) : "-"}
                          </td>
                          <td
                            className={`py-1.5 px-2 text-right font-bold ${
                              (row.diff ?? 0) >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {row.diff !== undefined
                              ? `${row.diff >= 0 ? "+" : ""}${row.diff.toFixed(2)}p`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 경기선행지수 4국면 해석 가이드 */}
              <div className="lg:col-span-5 border border-border/50 bg-secondary/10 p-3.5 flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-foreground font-sans">
                    OECD 경기선행지수(CLI) 경기 순환 4국면 해석법
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed font-sans">
                  OECD CLI(진폭조정)는 실물 경기(GDP)의 전환점을 약 6~9개월 선행하며,{" "}
                  <strong>장기 추세선(100)</strong> 위치와 <strong>전월 대비 증감 방향</strong>을 조합해 4단계 국면으로 해석합니다.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[9.5px] font-sans">
                  <div className="p-2 border border-red-500/20 bg-red-500/5">
                    <div className="font-bold text-red-600 dark:text-red-400 mb-0.5">
                      ① 확장 국면 (100↑ + 상승)
                    </div>
                    <div className="text-muted-foreground leading-snug">
                      잠재성장률 이상에서 성장 모멘텀이 강화되는 호황 구간
                    </div>
                  </div>
                  <div className="p-2 border border-amber-500/20 bg-amber-500/5">
                    <div className="font-bold text-amber-600 dark:text-amber-400 mb-0.5">
                      ② 둔화 국면 (100↑ + 하락)
                    </div>
                    <div className="text-muted-foreground leading-snug">
                      경기는 아직 추세선 위이나 고점을 찍고 성장세가 꺾이는 구간
                    </div>
                  </div>
                  <div className="p-2 border border-emerald-500/20 bg-emerald-500/5">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      ③ 회복 국면 (100↓ + 상승)
                    </div>
                    <div className="text-muted-foreground leading-snug">
                      침체 바닥을 통과해 반등하며 주식 등 위험자산에 우호적인 구간
                    </div>
                  </div>
                  <div className="p-2 border border-blue-500/20 bg-blue-500/5">
                    <div className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                      ④ 수축 국면 (100↓ + 하락)
                    </div>
                    <div className="text-muted-foreground leading-snug">
                      잠재성장률 하회 및 하락세가 이어지는 경기 침체·방어 구간
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
