import { NextResponse } from "next/server";
import http2 from "node:http2";
import eplFallbackData from "@/lib/epl-fallback-data.json";

export const dynamic = "force-dynamic";

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
  gameDate: string; // YYYY-MM-DD
  gameTime: string; // HH:mm (한국시간)
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

const THE_ODDS_TEAM_MAP: Record<string, string> = {
  "Arsenal": "아스널",
  "Aston Villa": "애스턴 빌라",
  "Bournemouth": "본머스",
  "Brentford": "브렌트퍼드",
  "Brighton and Hove Albion": "브라이턴",
  "Chelsea": "첼시",
  "Coventry City": "코벤트리",
  "Crystal Palace": "크리스털",
  "Everton": "에버턴",
  "Fulham": "풀럼",
  "Hull City": "헐 시티",
  "Ipswich Town": "입스위치",
  "Leeds United": "리즈",
  "Leicester City": "레스터",
  "Liverpool": "리버풀",
  "Manchester City": "맨시티",
  "Manchester United": "맨유",
  "Newcastle United": "뉴캐슬",
  "Nottingham Forest": "노팅엄",
  "Southampton": "사우샘프턴",
  "Sunderland": "선덜랜드",
  "Tottenham Hotspur": "토트넘",
  "Wolverhampton Wanderers": "울버햄프턴",
  "West Ham United": "웨스트햄",
  "West Ham": "웨스트햄"
};

// 홈팀 기준 EPL 20개 구단 전용 홈구장 매핑
const TEAM_STADIUM_MAP: Record<string, string> = {
  "아스널": "에미레이츠 스타디움",
  "헐 시티": "MKM 스타디움",
  "노팅엄": "더 시티 그라운드",
  "에버턴": "힐 디킨슨 스타디움",
  "입스위치": "포트먼 로드",
  "브렌트퍼드": "지테크 커뮤니티 스타디움",
  "맨시티": "에티하드 스타디움",
  "브라이턴": "아메리칸 익스프레스 스타디움",
  "뉴캐슬": "세인트 제임스 파크",
  "풀럼": "크레이븐 코티지",
  "크리스털": "셀허스트 파크",
  "리버풀": "안필드",
  "본머스": "바이탈리티 스타디움",
  "코벤트리": "코벤트리 빌딩 소사이어티 아레나",
  "토트넘": "토트넘 홋스퍼 스타디움",
  "리즈": "엘런드 로드",
  "첼시": "스탬퍼드 브리지",
  "선덜랜드": "스타디움 오브 라이트",
  "맨유": "올드 트래퍼드",
  "애스턴 빌라": "빌라 파크",
  "레스터": "킹 파워 스타디움",
  "사우샘프턴": "세인트 메리스 스타디움",
  "울버햄프턴": "몰리뉴 스타디움",
  "웨스트햄": "런던 스타디움"
};

export interface OddsMatchItem {
  id: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  odds: EplOdds | null;
}

// 24시간 엄격 캐시 (밀리초: 24시간 = 86,400,000ms)
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface CachedOddsState {
  timestamp: number;
  oddsMap: Record<string, EplOdds>;
  oddsMatches: OddsMatchItem[];
  quota: OddsQuota;
}

// 개발 서버 HMR(Hot Module Reload) 중에도 쿼터가 재소모되지 않도록 globalThis 캐시 적용
const globalOddsCache: { current?: CachedOddsState } = 
  ((globalThis as any).__eplOddsCache = (globalThis as any).__eplOddsCache || {});

