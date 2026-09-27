"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trophy, RefreshCw, AlertCircle, Calendar, Clock, MapPin } from "lucide-react";

export interface OddsQuota {
  used: number;
  remaining: number;
  total: number;
  lastUpdated: string;
}

export interface EplOdds {
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  homeProb: number;
  drawProb: number;
  awayProb: number;
  pick: string;
  bookmakerCount: number;
}

export interface EplFixture {
  gameId: string;
  gameDate: string;
  gameTime: string;
  gameDateTime: string;
  homeTeam: string;
  homeTeamRank?: number | null;
  homeTeamScore?: number | null;
  awayTeam: string;
  awayTeamRank?: number | null;
  awayTeamScore?: number | null;
  stadium: string;
  status: "예정" | "진행중" | "종료";
  statusInfo: string;
  dDay: number;
  dDayText: string;
  odds?: EplOdds | null;
}

export interface EplRoundData {
  roundNumber: number;
  roundTitle: string;
  periodText: string;
  fixtures: EplFixture[];
  updatedAt: string;
  oddsQuota?: OddsQuota | null;
}

function formatKoreanDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[d.getDay()] || "";
    return `${parts[1]}.${parts[2]} (${dayName})`;
  }
  return dateStr;
}

// 1위~6위: 강팀(파란색), 15위~20위: 강등권 예상팀(빨간색), 그 외: 기본 중립
function getRankBadgeClass(rank?: number | null) {
  if (!rank) return "bg-secondary text-muted-foreground border-border/30";
  if (rank >= 1 && rank <= 6) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-extrabold";
  }
  if (rank >= 15 && rank <= 20) {
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-extrabold";
  }
  return "bg-secondary text-muted-foreground border-border/30";
}

