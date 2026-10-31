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
import {
  reportMultipleNewData,
  type NewStatusResult,
} from "@/lib/new-data-tracker";
import { NewDataBadge } from "@/components/new-data-badge";

interface LeiDataPoint {
  date: string; // YYYY-MM
  us?: number;
  kr?: number;
  jp?: number;
  usYoy?: number;
  krYoy?: number;
  jpYoy?: number;
}

interface LeiCountrySummary {
  seriesId: string;
  country: string;
  latestDate: string;
  current: number;
  prev: number;
  changeMom: number;
  changeYoy: number;
  changeYoyPct: number;
  phase: "expansion" | "slowdown" | "downturn" | "recovery";
  phaseLabel: string;
}

interface LeiApiResponse {
  summary: {
    us: LeiCountrySummary;
    kr: LeiCountrySummary;
    jp: LeiCountrySummary;
  };
  history: LeiDataPoint[];
  updatedAt: string;
}

type Period = "10Y" | "20Y" | "ALL";
type ChartMode = "level" | "yoy";
type CountryKey = "us" | "kr" | "jp";

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
  const [period, setPeriod] = useState<Period>("10Y");
  const [chartMode, setChartMode] = useState<ChartMode>("level");
  const [visibleLines, setVisibleLines] = useState<Record<CountryKey, boolean>>({
    us: true,
    kr: true,
    jp: true,
  });
  const [newMap, setNewMap] = useState<Record<string, NewStatusResult>>({});

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
      if (json.summary) {
        const statuses = reportMultipleNewData([
          { key: "lei:us", category: "lei", latestVersion: json.summary.us?.latestDate },
          { key: "lei:kr", category: "lei", latestVersion: json.summary.kr?.latestDate },
          { key: "lei:jp", category: "lei", latestVersion: json.summary.jp?.latestDate },
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

  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    const total = data.history.length;
    let months = total;
    if (period === "10Y") months = 120;
    else if (period === "20Y") months = 240;
    return data.history.slice(-months);
  }, [data?.history, period]);

  const yDomain = useMemo<[number, number]>(() => {
    if (filteredHistory.length === 0) {
      return chartMode === "level" ? [96, 104] : [-4, 4];
    }
    const baseLine = chartMode === "level" ? 100 : 0;
    const vals: number[] = [baseLine];
    for (const pt of filteredHistory) {
      const usVal = chartMode === "level" ? pt.us : pt.usYoy;
      const krVal = chartMode === "level" ? pt.kr : pt.krYoy;
      const jpVal = chartMode === "level" ? pt.jp : pt.jpYoy;
      if (visibleLines.us && typeof usVal === "number") vals.push(usVal);
      if (visibleLines.kr && typeof krVal === "number") vals.push(krVal);
      if (visibleLines.jp && typeof jpVal === "number") vals.push(jpVal);
    }
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const pad = Math.max((maxVal - minVal) * 0.15, 0.4);
    return [
      Math.floor((minVal - pad) * 10) / 10,
      Math.ceil((maxVal + pad) * 10) / 10,
    ];
  }, [filteredHistory, visibleLines, chartMode]);

  const recent12Months = useMemo(() => {
    if (!data?.history) return [];
    return [...data.history].slice(-12).reverse();
  }, [data?.history]);

  const toggleCountry = (key: CountryKey) => {
    setVisibleLines((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.us && !next.kr && !next.jp) return prev; // 최소 1개는 유지
      return next;
    });
  };

  const isYoy = chartMode === "yoy";

  const countryCards: {
    key: CountryKey;
    titleLevel: string;
    titleYoy: string;
    colorHex: string;
    dotClass: string;
    summary: LeiCountrySummary | undefined;
  }[] = [
    {
      key: "us",
      titleLevel: "미국 경기선행지수 (US CLI)",
      titleYoy: "미국 전년대비 경기선행지수 (US YoY)",
      colorHex: "#3b82f6",
      dotClass: "bg-blue-500",
      summary: data?.summary.us,
    },
    {
      key: "kr",
      titleLevel: "한국 경기선행지수 (KR CLI)",
      titleYoy: "한국 전년대비 경기선행지수 (KR YoY)",
      colorHex: "#10b981",
      dotClass: "bg-emerald-500",
      summary: data?.summary.kr,
    },
    {
      key: "jp",
      titleLevel: "일본 경기선행지수 (JP CLI)",
      titleYoy: "일본 전년대비 경기선행지수 (JP YoY)",
      colorHex: "#a855f7",
      dotClass: "bg-purple-500",
      summary: data?.summary.jp,
    },
  ];

  return (
    <div className="w-full flex flex-col bg-card border border-border overflow-hidden transition-colors duration-300">
      {/* 상단 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/50 px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-[12px] font-bold text-foreground tracking-wider font-sans">
            한·미·일 경기선행지수 (OECD CLI) 월별 시계열 비교
          </span>
          <NewDataBadge
            isNew={
              newMap["lei:us"]?.isNew ||
              newMap["lei:kr"]?.isNew ||
              newMap["lei:jp"]?.isNew
            }
          />
          <span className="hidden sm:inline-block text-[9.5px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 border border-border/60">
            {isYoy
              ? "기준선 = 0.0% (전년 동월 대비 변화율 · 켄 피셔 스타일)"
              : "기준선 = 100.0 (장기 추세)"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* 지표 보기 방식 토글 (지수 수준 100 vs 전년 대비 YoY %) */}
          <div className="flex bg-secondary/80 border border-border/60 p-0.5 rounded-none">
            <button
              onClick={() => setChartMode("level")}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                chartMode === "level"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              지수 수준 (100 기준)
            </button>
            <button
              onClick={() => setChartMode("yoy")}
              className={`px-2 py-0.5 text-[9.5px] font-bold transition-all ${
                chartMode === "yoy"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              전년비 변화율 (YoY %, 0% 기준)
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
              FRED에서 한·미·일 경기선행지수 월별 시계열 데이터를 불러오는 중...
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
            {/* 상단 요약 카드 3개 (미국 / 한국 / 일본 — 카드 클릭으로 그래프 ON/OFF 토글) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {countryCards.map((card) => {
                const item = card.summary;
                if (!item) return null;
                const active = visibleLines[card.key];
                return (
                  <div
                    key={card.key}
                    onClick={() => toggleCountry(card.key)}
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
                          {isYoy ? card.titleYoy : card.titleLevel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <NewDataBadge
                          isNew={newMap[`lei:${card.key}`]?.isNew}
                          trackerKey={`lei:${card.key}`}
                          previousVersion={newMap[`lei:${card.key}`]?.previousVersion}
                          latestVersion={newMap[`lei:${card.key}`]?.latestVersion}
                          onDismiss={() =>
                            setNewMap((prev) => ({
                              ...prev,
                              [`lei:${card.key}`]: {
                                ...prev[`lei:${card.key}`],
                                isNew: false,
                              },
                            }))
                          }
                        />
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
                      <span className="text-[22px] font-black font-mono text-foreground tracking-tight">
                        {isYoy
                          ? `${item.changeYoyPct >= 0 ? "+" : ""}${item.changeYoyPct.toFixed(2)}%`
                          : item.current.toFixed(2)}
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
                          {item.changeMom.toFixed(2)}p
                        </span>
                        <span className="text-muted-foreground">
                          {isYoy
                            ? `(원지수 ${item.current.toFixed(2)})`
                            : `(전년비 ${item.changeYoyPct >= 0 ? "+" : ""}${item.changeYoyPct.toFixed(2)}%)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/20">
                      <span
                        className={`px-2 py-0.5 text-[9.5px] font-bold border ${getPhaseStyle(
                          item.phase
                        )}`}
                      >
                        {item.phaseLabel}
                      </span>
                      <span className="text-[8.5px] font-mono text-muted-foreground">
                        FRED: {item.seriesId}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 메인 월별 시계열 그래프 (X축: 시간, Y축: 선행지수 또는 YoY %) */}
            <div className="w-full bg-neutral-900/5 dark:bg-black/20 border border-border/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
                  {visibleLines.us && (
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <span className="w-3 h-0.5 bg-blue-500 inline-block" />{" "}
                      {isYoy
                        ? "미국 전년대비 경기선행지수 (US YoY %)"
                        : "미국 경기선행지수 (US)"}
                    </span>
                  )}
                  {visibleLines.kr && (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-3 h-0.5 bg-emerald-500 inline-block" />{" "}
                      {isYoy
                        ? "한국 전년대비 경기선행지수 (KR YoY %)"
                        : "한국 경기선행지수 (KR)"}
                    </span>
                  )}
                  {visibleLines.jp && (
                    <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <span className="w-3 h-0.5 bg-purple-500 inline-block" />{" "}
                      {isYoy
                        ? "일본 전년대비 경기선행지수 (JP YoY %)"
                        : "일본 경기선행지수 (JP)"}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-normal text-[10px]">
                    <span className="w-3 border-t border-dashed border-amber-500 inline-block" />{" "}
                    {isYoy
                      ? "기준선 0.0% (위: 전년대비 상승 / 아래: 전년대비 하락)"
                      : "기준선 100.0 (위: 경기 확장 / 아래: 경기 수축)"}
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
                      tickFormatter={(val) =>
                        isYoy
                          ? `${Number(val) > 0 ? "+" : ""}${Number(val).toFixed(1)}%`
                          : Number(val).toFixed(1)
                      }
                    />
                    <ReferenceLine
                      y={isYoy ? 0 : 100}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: isYoy ? "기준선 0.0%" : "기준선 100.0",
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
                          <div className="bg-card/95 backdrop-blur-sm border border-border shadow-lg p-2.5 text-[10.5px] font-mono min-w-[210px]">
                            <div className="font-bold text-foreground border-b border-border/50 pb-1 mb-1.5 font-sans">
                              📅 {formatYmKorean(String(label))}
                            </div>
                            {visibleLines.us && pt.us !== undefined && (
                              <div className="flex items-center justify-between py-0.5 gap-3">
                                <span className="text-blue-500 font-bold font-sans">
                                  미국 (US):
                                </span>
                                <span className="font-black text-foreground">
                                  {isYoy && pt.usYoy !== undefined ? (
                                    <>
                                      {pt.usYoy >= 0 ? "+" : ""}
                                      {pt.usYoy.toFixed(2)}%{" "}
                                      <span className="text-[9px] text-muted-foreground">
                                        (지수 {pt.us.toFixed(2)})
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {pt.us.toFixed(2)}{" "}
                                      <span className="text-[9px] text-muted-foreground">
                                        (YoY{" "}
                                        {pt.usYoy !== undefined
                                          ? `${pt.usYoy >= 0 ? "+" : ""}${pt.usYoy.toFixed(2)}%`
                                          : "-"}
                                        )
                                      </span>
                                    </>
                                  )}
                                </span>
                              </div>
                            )}
                            {visibleLines.kr && pt.kr !== undefined && (
                              <div className="flex items-center justify-between py-0.5 gap-3">
                                <span className="text-emerald-500 font-bold font-sans">
                                  한국 (KR):
                                </span>
                                <span className="font-black text-foreground">
                                  {isYoy && pt.krYoy !== undefined ? (
                                    <>
                                      {pt.krYoy >= 0 ? "+" : ""}
                                      {pt.krYoy.toFixed(2)}%{" "}
                                      <span className="text-[9px] text-muted-foreground">
                                        (지수 {pt.kr.toFixed(2)})
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {pt.kr.toFixed(2)}{" "}
                                      <span className="text-[9px] text-muted-foreground">
                                        (YoY{" "}
                                        {pt.krYoy !== undefined
                                          ? `${pt.krYoy >= 0 ? "+" : ""}${pt.krYoy.toFixed(2)}%`
                                          : "-"}
                                        )
                                      </span>
                                    </>
                                  )}
                                </span>
                              </div>
                            )}
                            {visibleLines.jp && pt.jp !== undefined && (
                              <div className="flex items-center justify-between py-0.5 gap-3">
                                <span className="text-purple-500 font-bold font-sans">
                                  일본 (JP):
                                </span>
                                <span className="font-black text-foreground">
                                  {isYoy && pt.jpYoy !== undefined ? (
                                    <>
                                      {pt.jpYoy >= 0 ? "+" : ""}
                                      {pt.jpYoy.toFixed(2)}%{" "}
                                      <span className="text-[9px] text-muted-foreground">
                                        (지수 {pt.jp.toFixed(2)})
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {pt.jp.toFixed(2)}{" "}
                                      <span className="text-[9px] text-muted-foreground">
                                        (YoY{" "}
                                        {pt.jpYoy !== undefined
                                          ? `${pt.jpYoy >= 0 ? "+" : ""}${pt.jpYoy.toFixed(2)}%`
                                          : "-"}
                                        )
                                      </span>
                                    </>
                                  )}
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
                        dataKey={isYoy ? "usYoy" : "us"}
                        name="미국 경기선행지수"
                        stroke="#3b82f6"
                        strokeWidth={2.3}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    )}
                    {visibleLines.kr && (
                      <Line
                        type="monotone"
                        dataKey={isYoy ? "krYoy" : "kr"}
                        name="한국 경기선행지수"
                        stroke="#10b981"
                        strokeWidth={2.3}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    )}
                    {visibleLines.jp && (
                      <Line
                        type="monotone"
                        dataKey={isYoy ? "jpYoy" : "jp"}
                        name="일본 경기선행지수"
                        stroke="#a855f7"
                        strokeWidth={2.3}
                        dot={false}
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
                    최근 12개월 월별 시계열 추이 ({isYoy ? "전년 대비 YoY %" : "지수 수준"})
                  </span>
                  <span className="text-[9.5px] text-muted-foreground font-mono">
                    {isYoy ? "단위: % (0.0% = 전년 동월 수준)" : "단위: Index (100 = 장기추세)"}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                  <table className="w-full text-[10.5px] font-mono border-collapse">
                    <thead className="sticky top-0 bg-secondary text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-1.5 px-2 text-left font-bold">기준월</th>
                        <th className="py-1.5 px-2 text-right font-bold text-blue-600 dark:text-blue-400">
                          {isYoy ? "미국 YoY (지수)" : "미국 (YoY %)"}
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {isYoy ? "한국 YoY (지수)" : "한국 (YoY %)"}
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold text-purple-600 dark:text-purple-400">
                          {isYoy ? "일본 YoY (지수)" : "일본 (YoY %)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {recent12Months.map((row, idx) => (
                        <tr
                          key={row.date}
                          className="hover:bg-secondary/40 transition-colors"
                        >
                          <td className="py-1.5 px-2 font-bold text-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              {row.date}
                              {idx === 0 &&
                                (newMap["lei:us"]?.isNew ||
                                  newMap["lei:kr"]?.isNew ||
                                  newMap["lei:jp"]?.isNew) && (
                                  <NewDataBadge isNew={true} />
                                )}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-foreground">
                            {isYoy ? (
                              row.usYoy !== undefined ? (
                                <>
                                  <span className="font-bold">
                                    {row.usYoy >= 0 ? "+" : ""}
                                    {row.usYoy.toFixed(2)}%
                                  </span>{" "}
                                  <span className="text-[9px] text-muted-foreground">
                                    ({row.us?.toFixed(1)})
                                  </span>
                                </>
                              ) : (
                                "-"
                              )
                            ) : row.us !== undefined ? (
                              <>
                                <span className="font-bold">{row.us.toFixed(2)}</span>{" "}
                                <span className="text-[9px] text-muted-foreground">
                                  ({row.usYoy !== undefined ? `${row.usYoy >= 0 ? "+" : ""}${row.usYoy.toFixed(1)}%` : "-"})
                                </span>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right text-foreground">
                            {isYoy ? (
                              row.krYoy !== undefined ? (
                                <>
                                  <span className="font-bold">
                                    {row.krYoy >= 0 ? "+" : ""}
                                    {row.krYoy.toFixed(2)}%
                                  </span>{" "}
                                  <span className="text-[9px] text-muted-foreground">
                                    ({row.kr?.toFixed(1)})
                                  </span>
                                </>
                              ) : (
                                "-"
                              )
                            ) : row.kr !== undefined ? (
                              <>
                                <span className="font-bold">{row.kr.toFixed(2)}</span>{" "}
                                <span className="text-[9px] text-muted-foreground">
                                  ({row.krYoy !== undefined ? `${row.krYoy >= 0 ? "+" : ""}${row.krYoy.toFixed(1)}%` : "-"})
                                </span>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right text-foreground">
                            {isYoy ? (
                              row.jpYoy !== undefined ? (
                                <>
                                  <span className="font-bold">
                                    {row.jpYoy >= 0 ? "+" : ""}
                                    {row.jpYoy.toFixed(2)}%
                                  </span>{" "}
                                  <span className="text-[9px] text-muted-foreground">
                                    ({row.jp?.toFixed(1)})
                                  </span>
                                </>
                              ) : (
                                "-"
                              )
                            ) : row.jp !== undefined ? (
                              <>
                                <span className="font-bold">{row.jp.toFixed(2)}</span>{" "}
                                <span className="text-[9px] text-muted-foreground">
                                  ({row.jpYoy !== undefined ? `${row.jpYoy >= 0 ? "+" : ""}${row.jpYoy.toFixed(1)}%` : "-"})
                                </span>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 경기선행지수 4국면 & 켄 피셔 역발상 해석 가이드 */}
              <div className="lg:col-span-5 border border-border/50 bg-secondary/10 p-3.5 flex flex-col justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-foreground font-sans">
                    {isYoy
                      ? "켄 피셔 역발상 투자: 전년대비 변화율(YoY %, 기준선 0%) 해석법"
                      : "OECD 경기선행지수(CLI, 기준선 100) 경기 순환 4국면 해석법"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed font-sans">
                  {isYoy ? (
                    <>
                      그래프의 <strong>① 현재 위치(0% 위 vs 아래)</strong>와{" "}
                      <strong>② 기울기 방향(전월 대비 상승 ↗ vs 하락 ↘)</strong> 두 가지를 조합해 4단계로 해석합니다.
                    </>
                  ) : (
                    <>
                      그래프의 <strong>① 현재 위치(기준선 100 위 vs 아래)</strong>와{" "}
                      <strong>② 기울기 방향(전월 대비 상승 ↗ vs 하락 ↘)</strong> 두 가지를 조합해 4단계로 해석합니다.
                    </>
                  )}
                </p>

                {isYoy ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px] font-sans">
                    <div className="p-2 border border-red-500/25 bg-red-500/5">
                      <div className="font-bold text-red-600 dark:text-red-400 mb-0.5">
                        ① 확장 가속 (0% 위 · 그래프 상승 ↗)
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        전년 대비 플러스(+) 상태에서 그래프가 계속 올라가며 경기 확장 속도가 빨라지는 호황 구간
                      </div>
                    </div>
                    <div className="p-2 border border-amber-500/25 bg-amber-500/5">
                      <div className="font-bold text-amber-600 dark:text-amber-400 mb-0.5">
                        ② 상승 둔화 (0% 위 · 그래프 하락 ↘)
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        아직 0% 위(+)이지만, <strong>YoY 그래프가 꼭대기(고점)를 찍고 내려오며</strong> 성장 탄력이 둔화되는 구간
                      </div>
                    </div>
                    <div className="p-2 border border-emerald-500/25 bg-emerald-500/5">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                        ③ 회복 전환 (0% 아래 · 그래프 상승 ↗) ⭐매수 적기
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        아직 0% 아래(-)라 뉴스는 비관적이지만, <strong>YoY 그래프가 바닥을 찍고 위로 꺾여 올라오는</strong> 역발상 매수 구간
                      </div>
                    </div>
                    <div className="p-2 border border-blue-500/25 bg-blue-500/5">
                      <div className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                        ④ 수축 심화 (0% 아래 · 그래프 하락 ↘)
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        0% 아래(-)에서 그래프가 계속 아래로 내려가며 경기 침체 폭이 깊어지는 방어 구간
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px] font-sans">
                    <div className="p-2 border border-red-500/25 bg-red-500/5">
                      <div className="font-bold text-red-600 dark:text-red-400 mb-0.5">
                        ① 확장 국면 (100 위 · 전월비 상승 ↗)
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        지수가 장기추세선(100) 위에 있으면서 지난달보다 계속 올라가는 경기 호황 구간
                      </div>
                    </div>
                    <div className="p-2 border border-amber-500/25 bg-amber-500/5">
                      <div className="font-bold text-amber-600 dark:text-amber-400 mb-0.5">
                        ② 둔화 국면 (100 위 · 전월비 하락 ↘)
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        지수는 아직 100 위지만, <strong>선행지수 그래프가 고점을 찍고 지난달보다 내려오기 시작한</strong> 경기 둔화 진입 구간
                      </div>
                    </div>
                    <div className="p-2 border border-emerald-500/25 bg-emerald-500/5">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                        ③ 회복 국면 (100 아래 · 전월비 상승 ↗) ⭐매수 적기
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        지수는 아직 100 아래지만, <strong>선행지수 그래프가 바닥(저점)을 찍고 지난달보다 올라오기 시작한</strong> 회복 전환 구간
                      </div>
                    </div>
                    <div className="p-2 border border-blue-500/25 bg-blue-500/5">
                      <div className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                        ④ 수축 국면 (100 아래 · 전월비 하락 ↘)
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        지수가 장기추세선(100) 아래로 떨어진 상태에서 지난달보다 계속 내려가는 경기 침체 구간
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
