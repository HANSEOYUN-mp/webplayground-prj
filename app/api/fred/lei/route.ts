import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRED_API_KEY = process.env.FRED_API_KEY || "a5fb526d8a9a53e9ef2fdda187955a40";

export interface LeiDataPoint {
  date: string; // YYYY-MM
  us?: number;
  kr?: number;
  jp?: number;
  usYoy?: number; // YoY % change
  krYoy?: number; // YoY % change
  jpYoy?: number; // YoY % change
}

export interface LeiCountrySummary {
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

export interface LeiApiResponse {
  summary: {
    us: LeiCountrySummary;
    kr: LeiCountrySummary;
    jp: LeiCountrySummary;
  };
  history: LeiDataPoint[];
  updatedAt: string;
}

let cachedResponse: LeiApiResponse | null = null;
let cacheTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

function classifyPhase(current: number, changeMom: number): {
  phase: "expansion" | "slowdown" | "downturn" | "recovery";
  phaseLabel: string;
} {
  if (current >= 100 && changeMom >= 0) {
    return { phase: "expansion", phaseLabel: "확장 국면 (100↑ · 전월비 상승)" };
  }
  if (current >= 100 && changeMom < 0) {
    return { phase: "slowdown", phaseLabel: "둔화 국면 (100↑ · 전월비 하락)" };
  }
  if (current < 100 && changeMom >= 0) {
    return { phase: "recovery", phaseLabel: "회복 국면 (100↓ · 전월비 상승)" };
  }
  return { phase: "downturn", phaseLabel: "수축 국면 (100↓ · 전월비 하락)" };
}

function getPrevYearMonth(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  const y = parseInt(yStr, 10);
  if (isNaN(y)) return ym;
  return `${y - 1}-${mStr}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bypass = searchParams.get("bypassCache") === "true";

  const now = Date.now();
  if (!bypass && cachedResponse && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const seriesList = [
      { id: "USALOLITOAASTSAM", key: "us" as const },
      { id: "KORLOLITOAASTSAM", key: "kr" as const },
      { id: "JPNLOLITOAASTSAM", key: "jp" as const },
    ];

    const results = await Promise.all(
      seriesList.map(async (s) => {
        // 1989-01-01부터 조회하여 1990-01의 전년 동월 대비(YoY %) 계산이 가능하도록 함
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${FRED_API_KEY}&file_type=json&observation_start=1989-01-01&frequency=m&aggregation_method=avg`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`FRED API fetch failed for ${s.id} (${res.status})`);
        }
        const data = await res.json();
        return { key: s.key, id: s.id, observations: data.observations || [] };
      })
    );

    const dateMap: Record<string, LeiDataPoint> = {};

    for (const item of results) {
      for (const obs of item.observations) {
        if (!obs.value || obs.value === ".") continue;
        const val = parseFloat(obs.value);
        if (isNaN(val)) continue;
        const ym = String(obs.date).slice(0, 7); // YYYY-MM
        if (!dateMap[ym]) {
          dateMap[ym] = { date: ym };
        }
        dateMap[ym][item.key] = Math.round(val * 100) / 100;
      }
    }

    const history = Object.values(dateMap)
      .filter(
        (pt) =>
          pt.date >= "1990-01" &&
          (pt.us !== undefined || pt.kr !== undefined || pt.jp !== undefined)
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((pt) => {
        const prevYm = getPrevYearMonth(pt.date);
        const prevYearPt = dateMap[prevYm];

        const usYoy =
          pt.us !== undefined && prevYearPt?.us !== undefined && prevYearPt.us !== 0
            ? Math.round(((pt.us - prevYearPt.us) / prevYearPt.us) * 10000) / 100
            : undefined;

        const krYoy =
          pt.kr !== undefined && prevYearPt?.kr !== undefined && prevYearPt.kr !== 0
            ? Math.round(((pt.kr - prevYearPt.kr) / prevYearPt.kr) * 10000) / 100
            : undefined;

        const jpYoy =
          pt.jp !== undefined && prevYearPt?.jp !== undefined && prevYearPt.jp !== 0
            ? Math.round(((pt.jp - prevYearPt.jp) / prevYearPt.jp) * 10000) / 100
            : undefined;

        return {
          ...pt,
          usYoy,
          krYoy,
          jpYoy,
        };
      });

    const buildSummary = (
      key: "us" | "kr" | "jp",
      seriesId: string,
      country: string
    ): LeiCountrySummary => {
      const valid = history.filter((pt) => typeof pt[key] === "number");
      if (valid.length === 0) {
        return {
          seriesId,
          country,
          latestDate: "-",
          current: 100,
          prev: 100,
          changeMom: 0,
          changeYoy: 0,
          changeYoyPct: 0,
          phase: "expansion",
          phaseLabel: "데이터 없음",
        };
      }
      const latestPt = valid[valid.length - 1];
      const prevPt = valid.length >= 2 ? valid[valid.length - 2] : latestPt;
      const yoyPt = valid.length >= 13 ? valid[valid.length - 13] : valid[0];

      const current = latestPt[key] as number;
      const prev = prevPt[key] as number;
      const yoyVal = yoyPt[key] as number;

      const changeMom = Math.round((current - prev) * 100) / 100;
      const changeYoy = Math.round((current - yoyVal) * 100) / 100;
      const changeYoyPct =
        yoyVal !== 0 ? Math.round(((current - yoyVal) / yoyVal) * 10000) / 100 : 0;
      const { phase, phaseLabel } = classifyPhase(current, changeMom);

      return {
        seriesId,
        country,
        latestDate: latestPt.date,
        current,
        prev,
        changeMom,
        changeYoy,
        changeYoyPct,
        phase,
        phaseLabel,
      };
    };

    const payload: LeiApiResponse = {
      summary: {
        us: buildSummary("us", "USALOLITOAASTSAM", "미국 (United States)"),
        kr: buildSummary("kr", "KORLOLITOAASTSAM", "한국 (South Korea)"),
        jp: buildSummary("jp", "JPNLOLITOAASTSAM", "일본 (Japan)"),
      },
      history,
      updatedAt: new Date().toISOString(),
    };

    cachedResponse = payload;
    cacheTime = now;

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching LEI comparison data:", error);
    return NextResponse.json(
      { error: "한·미·일 경기선행지수 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
