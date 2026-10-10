import { NextResponse } from "next/server";
import { HISTORICAL_GOLD_1976_2000 } from "@/lib/historical-gold";

export const dynamic = "force-dynamic";
export const revalidate = 43200; // 12시간

const FRED_API_KEY = process.env.FRED_API_KEY || "a5fb526d8a9a53e9ef2fdda187955a40";

interface MacroDataPoint {
  date: string; // YYYY-MM
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

let cachedResponse: ApiResponse | null = null;
let cacheTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6시간

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bypass = searchParams.get("bypassCache") === "true";

  const now = Date.now();
  if (!bypass && cachedResponse && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const fredSeries = ["DGS10", "DGS20", "DGS30", "FEDFUNDS"];
    const [fredResults, yahooRes] = await Promise.all([
      Promise.all(
        fredSeries.map(async (id) => {
          // 50년치 (1976-01-01부터) 월별 데이터
          const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_API_KEY}&file_type=json&observation_start=1976-01-01&frequency=m&aggregation_method=avg`;
          const res = await fetch(url, { next: { revalidate: 43200 } });
          if (!res.ok) return { id, obs: [] };
          const data = await res.json();
          return { id, obs: data.observations || [] };
        })
      ),
      // 2000년 이후 실시간 금 선물 (GC=F)
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?period1=967766400&period2=1791590400&interval=1mo", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        next: { revalidate: 43200 }
      }).then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      }).catch(() => null)
    ]);

    const dateMap: Record<string, MacroDataPoint> = {};

    // 1. 1976-01 ~ 2000-08 역사적 공식 금 시세(LBMA) 사전 등록
    for (const [ym, val] of Object.entries(HISTORICAL_GOLD_1976_2000)) {
      dateMap[ym] = { date: ym, gold: val };
    }

    // 2. FRED 국채 & 기준금리 50년치 데이터 병합
    for (const item of fredResults) {
      const key = item.id.toLowerCase() as "dgs10" | "dgs20" | "dgs30" | "fedfunds";
      for (const o of item.obs) {
        if (!o.value || o.value === ".") continue;
        const ym = o.date.slice(0, 7);
        if (!dateMap[ym]) dateMap[ym] = { date: ym };
        dateMap[ym][key] = Math.round(parseFloat(o.value) * 100) / 100;
      }
    }

    // 3. Yahoo Finance Gold(2000년 9월 ~ 현재) 데이터 병합
    if (yahooRes?.chart?.result?.[0]) {
      const result0 = yahooRes.chart.result[0];
      const timestamps: number[] = result0.timestamp || [];
      const closes: (number | null)[] = result0.indicators?.quote?.[0]?.close || [];
      for (let i = 0; i < timestamps.length; i++) {
        const val = closes[i];
        if (val === null || val === undefined || isNaN(val)) continue;
        const d = new Date(timestamps[i] * 1000);
        const ym = d.toISOString().slice(0, 7);
        if (!dateMap[ym]) dateMap[ym] = { date: ym };
        dateMap[ym].gold = Math.round(val * 10) / 10;
      }
    }

    const history = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    // 금(Gold) 선물 결측치 보간 (선물 계약 롤오버/휴장월 연속선 처리)
    let firstValidGold = history.find((p) => typeof p.gold === "number" && !isNaN(p.gold))?.gold;
    let runningGold = firstValidGold;
    for (let i = 0; i < history.length; i++) {
      if (typeof history[i].gold === "number" && !isNaN(history[i].gold!)) {
        runningGold = history[i].gold;
      } else if (runningGold !== undefined) {
        history[i].gold = runningGold;
      }
    }

    // 최신 요약 데이터 계산 도우미
    const calcSummary = (
      key: keyof Omit<MacroDataPoint, "date">,
      name: string,
      unit: string
    ): IndicatorSummary => {
      const validPoints = history.filter((p) => typeof p[key] === "number" && !isNaN(p[key] as number));
      if (validPoints.length === 0) {
        return { name, current: 0, prev: 0, change: 0, changePercent: 0, unit };
      }
      const cur = validPoints[validPoints.length - 1][key] as number;
      const prev = validPoints.length >= 2 ? (validPoints[validPoints.length - 2][key] as number) : cur;
      const change = Math.round((cur - prev) * 100) / 100;
      const changePercent = prev !== 0 ? Math.round(((cur - prev) / prev) * 10000) / 100 : 0;
      return { name, current: cur, prev, change, changePercent, unit };
    };

    const responseData: ApiResponse = {
      summary: {
        dgs10: calcSummary("dgs10", "미국채 10년물", "%"),
        dgs20: calcSummary("dgs20", "미국채 20년물", "%"),
        dgs30: calcSummary("dgs30", "미국채 30년물", "%"),
        fedfunds: calcSummary("fedfunds", "미국 기준금리", "%"),
        gold: calcSummary("gold", "국제 금 (Gold)", "$")
      },
      history,
      updatedAt: new Date().toISOString()
    };

    cachedResponse = responseData;
    cacheTime = now;

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error in /api/stocks/treasury-gold:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch treasury and gold data" },
      { status: 500 }
    );
  }
}
