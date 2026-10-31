"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  reportMultipleNewData,
  type NewStatusResult,
} from "@/lib/new-data-tracker";
import { NewDataBadge } from "@/components/new-data-badge";

interface YieldSpreadDataPoint {
  date: string; // YYYY-MM
  y10?: number;
  y2?: number;
  m3?: number;
  spread10y2y?: number;
  spread10y3m?: number;
}

interface YieldSeriesSummary {
  seriesId: string;
  label: string;
  latestDate: string;
  current: number;
  prev: number;
  prev3m: number;
  changeMom: number;
  change3m: number;
  changeYoy: number;
  statusBadge: string;
  statusTone: "red" | "blue" | "amber" | "emerald";
}

interface SteepeningAnalysis {
  regime:
    | "bull_steepening"
    | "bear_steepening"
    | "bear_flattening"
    | "bull_flattening"
    | "neutral";
  regimeTitle: string;
  regimeSubtitle: string;
  isInverted: boolean;
  unInverting: boolean;
}

interface YieldSpreadApiResponse {
  summary: {
    y10: YieldSeriesSummary;
    y2: YieldSeriesSummary;
    m3: YieldSeriesSummary;
    spread10y2y: YieldSeriesSummary;
    spread10y3m: YieldSeriesSummary;
  };
  analysis: {
    spread10y2y: SteepeningAnalysis;
    spread10y3m: SteepeningAnalysis;
  };
  history: YieldSpreadDataPoint[];
  updatedAt: string;
}

type Period = "10Y" | "20Y" | "ALL";
type SpreadMode = "10y2y" | "10y3m";
type LineKey = "long" | "short" | "spread";

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

function getToneBadgeStyle(tone: YieldSeriesSummary["statusTone"]) {
  switch (tone) {
    case "red":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
    case "amber":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "emerald":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "blue":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  }
}

