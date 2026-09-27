import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30분 캐시

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

// 24시간 엄격 캐시 (밀리초: 24시간 = 86,400,000ms)
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface CachedOddsState {
  timestamp: number;
  oddsMap: Record<string, EplOdds>;
  quota: OddsQuota;
}

// 개발 서버 HMR(Hot Module Reload) 중에도 쿼터가 재소모되지 않도록 globalThis 캐시 적용
const globalOddsCache: { current?: CachedOddsState } = 
  ((globalThis as any).__eplOddsCache = (globalThis as any).__eplOddsCache || {});

async function fetchEplOddsWith24hCache(): Promise<{ oddsMap: Record<string, EplOdds>; quota: OddsQuota }> {
  // 1. 이미 24시간 이내에 가져온 캐시가 존재하면 외부 API를 전혀 호출하지 않고 즉시 반환
  if (globalOddsCache.current && (Date.now() - globalOddsCache.current.timestamp < TWENTY_FOUR_HOURS_MS)) {
    return {
      oddsMap: globalOddsCache.current.oddsMap,
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
      next: { revalidate: 86400 } // 24시간 Next.js 캐시
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
        return { oddsMap: globalOddsCache.current.oddsMap, quota };
      }
      return { oddsMap: {}, quota };
    }

    const data = await res.json();
    const oddsMap: Record<string, EplOdds> = {};

    if (Array.isArray(data)) {
      for (const m of data) {
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

          const oddsObj: EplOdds = {
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
      }
    }

    // 24시간 동안 보존할 캐시 갱신
    globalOddsCache.current = {
      timestamp: Date.now(),
      oddsMap,
      quota
    };

    return { oddsMap, quota };
  } catch (e) {
    console.error("fetchEplOddsWith24hCache error:", e);
    if (globalOddsCache.current) {
      return { oddsMap: globalOddsCache.current.oddsMap, quota: globalOddsCache.current.quota };
    }
    return { oddsMap: {}, quota: defaultQuota };
  }
}

// 네이버 스포츠 EPL 20개 팀 현재 순위 맵 조회
async function fetchEplRankMap(): Promise<Record<string, number>> {
  const rankMap: Record<string, number> = {};
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://m.sports.naver.com/",
      "Origin": "https://m.sports.naver.com"
    };

    let seasonCode = "gMoc";
    try {
      const sRes = await fetch("https://api-gw.sports.naver.com/statistics/categories/epl/seasons", {
        headers,
        next: { revalidate: 3600 }
      });
      if (sRes.ok) {
        const sJson = await sRes.json();
        const seasons = sJson.result?.seasons || [];
        const cur = seasons.find((s: any) => s.isSeason === "Y") || seasons[seasons.length - 1];
        if (cur?.seasonCode) seasonCode = cur.seasonCode;
      }
    } catch (e) {
      console.warn("Season code fetch fallback:", e);
    }

    const teamsRes = await fetch(`https://api-gw.sports.naver.com/statistics/categories/epl/seasons/${seasonCode}/teams`, {
      headers,
      next: { revalidate: 1800 }
    });

    if (teamsRes.ok) {
      const teamsJson = await teamsRes.json();
      const teams = teamsJson.result?.seasonTeamStats || [];
      teams.forEach((t: any) => {
        const rank = Number(t.rank);
        if (t.teamName) rankMap[t.teamName] = rank;
        if (t.teamShortName) rankMap[t.teamShortName] = rank;
      });
    }
  } catch (err) {
    console.error("Failed to fetch EPL team ranks:", err);
  }
  return rankMap;
}

export async function GET() {
  try {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const todayStr = kstNow.toISOString().split("T")[0];

    // 경기 일정, 팀 순위, 24시간 캐시된 실시간 배당 데이터를 병렬 조회
    const [scheduleRes, rankMap, { oddsMap, quota }] = await Promise.all([
      fetch("https://api-gw.sports.naver.com/schedule/games?fields=basic,superCategoryId,categoryName,stadium,statusInfo,live,round,title,specialId,hasVideo,gameVideoInfo,bracket,series&categoryId=epl&fromDate=2026-08-01&toDate=2027-05-31&size=500", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://m.sports.naver.com/",
          "Origin": "https://m.sports.naver.com"
        },
        next: { revalidate: 1800 }
      }),
      fetchEplRankMap(),
      fetchEplOddsWith24hCache()
    ]);

    if (!scheduleRes.ok) {
      throw new Error(`Naver Sports API failed (${scheduleRes.status})`);
    }

    const json = await scheduleRes.json();
    const games = json.result?.games || [];

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