async function fetchEplOddsWith24hCache(): Promise<{
  oddsMap: Record<string, EplOdds>;
  oddsMatches: OddsMatchItem[];
  quota: OddsQuota;
}> {
  // 1. 이미 24시간 이내에 가져온 캐시(oddsMatches 포함)가 존재하면 외부 API를 전혀 호출하지 않고 즉시 반환
  if (
    globalOddsCache.current &&
    Array.isArray(globalOddsCache.current.oddsMatches) &&
    globalOddsCache.current.oddsMatches.length > 0 &&
    Date.now() - globalOddsCache.current.timestamp < TWENTY_FOUR_HOURS_MS
  ) {
    return {
      oddsMap: globalOddsCache.current.oddsMap,
      oddsMatches: globalOddsCache.current.oddsMatches,
      quota: globalOddsCache.current.quota
    };
  }

  const apiKey = process.env.ODDS_API_KEY || "78271d294987ad62ec5e34767dbbb119";
  const defaultQuota: OddsQuota = {
    used: 25,
    remaining: 475,
    total: 500,
    lastUpdated: new Date().toISOString()
  };

  try {
    // regions=uk (단 1크레딧만 소모하여 쿼터 최적화)
    const res = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${apiKey}&regions=uk&markets=h2h`, {
      cache: "no-store"
    });

    // 헤더에서 실시간 쿼터(사용량/잔여량) 추출
    const usedHeader = res.headers.get("x-requests-used");
    const remainingHeader = res.headers.get("x-requests-remaining");

    const used = usedHeader ? Number(usedHeader) : (globalOddsCache.current?.quota.used ?? 25);
    const remaining = remainingHeader ? Number(remainingHeader) : (globalOddsCache.current?.quota.remaining ?? 475);
    const total = used + remaining > 0 ? used + remaining : 500;

    const quota: OddsQuota = {
      used,
      remaining,
      total,
      lastUpdated: new Date().toISOString()
    };

    if (!res.ok) {
      console.warn("The Odds API HTTP error:", res.status);
      if (globalOddsCache.current) {
        return {
          oddsMap: globalOddsCache.current.oddsMap,
          oddsMatches: globalOddsCache.current.oddsMatches || [],
          quota
        };
      }
      return { oddsMap: {}, oddsMatches: [], quota };
    }

    const data = await res.json();
    const oddsMap: Record<string, EplOdds> = {};
    const oddsMatches: OddsMatchItem[] = [];

    if (Array.isArray(data)) {
      const sorted = [...data].sort(
        (a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
      );

      for (const m of sorted) {
        const h_kr = THE_ODDS_TEAM_MAP[m.home_team] || m.home_team;
        const a_kr = THE_ODDS_TEAM_MAP[m.away_team] || m.away_team;
        const h_prices: number[] = [];
        const d_prices: number[] = [];
        const a_prices: number[] = [];

        const bookmakers = m.bookmakers || [];
        for (const b of bookmakers) {
          for (const market of b.markets || []) {
            if (market.key === "h2h") {
              for (const oc of market.outcomes || []) {
                if (oc.name === m.home_team && oc.price > 1) h_prices.push(oc.price);
                else if (oc.name === m.away_team && oc.price > 1) a_prices.push(oc.price);
                else if (oc.name === "Draw" && oc.price > 1) d_prices.push(oc.price);
              }
            }
          }
        }

        let oddsObj: EplOdds | null = null;
        if (h_prices.length > 0 && d_prices.length > 0 && a_prices.length > 0) {
          const avg_h = h_prices.reduce((a, b) => a + b, 0) / h_prices.length;
          const avg_d = d_prices.reduce((a, b) => a + b, 0) / d_prices.length;
          const avg_a = a_prices.reduce((a, b) => a + b, 0) / a_prices.length;

          const raw_h = 1.0 / avg_h;
          const raw_d = 1.0 / avg_d;
          const raw_a = 1.0 / avg_a;
          const totalProb = raw_h + raw_d + raw_a;

          const p_h = Math.round((raw_h / totalProb) * 1000) / 10;
          const p_d = Math.round((raw_d / totalProb) * 1000) / 10;
          const p_a = Math.round((raw_a / totalProb) * 1000) / 10;

          let pick = "백중세";
          if (p_h >= p_a + 10) pick = "홈승 우세";
          else if (p_a >= p_h + 10) pick = "원정승 우세";
          else if (p_h > p_a) pick = "홈 약우세";
          else if (p_a > p_h) pick = "원정 약우세";

          oddsObj = {
            homeOdds: Math.round(avg_h * 100) / 100,
            drawOdds: Math.round(avg_d * 100) / 100,
            awayOdds: Math.round(avg_a * 100) / 100,
            homeProb: p_h,
            drawProb: p_d,
            awayProb: p_a,
            pick,
            bookmakerCount: bookmakers.length
          };

          oddsMap[`${h_kr}_${a_kr}`] = oddsObj;
        }

        oddsMatches.push({
          id: m.id || `${h_kr}_${a_kr}`,
          commenceTime: m.commence_time || "",
          homeTeam: h_kr,
          awayTeam: a_kr,
          odds: oddsObj
        });
      }
    }

    // 24시간 동안 보존할 캐시 갱신
    globalOddsCache.current = {
      timestamp: Date.now(),
      oddsMap,
      oddsMatches,
      quota
    };

    return { oddsMap, oddsMatches, quota };
  } catch (e) {
    console.error("fetchEplOddsWith24hCache error:", e);
    if (globalOddsCache.current) {
      return {
        oddsMap: globalOddsCache.current.oddsMap,
        oddsMatches: globalOddsCache.current.oddsMatches || [],
        quota: globalOddsCache.current.quota
      };
    }
    return { oddsMap: {}, oddsMatches: [], quota: defaultQuota };
  }
}

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const globalNaverCache: Record<string, { timestamp: number; data: any }> =
  ((globalThis as any).__eplNaverCache = (globalThis as any).__eplNaverCache || {});

// 1순위: Node.js HTTP/2 클라이언트 (브라우저와 동일한 h2 프로토콜)
function fetchViaHttp2(urlStr: string, timeoutMs = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = http2.connect(u.origin);
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        client.destroy();
        reject(new Error(`HTTP/2 timeout (${timeoutMs}ms)`));
      }
    }, timeoutMs);

    client.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        client.destroy();
        reject(err);
      }
    });

    const req = client.request({
      ":method": "GET",
      ":path": u.pathname + u.search,
      ":scheme": u.protocol.replace(":", ""),
      ":authority": u.host,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "application/json, text/plain, */*",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    req.setEncoding("utf8");
    let raw = "";
    let statusCode = 0;

    req.on("response", (headers) => {
      statusCode = Number(headers[":status"] || 0);
    });

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        client.close();
        if (statusCode >= 200 && statusCode < 300) {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP/2 status ${statusCode}`));
        }
      }
    });

    req.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        client.destroy();
        reject(err);
      }
    });

    req.end();
  });
}