export function YieldSpreadWidget() {
  const [data, setData] = useState<YieldSpreadApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("10Y");
  const [spreadMode, setSpreadMode] = useState<SpreadMode>("10y2y");
  const [guideTab, setGuideTab] = useState<"cycle" | "steepening">("cycle");
  const [visibleLines, setVisibleLines] = useState<Record<LineKey, boolean>>({
    long: true,
    short: true,
    spread: true,
  });
  const [newMap, setNewMap] = useState<Record<string, NewStatusResult>>({});

  const fetchData = useCallback(async (bypass = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const url = bypass
        ? "/api/fred/yield-spread?bypassCache=true"
        : "/api/fred/yield-spread";
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(
          json.error || "미국채 장단기 금리차 데이터를 불러오지 못했습니다."
        );
      }
      setData(json);
      if (json.summary) {
        const statuses = reportMultipleNewData([
          { key: "yield:y10", category: "lei", latestVersion: json.summary.y10?.latestDate },
          { key: "yield:y2", category: "lei", latestVersion: json.summary.y2?.latestDate },
          { key: "yield:m3", category: "lei", latestVersion: json.summary.m3?.latestDate },
          { key: "yield:spread10y2y", category: "lei", latestVersion: json.summary.spread10y2y?.latestDate },
          { key: "yield:spread10y3m", category: "lei", latestVersion: json.summary.spread10y3m?.latestDate },
        ]);
        setNewMap(statuses);
      }
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

  const is3M = spreadMode === "10y3m";
  const shortDataKey = is3M ? "m3" : "y2";
  const spreadDataKey = is3M ? "spread10y3m" : "spread10y2y";

  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    const total = data.history.length;
    let months = total;
    if (period === "10Y") months = 120;
    else if (period === "20Y") months = 240;
    return data.history.slice(-months);
  }, [data?.history, period]);

  const yDomain = useMemo<[number, number]>(() => {
    if (filteredHistory.length === 0) return [-2, 6];
    const vals: number[] = [0];
    for (const pt of filteredHistory) {
      const lVal = pt.y10;
      const sVal = is3M ? pt.m3 : pt.y2;
      const spVal = is3M ? pt.spread10y3m : pt.spread10y2y;
      if (visibleLines.long && typeof lVal === "number") vals.push(lVal);
      if (visibleLines.short && typeof sVal === "number") vals.push(sVal);
      if (visibleLines.spread && typeof spVal === "number") vals.push(spVal);
    }
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const pad = Math.max((maxVal - minVal) * 0.12, 0.35);
    return [
      Math.floor((minVal - pad) * 10) / 10,
      Math.ceil((maxVal + pad) * 10) / 10,
    ];
  }, [filteredHistory, visibleLines, is3M]);

  const recent12Months = useMemo(() => {
    if (!data?.history) return [];
    return [...data.history].slice(-12).reverse();
  }, [data?.history]);

  const toggleLine = (key: LineKey) => {
    setVisibleLines((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.long && !next.short && !next.spread) return prev; // 최소 1개는 유지
      return next;
    });
  };

  const activeAnalysis = is3M
    ? data?.analysis.spread10y3m
    : data?.analysis.spread10y2y;

  const seriesCards: {
    key: LineKey;
    title: string;
    colorHex: string;
    dotClass: string;
    summary: YieldSeriesSummary | undefined;
    unitSuffix: string;
  }[] = [
    {
      key: "long",
      title: "미국채 10년물 금리 (10Y · 장기 벤치마크)",
      colorHex: "#3b82f6",
      dotClass: "bg-blue-500",
      summary: data?.summary.y10,
      unitSuffix: "%",
    },
    {
      key: "short",
      title: is3M
        ? "미국채 3개월물 금리 (3M · 실효 기준금리 동조)"
        : "미국채 2년물 금리 (2Y · 통화정책 민감)",
      colorHex: "#10b981",
      dotClass: "bg-emerald-500",
      summary: is3M ? data?.summary.m3 : data?.summary.y2,
      unitSuffix: "%",
    },
    {
      key: "spread",
      title: is3M
        ? "장단기 금리차 (10Y - 3M · 연준 침체 모델 기준)"
        : "장단기 금리차 (10Y - 2Y · 시장/월가 표준)",
      colorHex: "#f43f5e",
      dotClass: "bg-rose-500",
      summary: is3M ? data?.summary.spread10y3m : data?.summary.spread10y2y,
      unitSuffix: "%p",
    },
  ];

  return (
    <div className="w-full flex flex-col bg-card border border-border overflow-hidden transition-colors duration-300">
      {/* 상단 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/50 px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-500" />
          <span className="text-[12px] font-bold text-foreground tracking-wider font-sans">
            미국채 장단기 금리차 ({is3M ? "10Y - 3M" : "10Y - 2Y"}) 및 국채 수익률 시계열 추이
          </span>
          <NewDataBadge
            isNew={
              newMap["yield:y10"]?.isNew ||
              newMap[is3M ? "yield:m3" : "yield:y2"]?.isNew ||
              newMap[is3M ? "yield:spread10y3m" : "yield:spread10y2y"]?.isNew
            }
          />
          <span className="hidden sm:inline-block text-[9.5px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 border border-border/60">
            기준선 = 0.00%p (0 아래: 금리 역전 · 마이너스→플러스 반등 시 침체 경계)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* 금리차 기준 토글 (10Y-2Y vs 10Y-3M) */}
          <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
            <button
              onClick={() => setSpreadMode("10y2y")}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                spreadMode === "10y2y"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              10Y - 2Y (T10Y2Y · 시장 표준)
            </button>
            <button
              onClick={() => setSpreadMode("10y3m")}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                spreadMode === "10y3m"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              10Y - 3M (T10Y3M · 연준 기준)
            </button>
          </div>

          {/* 조회 기간 탭 (10년 / 20년 / 전체) */}
          <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
            {(
              [
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
              FRED에서 미국채 10년물·2년물·3개월물 및 장단기 금리차 시계열을 불러오는 중...
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
            {/* 상단 요약 카드 3개 (10년물 / 2년물 또는 3개월물 / 장단기 금리차 — 클릭 시 차트 ON/OFF 토글) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {seriesCards.map((card) => {
                const item = card.summary;
                if (!item) return null;
                const active = visibleLines[card.key];
                const isSpreadCard = card.key === "spread";
                return (
                  <div
                    key={card.key}
                    onClick={() => toggleLine(card.key)}
                    style={{
                      borderTop: active
                        ? `3px solid ${card.colorHex}`
                        : "3px solid transparent",
                    }}
                    title="클릭하여 차트 표시 ON/OFF 전환"
                    className={`p-3.5 border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 ${
                      !active ? "opacity-45" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            active ? card.dotClass : "bg-muted-foreground"
                          }`}
                        />
                        <span
                          className={`text-[12px] font-bold truncate font-sans ${
                            active
                              ? "text-foreground"
                              : "text-muted-foreground line-through"
                          }`}
                        >
                          {card.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          const tKey =
                            card.key === "long"
                              ? "yield:y10"
                              : card.key === "short"
                              ? is3M
                                ? "yield:m3"
                                : "yield:y2"
                              : is3M
                              ? "yield:spread10y3m"
                              : "yield:spread10y2y";
                          return (
                            <NewDataBadge
                              isNew={newMap[tKey]?.isNew}
                              trackerKey={tKey}
                              previousVersion={newMap[tKey]?.previousVersion}
                              latestVersion={newMap[tKey]?.latestVersion}
                              onDismiss={() =>
                                setNewMap((prev) => ({
                                  ...prev,
                                  [tKey]: { ...prev[tKey], isNew: false },
                                }))
                              }
                            />
                          );
                        })()}
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {formatYmKorean(item.latestDate)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[8px] font-mono font-extrabold border leading-none ${
                            active
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-secondary text-muted-foreground border-border/50"
                          }`}
                        >
                          {active ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span
                        className={`text-[22px] font-black font-mono tracking-tight ${
                          isSpreadCard && item.current < 0
                            ? "text-blue-600 dark:text-blue-400"
                            : isSpreadCard && item.current > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground"
                        }`}
                      >
                        {isSpreadCard && item.current > 0 ? "+" : ""}
                        {item.current.toFixed(2)}
                        {card.unitSuffix}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span
                          className={`font-bold flex items-center gap-0.5 ${
                            item.changeMom >= 0 ? "text-red-500" : "text-blue-500"
                          }`}
                        >
                          {item.changeMom >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          전월비 {item.changeMom >= 0 ? "+" : ""}
                          {item.changeMom.toFixed(2)}%p
                        </span>
                        <span className="text-muted-foreground">
                          (3개월비 {item.change3m >= 0 ? "+" : ""}
                          {item.change3m.toFixed(2)}%p)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/20">
                      <span
                        className={`px-2 py-0.5 text-[9.5px] font-bold border ${getToneBadgeStyle(
                          item.statusTone
                        )}`}
                      >
                        {item.statusBadge}
                      </span>
                      <span className="text-[8.5px] font-mono text-muted-foreground">
                        FRED: {item.seriesId}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 현재 추세 기울기(스티프닝/플래트닝) 실시간 진단 배너 */}
            {activeAnalysis && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 border border-border/60 bg-secondary/20">
                <div className="flex items-start sm:items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-[11px] font-extrabold text-foreground font-sans">
                      현재 추세 기울기 진단: {activeAnalysis.regimeTitle}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-sans">
                      — {activeAnalysis.regimeSubtitle}
                    </span>
                  </div>
                </div>
                {activeAnalysis.unInverting && (
                  <span className="px-2 py-0.5 text-[9.5px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 font-mono">
                    ⚠️ 역전 해소/급등 변곡점 구간
                  </span>
                )}
              </div>
            )}

            {/* 메인 시계열 그래프 (10년물, 단기물, 장단기 금리차 동시 표시) */}
            <div className="w-full bg-neutral-900/5 dark:bg-black/20 border border-border/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
                  {visibleLines.long && (
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <span className="w-3 h-0.5 bg-blue-500 inline-block" />{" "}
                      미국채 10년물 금리 (10Y)
                    </span>
                  )}
                  {visibleLines.short && (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-3 h-0.5 bg-emerald-500 inline-block" />{" "}
                      {is3M ? "미국채 3개월물 금리 (3M)" : "미국채 2년물 금리 (2Y)"}
                    </span>
                  )}
                  {visibleLines.spread && (
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <span className="w-3 h-1 bg-rose-500 inline-block" />{" "}
                      {is3M
                        ? "장단기 금리차 (10Y - 3M)"
                        : "장단기 금리차 (10Y - 2Y)"}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-normal text-[10px]">
                    <span className="w-3 border-t border-dashed border-amber-500 inline-block" />{" "}
                    기준선 0.00%p (금리 역전 경계선)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  X축: 월별 시계열 ({formatYmShort(filteredHistory[0]?.date)} ~{" "}
                  {formatYmShort(
                    filteredHistory[filteredHistory.length - 1]?.date
                  )}
                  , 총 {filteredHistory.length}개월)
                </span>
              </div>

              <div className="w-full h-[350px] select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={filteredHistory}
                    margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="spreadAreaGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f43f5e"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f43f5e"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
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
                      tickFormatter={(val) => `${Number(val).toFixed(1)}%`}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.6}
                      label={{
                        value: "금리 역전 기준선 0.00%p",
                        position: "insideTopRight",
                        fill: "#f59e0b",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0)
                          return null;
                        const pt = payload[0]?.payload as YieldSpreadDataPoint;
                        const shortVal = is3M ? pt.m3 : pt.y2;
                        const spreadVal = is3M
                          ? pt.spread10y3m
                          : pt.spread10y2y;
                        return (
                          <div className="bg-card/95 backdrop-blur-sm border border-border shadow-lg p-2.5 text-[10.5px] font-mono min-w-[225px]">
                            <div className="font-bold text-foreground border-b border-border/50 pb-1 mb-1.5 font-sans">
                              📅 {formatYmKorean(String(label))}
                            </div>
                            {visibleLines.long && pt.y10 !== undefined && (
                              <div className="flex items-center justify-between py-0.5 gap-3">
                                <span className="text-blue-500 font-bold font-sans">
                                  미국채 10년물 (10Y):
                                </span>
                                <span className="font-black text-foreground">
                                  {pt.y10.toFixed(2)}%
                                </span>
                              </div>
                            )}
                            {visibleLines.short && shortVal !== undefined && (
                              <div className="flex items-center justify-between py-0.5 gap-3">
                                <span className="text-emerald-500 font-bold font-sans">
                                  {is3M
                                    ? "미국채 3개월물 (3M):"
                                    : "미국채 2년물 (2Y):"}
                                </span>
                                <span className="font-black text-foreground">
                                  {shortVal.toFixed(2)}%
                                </span>
                              </div>
                            )}
                            {visibleLines.spread && spreadVal !== undefined && (
                              <div className="flex items-center justify-between py-0.5 gap-3 border-t border-border/40 mt-1 pt-1">
                                <span className="text-rose-500 font-bold font-sans">
                                  {is3M
                                    ? "장단기차 (10Y-3M):"
                                    : "장단기차 (10Y-2Y):"}
                                </span>
                                <span
                                  className={`font-black ${
                                    spreadVal < 0
                                      ? "text-blue-500"
                                      : "text-rose-500"
                                  }`}
                                >
                                  {spreadVal > 0 ? "+" : ""}
                                  {spreadVal.toFixed(2)}%p{" "}
                                  <span className="text-[9px] text-muted-foreground">
                                    ({spreadVal < 0 ? "역전" : "정상"})
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    {visibleLines.spread && (
                      <Area
                        type="monotone"
                        dataKey={spreadDataKey}
                        name={is3M ? "장단기 금리차 (10Y-3M)" : "장단기 금리차 (10Y-2Y)"}
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        fill="url(#spreadAreaGrad)"
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    )}
                    {visibleLines.long && (
                      <Line
                        type="monotone"
                        dataKey="y10"
                        name="미국채 10년물 금리"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3.5 }}
                        connectNulls
                      />
                    )}
                    {visibleLines.short && (
                      <Line
                        type="monotone"
                        dataKey={shortDataKey}
                        name={is3M ? "미국채 3개월물 금리" : "미국채 2년물 금리"}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3.5 }}
                        connectNulls
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 하단: 좌측 최근 12개월 시계열 테이블 & 우측 불/베어 스티프닝 및 추세 해석 가이드 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 최근 12개월 월별 시계열 테이블 */}
              <div className="lg:col-span-6 border border-border/50 bg-secondary/10 p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-foreground font-sans">
                    최근 12개월 국채 금리 및 장단기 금리차 ({is3M ? "10Y - 3M" : "10Y - 2Y"}) 추이
                  </span>
                  <span className="text-[9.5px] text-muted-foreground font-mono">
                    단위: % / %p (0%p 미만 = 금리 역전)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                  <table className="w-full text-[10.5px] font-mono border-collapse">
                    <thead className="sticky top-0 bg-secondary text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-1.5 px-2 text-left font-bold">기준월</th>
                        <th className="py-1.5 px-2 text-right font-bold text-blue-600 dark:text-blue-400">
                          10년물 (10Y)
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {is3M ? "3개월물 (3M)" : "2년물 (2Y)"}
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold text-rose-600 dark:text-rose-400">
                          {is3M ? "금리차 (10Y-3M)" : "금리차 (10Y-2Y)"}
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {recent12Months.map((row, idx) => {
                        const shortVal = is3M ? row.m3 : row.y2;
                        const spreadVal = is3M
                          ? row.spread10y3m
                          : row.spread10y2y;
                        const inverted =
                          spreadVal !== undefined && spreadVal < 0;
                        return (
                          <tr
                            key={row.date}
                            className="hover:bg-secondary/40 transition-colors"
                          >
                            <td className="py-1.5 px-2 font-bold text-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                {row.date}
                                {idx === 0 &&
                                  (newMap["yield:y10"]?.isNew ||
                                    newMap[is3M ? "yield:m3" : "yield:y2"]?.isNew ||
                                    newMap[
                                      is3M ? "yield:spread10y3m" : "yield:spread10y2y"
                                    ]?.isNew) && <NewDataBadge isNew={true} />}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right text-foreground font-semibold">
                              {row.y10 !== undefined
                                ? `${row.y10.toFixed(2)}%`
                                : "-"}
                            </td>
                            <td className="py-1.5 px-2 text-right text-foreground font-semibold">
                              {shortVal !== undefined
                                ? `${shortVal.toFixed(2)}%`
                                : "-"}
                            </td>
                            <td
                              className={`py-1.5 px-2 text-right font-bold ${
                                inverted
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {spreadVal !== undefined
                                ? `${spreadVal > 0 ? "+" : ""}${spreadVal.toFixed(2)}%p`
                                : "-"}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              {spreadVal !== undefined ? (
                                <span
                                  className={`px-1.5 py-0.5 text-[9px] font-sans font-bold border ${
                                    inverted
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  }`}
                                >
                                  {inverted ? "금리 역전" : "정상(+)"}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 우측: 금리차 추세 사이클 & 스티프닝 탭형 해석 가이드 */}
              <div className="lg:col-span-6 border border-border/50 bg-secondary/10 p-3.5 flex flex-col justify-between gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-[11px] font-bold text-foreground font-sans">
                      {guideTab === "steepening"
                        ? "실전 핵심: 금리차가 올라갈 때(우상향 추세 · 스티프닝)의 2가지 해석"
                        : "장단기 금리차 추세(기울기)를 해석하는 3단계 사이클"}
                    </span>
                  </div>

                  {/* 가이드 탭 전환 버튼 */}
                  <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none select-none">
                    <button
                      onClick={() => setGuideTab("cycle")}
                      className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                        guideTab === "cycle"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      추세 기울기 3단계 사이클
                    </button>
                    <button
                      onClick={() => setGuideTab("steepening")}
                      className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                        guideTab === "steepening"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      스티프닝 해석
                    </button>
                  </div>
                </div>

                {guideTab === "steepening" ? (
                  <>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-sans">
                      장단기 금리차는 단순히 현재 값만 보는 것보다{" "}
                      <strong>마이너스(-)에서 0을 뚫고 올라오는 추세(기울기)</strong>와{" "}
                      <strong>무엇 때문에 벌어지는지(단기물 하락 vs 10년물 상승)</strong>를 구분하는 것이 핵심입니다.
                    </p>

                    <div className="flex flex-col gap-2.5 text-[10px] font-sans">
                      {/* Case A: Bull Steepening */}
                      <div className="p-2.5 border border-blue-500/30 bg-blue-500/5 flex flex-col gap-1">
                        <div className="font-extrabold text-blue-600 dark:text-blue-400 text-[10.5px]">
                          Case A. 단기물 금리가 급락해서 금리차가 벌어질 때 (불 스티프닝, Bull Steepening)
                        </div>
                        <div className="text-foreground/90 leading-relaxed">
                          <span className="font-bold text-foreground">• 원인:</span>{" "}
                          경제에 실제 쇼크(실업률 급등, 금융 위기 등)가 와서 연준이 다급하게 금리를 인하할 것 같을 때 단기물 금리가 폭락합니다.
                        </div>
                        <div className="text-foreground/90 leading-relaxed">
                          <span className="font-bold text-blue-600 dark:text-blue-400">• 판단:</span>{" "}
                          <strong>전형적인 경기 침체 진입 신호</strong>입니다. 위험자산(주식)에 가장 경계가 필요한 시점입니다.
                        </div>
                      </div>

                      {/* Case B: Bear Steepening */}
                      <div className="p-2.5 border border-rose-500/30 bg-rose-500/5 flex flex-col gap-1">
                        <div className="font-extrabold text-rose-600 dark:text-rose-400 text-[10.5px]">
                          Case B. 10년물 금리가 급등해서 금리차가 벌어질 때 (베어 스티프닝, Bear Steepening)
                        </div>
                        <div className="text-foreground/90 leading-relaxed">
                          <span className="font-bold text-foreground">• 원인:</span>{" "}
                          경기가 생각보다 너무 탄탄하거나(연착륙), 국가 부채/재정적자 우려 및 인플레이션 재발 우려로 장기 국채 금리가 뛸 때 발생합니다.
                        </div>
                        <div className="text-foreground/90 leading-relaxed">
                          <span className="font-bold text-rose-600 dark:text-rose-400">• 판단:</span>{" "}
                          당장 침체는 아니지만, 장기 금리 상승(할인율 부담)으로 인해 <strong>기술주나 부동산 시장에 부담</strong>을 줍니다.
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 text-[10px] font-sans">
                    {/* 1. 우하향 추세 (평탄화, Flattening) */}
                    <div className="p-2 border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[10.5px]">
                          ① 우하향 추세 (평탄화, Flattening)
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          플러스(+) ➔ 0으로 하락 중
                        </span>
                      </div>
                      <div className="text-foreground/90 leading-relaxed">
                        <span className="font-bold text-foreground">• 상황:</span>{" "}
                        연준이 물가를 잡으려고 기준금리를 올리기 시작할 때입니다. 단기물 금리가 장기물(10년)보다 빠르게 오르며 격차가 줄어듭니다.
                      </div>
                      <div className="text-foreground/90 leading-relaxed">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">• 해석:</span>{" "}
                        &ldquo;긴축이 시작되었구나, 앞으로 경기가 둔화될 수 있겠다.&rdquo;
                      </div>
                    </div>

                    {/* 2. 음수 구간 진입 (역전, Inversion) */}
                    <div className="p-2 border border-blue-500/30 bg-blue-500/5 flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 text-[10.5px]">
                          ② 음수 구간 진입 (역전, Inversion)
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          0 아래(-)로 하락 및 유지
                        </span>
                      </div>
                      <div className="text-foreground/90 leading-relaxed">
                        <span className="font-bold text-foreground">• 상황:</span>{" "}
                        고금리가 지속되며 &ldquo;미래에 경기가 나빠져서 결국 금리를 내릴 것&rdquo;이라는 기대로 10년물 금리가 단기물보다 낮아진 상태입니다.
                      </div>
                      <div className="text-foreground/90 leading-relaxed">
                        <span className="font-bold text-blue-600 dark:text-blue-400">• 해석:</span>{" "}
                        <strong>경기 침체 경고등이 켜진 상태</strong>입니다. (보통 역전 후 6개월~2년 뒤 침체 발생)
                      </div>
                    </div>

                    {/* 3. 가파른 우상향 추세 (재정상화, Un-inversion / Steepening) */}
                    <div className="p-2 border border-amber-500/40 bg-amber-500/10 flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[10.5px]">
                          ③ 가파른 우상향 추세 (역전 해소, Un-inversion) ⭐가장 주의할 구간
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                          마이너스(-) ➔ 플러스(+)로 급등
                        </span>
                      </div>
                      <div className="text-foreground/90 leading-relaxed">
                        <span className="font-bold text-foreground">• 상황:</span>{" "}
                        금리 역전이 풀리면서 그래프가 위로 가파르게 치솟는 구간입니다.
                      </div>
                      <div className="text-foreground/90 leading-relaxed">
                        <span className="font-bold text-amber-600 dark:text-amber-400">• 해석:</span>{" "}
                        단순히 그래프만 보면 정상화되는 것 같지만, <strong>가장 위험한 시점</strong>일 수 있습니다. 왜 올라가는지{" "}
                        <strong>원인(단기물 급락 때문인지, 10년물 급등 때문인지)</strong>을 반드시 따져봐야 합니다.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