export function EplFixturesWidget() {
  const [data, setData] = useState<EplRoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchFixtures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sports/epl");
      if (!res.ok) throw new Error("EPL 경기 일정을 불러오지 못했습니다.");
      const json: EplRoundData = await res.json();
      if ((json as any).error) throw new Error((json as any).error);
      setData(json);
    } catch (e: any) {
      setError(e.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchFixtures();
  }, [fetchFixtures]);

  const fixtures = data?.fixtures || [];

  return (
    <div className="w-full flex flex-col h-auto bg-card border border-border overflow-hidden transition-all duration-300 hover:bg-neutral-50/50">
      {/* 1. IDE Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0 select-none">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
            <Trophy className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> 프리미어리그 다음 라운드 경기 일정 (10경기)
          </span>

          {/* 슬롯 상단: 500회 중 쿼터 사용량 배지 */}
          {data?.oddsQuota && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-background/90 border border-border/60 text-[9.5px] font-mono shadow-xs">
              <span className="text-muted-foreground">API 쿼터:</span>
              <strong className="text-primary font-black">{data.oddsQuota.used}</strong>
              <span className="text-muted-foreground/60">/</span>
              <span className="text-foreground">{data.oddsQuota.total || 500}회 사용</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">잔여 {data.oddsQuota.remaining}회</span>
              <span className="text-[8px] font-sans px-1 py-0.2 bg-secondary text-muted-foreground font-semibold ml-0.5 border border-border/30">
                24h 캐시
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 select-none">
          <span className="stamp-red text-[8.5px] font-bold px-1.5 py-0.5 border border-primary/20 bg-primary/5 text-primary">
            {data?.roundTitle || "EPL 다음 라운드"}
          </span>
          <button
            onClick={fetchFixtures}
            disabled={loading}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 bg-secondary/20 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black tracking-wider uppercase">
            ROUND {data?.roundNumber || "-"}
          </span>
          <h3 className="text-[14px] font-extrabold text-foreground font-sans tracking-tight">
            {data?.roundTitle || "프리미어리그 10경기 대진표"}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5 text-[9.5px]">
            <span className="text-muted-foreground/80">순위 범례:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">1~6위 (강팀)</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-red-600 dark:text-red-400 font-bold">15~20위 (강등권)</span>
          </div>
          <span className="opacity-40">|</span>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary" />
            <span>기간: <strong className="text-foreground">{data?.periodText || "-"}</strong></span>
          </div>
          <span className="opacity-40">|</span>
          <div>
            <span>총 <strong className="text-foreground font-bold">{fixtures.length}</strong>경기</span>
          </div>
        </div>
      </div>

      {/* 3. Main Fixtures Grid (Left 5 matches, Right 5 matches) */}
      <div className="p-4">
        {!mounted || (loading && !data) ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-muted-foreground text-[11px] font-mono">
              20개 팀 다음 라운드 대진표 로딩 중...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
            <span className="text-[11px] text-red-500 font-sans">{error}</span>
            <button
              onClick={fetchFixtures}
              className="mt-3 text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : fixtures.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[11px] font-mono">
            예정된 다음 라운드 경기가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {fixtures.map((match, idx) => {
              const isFinished = match.status === "종료";
              const isLive = match.status === "진행중";
              const hasScore = match.homeTeamScore !== null && match.homeTeamScore !== undefined;

              const isHomeWin = isFinished && hasScore && (match.homeTeamScore! > match.awayTeamScore!);
              const isAwayWin = isFinished && hasScore && (match.awayTeamScore! > match.homeTeamScore!);

              return (
                <div
                  key={match.gameId || idx}
                  className="flex flex-col justify-between p-2.5 sm:p-3 bg-card hover:bg-secondary/35 rounded-none border border-border/40 transition-all duration-150 shadow-sm hover:shadow"
                >
                  {/* 상단: 일시, 상태/D-Day 배지 */}
                  <div className="flex items-center justify-between border-b border-border/20 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-bold text-foreground font-mono">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span>{formatKoreanDate(match.gameDate)}</span>
                      {!isFinished && <span className="text-primary font-black ml-0.5">{match.gameTime}</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.2 border select-none ${
                          isFinished
                            ? "bg-secondary text-muted-foreground/80 border-border/40"
                            : isLive
                            ? "bg-red-500 text-white border-red-600 animate-pulse"
                            : match.dDay === 0
                            ? "bg-red-500 text-white border-red-600 animate-pulse"
                            : match.dDay <= 3
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                            : "bg-secondary text-muted-foreground border-border/40"
                        }`}
                      >
                        {isFinished ? "경기종료" : match.dDayText}
                      </span>
                      <span className="text-[8.5px] font-bold px-1 py-0.2 bg-secondary/80 text-muted-foreground/80 border border-border/20">
                        MATCH {idx + 1}
                      </span>
                    </div>
                  </div>

                  {/* 중앙: 대진 (홈팀 vs 원정팀 / 스코어) */}
                  <div className="grid grid-cols-5 items-center py-1">
                    {/* 홈팀 */}
                    <div className="col-span-2 flex flex-col items-end text-right pr-2">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {match.homeTeamRank && (
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 border shrink-0 ${getRankBadgeClass(match.homeTeamRank)}`}
                          >
                            {match.homeTeamRank}위
                          </span>
                        )}
                        <span
                          className={`text-[13.5px] font-sans tracking-tight break-keep leading-tight ${
                            isFinished && !isHomeWin && match.homeTeamScore !== match.awayTeamScore
                              ? "text-muted-foreground font-semibold"
                              : "text-foreground font-black"
                          }`}
                        >
                          {match.homeTeam}
                        </span>
                      </div>
                      <span className="text-[8.5px] font-semibold text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                        HOME
                      </span>
                    </div>

                    {/* 중앙 (스코어 또는 VS) */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      {isFinished || isLive ? (
                        <div className="flex items-center gap-1 px-2.5 py-0.5 bg-secondary/90 border border-border/60">
                          <span className={`text-[15px] font-black font-mono leading-none ${isHomeWin ? "text-primary" : "text-foreground"}`}>
                            {match.homeTeamScore ?? 0}
                          </span>
                          <span className="text-[12px] text-muted-foreground font-mono leading-none">:</span>
                          <span className={`text-[15px] font-black font-mono leading-none ${isAwayWin ? "text-primary" : "text-foreground"}`}>
                            {match.awayTeamScore ?? 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-secondary text-muted-foreground border border-border/30 rounded-none tracking-wider">
                          VS
                        </span>
                      )}
                    </div>

                    {/* 원정팀 */}
                    <div className="col-span-2 flex flex-col items-start text-left pl-2">
                      <div className="flex items-center gap-1.5 justify-start flex-wrap">
                        <span
                          className={`text-[13.5px] font-sans tracking-tight break-keep leading-tight ${
                            isFinished && !isAwayWin && match.homeTeamScore !== match.awayTeamScore
                              ? "text-muted-foreground font-semibold"
                              : "text-foreground font-black"
                          }`}
                        >
                          {match.awayTeam}
                        </span>
                        {match.awayTeamRank && (
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 border shrink-0 ${getRankBadgeClass(match.awayTeamRank)}`}
                          >
                            {match.awayTeamRank}위
                          </span>
                        )}
                      </div>
                      <span className="text-[8.5px] font-semibold text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                        AWAY
                      </span>
                    </div>
                  </div>

                  {/* 해외 실시간 북메이커 배당 & 승률 분석 (24시간 캐시) */}
                  {match.odds ? (
                    <div className="mt-2 pt-1.5 border-t border-dashed border-border/40 flex flex-col gap-1 bg-secondary/15 px-2 py-1.5 rounded-none">
                      <div className="flex items-center justify-between text-[9.5px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold px-1 py-0.2 bg-secondary text-muted-foreground border border-border/30">
                            시장배당
                          </span>
                          <span className="font-bold text-foreground">
                            홈 {match.odds.homeOdds.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-medium text-muted-foreground">
                            무 {match.odds.drawOdds.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-bold text-foreground">
                            원정 {match.odds.awayOdds.toFixed(2)}
                          </span>
                        </div>

                        <span
                          className={`text-[8px] font-mono font-extrabold px-1.5 py-0.2 border select-none ${
                            match.odds.pick.includes("우세")
                              ? "bg-primary/10 text-primary border-primary/30 font-bold"
                              : "bg-secondary text-muted-foreground border-border/30"
                          }`}
                        >
                          {match.odds.pick}
                        </span>
                      </div>

                      {/* 시장 승리 확률 */}
                      <div className="flex items-center justify-between text-[8.5px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground/80">승률:</span>
                          <span className="text-foreground font-extrabold">홈 {match.odds.homeProb}%</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>무 {match.odds.drawProb}%</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-foreground font-extrabold">원정 {match.odds.awayProb}%</span>
                        </div>
                        <span className="text-[7.5px] text-muted-foreground/60 hidden sm:inline">
                          {match.odds.bookmakerCount}개 북메이커 집계
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* 하단: 스타디움 */}
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono mt-1.5 pt-1.5 border-t border-border/10">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{match.stadium}</span>
                    </div>
                    <span className="text-[8.5px] text-primary/80 font-sans font-semibold shrink-0">
                      {isFinished ? "종료됨" : match.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Footer */}
      <div className="px-4 py-2 bg-secondary/30 border-t border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[8.5px] font-mono text-muted-foreground shrink-0 select-none">
        <span>프리미어리그 20개 팀 단일 라운드(10경기) 전 경기 편성</span>
        <span>
          데이터 출처: 네이버 스포츠 (일정/순위) · The Odds API (24시간 캐시 적용, 쿼터 잔여 {data?.oddsQuota?.remaining ?? 474}/500회)
        </span>
      </div>
    </div>
  );
}