// 2순위: ESPN 공개 EPL 순위 API 조회 + 로컬 2026-27 시즌 순위 데이터 결합
async function fetchFallbackRankMap(): Promise<Record<string, number>> {
  const rankMap: Record<string, number> = { ...(eplFallbackData.ranks as Record<string, number>) };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch("https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const entries = json?.children?.[0]?.standings?.entries || [];
      for (const entry of entries) {
        const engName = entry?.team?.displayName || entry?.team?.name || "";
        const rankStat = (entry?.stats || []).find((s: any) => s.name === "rank");
        const rank = Number(rankStat?.value);
        if (engName && rank > 0) {
          const krName = THE_ODDS_TEAM_MAP[engName];
          if (krName) rankMap[krName] = rank;
        }
      }
    }
  } catch {
    // ESPN API 실패 시에도 eplFallbackData.ranks 유지
  }
  return rankMap;
}

// 네이버 스포츠 EPL 20개 팀 현재 순위 맵 조회 (실패 시 즉시 대체 순위 사용)
async function fetchEplRankMap(): Promise<Record<string, number>> {
  const cached = globalNaverCache["ranks"];
  if (cached && Date.now() - cached.timestamp < THIRTY_MINUTES_MS) {
    return cached.data;
  }

  const rankMap: Record<string, number> = {};
  try {
    const teamsJson = await fetchViaHttp2(
      "https://api-gw.sports.naver.com/statistics/categories/epl/seasons/gMoc/teams",
      1500
    );
    const teams = teamsJson?.result?.seasonTeamStats || [];
    teams.forEach((t: any) => {
      const rank = Number(t.rank);
      if (t.teamName) rankMap[t.teamName] = rank;
      if (t.teamShortName) rankMap[t.teamShortName] = rank;
    });
    if (Object.keys(rankMap).length > 0) {
      globalNaverCache["ranks"] = { timestamp: Date.now(), data: rankMap };
      return rankMap;
    }
  } catch {
    // 네이버 API 차단/타임아웃 시 대체 순위로 즉시 전환
  }

  const fallbackRanks = await fetchFallbackRankMap();
  globalNaverCache["ranks"] = { timestamp: Date.now(), data: fallbackRanks };
  return fallbackRanks;
}

async function fetchEplScheduleGames(): Promise<any[]> {
  const cached = globalNaverCache["schedule"];
  if (cached && Date.now() - cached.timestamp < THIRTY_MINUTES_MS) {
    return cached.data;
  }

  try {
    const json = await fetchViaHttp2(
      "https://api-gw.sports.naver.com/schedule/games?fields=basic,superCategoryId,categoryName,stadium,statusInfo,live,round,title,specialId,hasVideo,gameVideoInfo,bracket,series&categoryId=epl&fromDate=2026-08-01&toDate=2027-05-31&size=500",
      1500
    );
    const games = json?.result?.games || [];
    if (games.length > 0) {
      globalNaverCache["schedule"] = { timestamp: Date.now(), data: games };
      return games;
    }
  } catch {
    // 네이버 API 차단/타임아웃 시 내장된 2026-27 시즌 380경기 전체 대진표로 즉시 전환
  }

  const fallbackGames = eplFallbackData.games || [];
  globalNaverCache["schedule"] = { timestamp: Date.now(), data: fallbackGames };
  return fallbackGames;
}

export async function GET() {
  try {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const todayStr = kstNow.toISOString().split("T")[0];

    // 팀 순위 및 24시간 캐시된 The Odds API (경기 일정 + 배당률) 병렬 조회
    const [rankMap, { oddsMap, oddsMatches, quota }] = await Promise.all([
      fetchEplRankMap(),
      fetchEplOddsWith24hCache()
    ]);

    const fallbackGames: any[] = eplFallbackData.games || [];

    // 1순위: The Odds API에서 제공하는 실시간 예정 경기 일정(10경기)으로 대진표 구성
    if (oddsMatches && oddsMatches.length > 0) {
      const nextTen = oddsMatches.slice(0, 10);

      // 첫 번째 경기의 대진 또는 날짜를 기준으로 현재 라운드 번호 산출
      const firstMatch = nextTen[0];
      const matchedIdx = fallbackGames.findIndex(
        (g: any) => g.homeTeamName === firstMatch.homeTeam && g.awayTeamName === firstMatch.awayTeam
      );
      const pastCount = fallbackGames.filter((g: any) => g.gameDate && g.gameDate < todayStr).length;
      const activeRoundNum =
        matchedIdx >= 0
          ? Math.min(38, Math.floor(matchedIdx / 10) + 1)
          : Math.min(38, Math.floor(pastCount / 10) + 1);
      const roundTitle = `2026-27 프리미어리그 제 ${activeRoundNum}라운드`;

      const fixtures: EplFixture[] = nextTen.map((m) => {
        const utcMs = m.commenceTime ? new Date(m.commenceTime).getTime() : Date.now();
        const kstDate = new Date(utcMs + kstOffset);
        const kstIso = kstDate.toISOString();
        const gDate = kstIso.split("T")[0];
        const timePart = kstIso.split("T")[1].slice(0, 5);
        const gDateTime = `${gDate}T${timePart}:00`;

        const homeTeam = m.homeTeam;
        const awayTeam = m.awayTeam;
        const homeTeamRank = rankMap[homeTeam] ?? null;
        const awayTeamRank = rankMap[awayTeam] ?? null;
        const stadium = TEAM_STADIUM_MAP[homeTeam] || "홈구장";

        const isStarted = now.getTime() >= utcMs && now.getTime() < utcMs + 2 * 60 * 60 * 1000;
        const isResult = now.getTime() >= utcMs + 2 * 60 * 60 * 1000;
        const status: "예정" | "진행중" | "종료" = isResult ? "종료" : isStarted ? "진행중" : "예정";
        const statusInfo = isResult ? "경기종료" : isStarted ? "LIVE" : "예정";

        let dDay = 0;
        let dDayText = "D-Day";
        if (isResult) {
          dDayText = "종료";
        } else if (isStarted) {
          dDayText = "LIVE";
        } else if (gDate) {
          const diffMs = new Date(gDate).getTime() - new Date(todayStr).getTime();
          dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (dDay === 0) dDayText = "오늘";
          else if (dDay === 1) dDayText = "내일";
          else if (dDay > 1) dDayText = `D-${dDay}`;
          else dDayText = "오늘";
        }

        return {
          gameId: m.id,
          gameDate: gDate,
          gameTime: timePart || "시간 미정",
          gameDateTime: gDateTime,
          homeTeam,
          homeTeamRank,
          homeTeamScore: null,
          awayTeam,
          awayTeamRank,
          awayTeamScore: null,
          stadium,
          status,
          statusInfo,
          dDay,
          dDayText,
          odds: m.odds
        };
      });

      let periodText = "";
      if (fixtures.length > 0) {
        const firstDate = fixtures[0].gameDate.slice(5).replace("-", ".");
        const lastDate = fixtures[fixtures.length - 1].gameDate.slice(5).replace("-", ".");
        periodText = `${firstDate} ~ ${lastDate}`;
      }

      return NextResponse.json({
        roundNumber: activeRoundNum,
        roundTitle,
        periodText,
        fixtures,
        updatedAt: new Date().toISOString(),
        oddsQuota: quota
      });
    }

    // 2순위 (Fallback): The Odds API에 예정 경기가 없을 때 시즌 일정 데이터 사용
    const rawGames = await fetchEplScheduleGames();

    // 과거 날짜(todayStr 이전) 경기는 이미 종료된 것으로 보정
    const games = rawGames.map((g: any) => {
      if (g.statusCode !== "RESULT" && g.gameDate && g.gameDate < todayStr) {
        return { ...g, statusCode: "RESULT", statusInfo: "경기종료" };
      }
      return g;
    });

    // 종료된 경기 수 카운트
    const finishedCount = games.filter((g: any) => g.statusCode === "RESULT").length;

    // 현재/다음 진행할 라운드 번호 계산 (총 38라운드)
    // 예: 50경기 종료 시 -> 6라운드, 10경기 중 일부가 끝나도 6라운드 유지, 60경기 모두 끝나면 7라운드로 전환
    const activeRoundNum = Math.min(38, Math.floor(finishedCount / 10) + 1);
    const roundTitle = `2026-27 프리미어리그 제 ${activeRoundNum}라운드`;

    // 해당 라운드의 고정 10개 경기 슬라이스 (인덱스: (round-1)*10 ~ round*10)
    const startIndex = (activeRoundNum - 1) * 10;
    const roundMatches = games.slice(startIndex, startIndex + 10);

    const fixtures: EplFixture[] = roundMatches.map((g: any) => {
      const gDate = g.gameDate || "";
      const gDateTime = g.gameDateTime || "";
      const timePart = gDateTime.includes("T") ? gDateTime.split("T")[1].slice(0, 5) : "";

      const homeTeam = g.homeTeamName || "홈팀";
      const awayTeam = g.awayTeamName || "원정팀";

      const homeTeamRank = rankMap[homeTeam] ?? null;
      const awayTeamRank = rankMap[awayTeam] ?? null;

      // 24시간 캐시된 배당 매핑
      const oddsKey = `${homeTeam}_${awayTeam}`;
      let odds = oddsMap[oddsKey] || null;
      if (!odds) {
        const foundKey = Object.keys(oddsMap).find(k => {
          const [h, a] = k.split("_");
          return (homeTeam.includes(h) || h.includes(homeTeam)) && (awayTeam.includes(a) || a.includes(awayTeam));
        });
        if (foundKey) odds = oddsMap[foundKey];
      }

      const isResult = g.statusCode === "RESULT";
      const isStarted = g.statusCode === "STARTED";

      const homeTeamScore = (isResult || isStarted) && g.homeTeamScore !== undefined && g.homeTeamScore !== null
        ? Number(g.homeTeamScore)
        : null;
      const awayTeamScore = (isResult || isStarted) && g.awayTeamScore !== undefined && g.awayTeamScore !== null
        ? Number(g.awayTeamScore)
        : null;

      const status: "예정" | "진행중" | "종료" = isResult ? "종료" : (isStarted ? "진행중" : "예정");
      const statusInfo = g.statusInfo || (isResult ? "경기종료" : (isStarted ? "LIVE" : "예정"));

      // D-Day 계산
      let dDay = 0;
      let dDayText = "D-Day";
      if (isResult) {
        dDayText = "종료";
      } else if (isStarted) {
        dDayText = "LIVE";
      } else if (gDate) {
        const diffMs = new Date(gDate).getTime() - new Date(todayStr).getTime();
        dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (dDay === 0) dDayText = "오늘";
        else if (dDay === 1) dDayText = "내일";
        else if (dDay > 1) dDayText = `D-${dDay}`;
        else dDayText = "경기중";
      }

      return {
        gameId: g.gameId || "",
        gameDate: gDate,
        gameTime: timePart || "시간 미정",
        gameDateTime: gDateTime,
        homeTeam,
        homeTeamRank,
        homeTeamScore,
        awayTeam,
        awayTeamRank,
        awayTeamScore,
        stadium: g.stadium || "홈구장",
        status,
        statusInfo,
        dDay,
        dDayText,
        odds
      };
    });

    // 라운드 기간 포맷팅 (예: 10.10 ~ 10.13)
    let periodText = "";
    if (fixtures.length > 0) {
      const firstDate = fixtures[0].gameDate.slice(5).replace("-", ".");
      const lastDate = fixtures[fixtures.length - 1].gameDate.slice(5).replace("-", ".");
      periodText = `${firstDate} ~ ${lastDate}`;
    }

    const payload: EplRoundData = {
      roundNumber: activeRoundNum,
      roundTitle,
      periodText,
      fixtures,
      updatedAt: new Date().toISOString(),
      oddsQuota: quota
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("EPL fixtures API error:", error);
    return NextResponse.json(
      {
        error: error.message || "프리미어리그 경기 일정을 불러오지 못했습니다.",
        roundNumber: 0,
        roundTitle: "프리미어리그 경기 일정",
        periodText: "",
        fixtures: []
      },
      { status: 500 }
    );
  }
}
