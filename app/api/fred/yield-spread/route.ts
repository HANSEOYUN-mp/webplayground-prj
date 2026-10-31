import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FRED_API_KEY = process.env.FRED_API_KEY || "a5fb526d8a9a53e9ef2fdda187955a40";

export interface YieldSpreadDataPoint {
  date: string; // YYYY-MM
  y10?: number; // DGS10 (미국채 10년물 금리)
  y2?: number; // DGS2 (미국채 2년물 금리)
  m3?: number; // DGS3MO (미국채 3개월물 금리)
  spread10y2y?: number; // T10Y2Y (10Y - 2Y 금리차)
  spread10y3m?: number; // T10Y3M (10Y - 3M 금리차)
}

export interface YieldSeriesSummary {
  seriesId: string;
  label: string;
  latestDate: string;
  current: number;
  prev: number;
  prev3m: number;
  changeMom: number; // 전월 대비 (%p)
  change3m: number; // 3개월 전 대비 (%p)
  changeYoy: number; // 전년 동월 대비 (%p)
  statusBadge: string;
  statusTone: "red" | "blue" | "amber" | "emerald";
}

export interface SteepeningAnalysis {
  regime: "bull_steepening" | "bear_steepening" | "bear_flattening" | "bull_flattening" | "neutral";
  regimeTitle: string;
  regimeSubtitle: string;
  isInverted: boolean;
  unInverting: boolean; // 최근 6개월 내 역전(<0)이었다가 현재 >=0 또는 가파르게 상승 중인지 여부
}

export interface YieldSpreadApiResponse {
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

let cachedResponse: YieldSpreadApiResponse | null = null;
let cacheTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

function analyzeCurveRegime(
  longChange: number,
  shortChange: number,
  spreadCurrent: number,
  spreadChangeMom: number,
  recentSpreads: number[]
): SteepeningAnalysis {
  const isInverted = spreadCurrent < 0;
  const wasInvertedRecently = recentSpreads.some((v) => v < 0);
  const unInverting = wasInvertedRecently && (spreadCurrent >= 0 || spreadChangeMom > 0.05);

  // 금리차 확대 (Steepening: 10Y - Short 증가)
  if (spreadChangeMom > 0) {
    // 단기금리 하락폭이 장기금리 변동폭보다 크거나 같을 때 -> 불 스티프닝 (단기금리 하락 주도)
    if (shortChange < 0 && Math.abs(shortChange) >= Math.abs(longChange)) {
      return {
        regime: "bull_steepening",
        regimeTitle: "Case A. 불 스티프닝 (Bull Steepening · 단기금리 하락 주도)",
        regimeSubtitle:
          "단기금리가 장기금리보다 빠르게 하락하며 금리차가 확대되는 국면 (금리 인하 기대 / 침체 경계)",
        isInverted,
        unInverting,
      };
    }
    return {
      regime: "bear_steepening",
      regimeTitle: "Case B. 베어 스티프닝 (Bear Steepening · 장기금리 상승 주도)",
      regimeSubtitle:
        "장기금리(10Y)가 단기금리보다 빠르게 상승하며 금리차가 확대되는 국면 (성장·재정적자·인플레 부담)",
      isInverted,
      unInverting,
    };
  }

  // 금리차 축소 (Flattening: 10Y - Short 감소)
  if (spreadChangeMom < 0) {
    if (shortChange > 0 && Math.abs(shortChange) >= Math.abs(longChange)) {
      return {
        regime: "bear_flattening",
        regimeTitle: "베어 플래트닝 (Bear Flattening · 단기금리 상승 주도)",
        regimeSubtitle:
          "연준 긴축/금리 인상 기대로 단기금리가 빠르게 오르며 장단기 금리차가 축소(평탄화)되는 국면",
        isInverted,
        unInverting,
      };
    }
    return {
      regime: "bull_flattening",
      regimeTitle: "불 플래트닝 (Bull Flattening · 장기금리 하락 주도)",
      regimeSubtitle:
        "안전자산 선호 및 장기 성장 둔화 우려로 10년물 장기금리가 더 빠르게 내려가며 금리차가 축소되는 국면",
      isInverted,
      unInverting,
    };
  }

  return {
    regime: "neutral",
    regimeTitle: "보합 국면 (금리차 변동 미미)",
    regimeSubtitle: "장·단기 금리가 유사한 폭으로 움직이며 스프레드가 유지되는 국면",
    isInverted,
    unInverting,
  };
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
      { id: "DGS10", key: "y10" as const },
      { id: "DGS2", key: "y2" as const },
      { id: "DGS3MO", key: "m3" as const },
      { id: "T10Y2Y", key: "spread10y2y" as const },
      { id: "T10Y3M", key: "spread10y3m" as const },
    ];

    const results = await Promise.all(
      seriesList.map(async (s) => {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${FRED_API_KEY}&file_type=json&observation_start=1990-01-01&frequency=m&aggregation_method=avg`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`FRED API fetch failed for ${s.id} (${res.status})`);
        }
        const data = await res.json();
        return { key: s.key, id: s.id, observations: data.observations || [] };
      })
    );

    const dateMap: Record<string, YieldSpreadDataPoint> = {};

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
      .filter((pt) => pt.date >= "1990-01" && pt.y10 !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((pt) => {
        const spread10y2y =
          pt.spread10y2y !== undefined
            ? pt.spread10y2y
            : pt.y10 !== undefined && pt.y2 !== undefined
            ? Math.round((pt.y10 - pt.y2) * 100) / 100
            : undefined;
        const spread10y3m =
          pt.spread10y3m !== undefined
            ? pt.spread10y3m
            : pt.y10 !== undefined && pt.m3 !== undefined
            ? Math.round((pt.y10 - pt.m3) * 100) / 100
            : undefined;
        return {
          ...pt,
          spread10y2y,
          spread10y3m,
        };
      });

    const buildSummary = (
      key: keyof Omit<YieldSpreadDataPoint, "date">,
      seriesId: string,
      label: string,
      isSpread: boolean
    ): YieldSeriesSummary => {
      const valid = history.filter((pt) => typeof pt[key] === "number");
      if (valid.length === 0) {
        return {
          seriesId,
          label,
          latestDate: "-",
          current: 0,
          prev: 0,
          prev3m: 0,
          changeMom: 0,
          change3m: 0,
          changeYoy: 0,
          statusBadge: "데이터 없음",
          statusTone: "amber",
        };
      }

      const latestPt = valid[valid.length - 1];
      const prevPt = valid.length >= 2 ? valid[valid.length - 2] : latestPt;
      const prev3mPt = valid.length >= 4 ? valid[valid.length - 4] : valid[0];
      const yoyPt = valid.length >= 13 ? valid[valid.length - 13] : valid[0];

      const current = latestPt[key] as number;
      const prev = prevPt[key] as number;
      const prev3m = prev3mPt[key] as number;
      const yoyVal = yoyPt[key] as number;

      const changeMom = Math.round((current - prev) * 100) / 100;
      const change3m = Math.round((current - prev3m) * 100) / 100;
      const changeYoy = Math.round((current - yoyVal) * 100) / 100;

      let statusBadge = "";
      let statusTone: "red" | "blue" | "amber" | "emerald" = "emerald";

      if (isSpread) {
        if (current < 0 && changeMom >= 0) {
          statusBadge = "역전 상태 (0%p↓ · 역전 폭 축소 중)";
          statusTone = "amber";
        } else if (current < 0 && changeMom < 0) {
          statusBadge = "금리 역전 심화 (0%p↓ · 침체 경고)";
          statusTone = "blue";
        } else if (current >= 0 && changeMom >= 0) {
          statusBadge = "정상 플러스 (0%p↑ · 금리차 확대)";
          statusTone = "red";
        } else {
          statusBadge = "정상 플러스 (0%p↑ · 평탄화 진행)";
          statusTone = "emerald";
        }
      } else {
        if (changeMom > 0) {
          statusBadge = `전월비 상승 (+${changeMom.toFixed(2)}%p)`;
          statusTone = "red";
        } else if (changeMom < 0) {
          statusBadge = `전월비 하락 (${changeMom.toFixed(2)}%p)`;
          statusTone = "blue";
        } else {
          statusBadge = "전월비 보합 (0.00%p)";
          statusTone = "emerald";
        }
      }

      return {
        seriesId,
        label,
        latestDate: latestPt.date,
        current,
        prev,
        prev3m,
        changeMom,
        change3m,
        changeYoy,
        statusBadge,
        statusTone,
      };
    };

    const y10Summary = buildSummary("y10", "DGS10", "미국채 10년물 금리 (10Y)", false);
    const y2Summary = buildSummary("y2", "DGS2", "미국채 2년물 금리 (2Y)", false);
    const m3Summary = buildSummary("m3", "DGS3MO", "미국채 3개월물 금리 (3M)", false);
    const spread10y2ySummary = buildSummary(
      "spread10y2y",
      "T10Y2Y",
      "장단기 금리차 (10Y - 2Y)",
      true
    );
    const spread10y3mSummary = buildSummary(
      "spread10y3m",
      "T10Y3M",
      "장단기 금리차 (10Y - 3M)",
      true
    );

    const recent6m10y2y = history
      .slice(-6)
      .map((d) => d.spread10y2y)
      .filter((v): v is number => typeof v === "number");
    const recent6m10y3m = history
      .slice(-6)
      .map((d) => d.spread10y3m)
      .filter((v): v is number => typeof v === "number");

    const analysis10y2y = analyzeCurveRegime(
      y10Summary.changeMom,
      y2Summary.changeMom,
      spread10y2ySummary.current,
      spread10y2ySummary.changeMom,
      recent6m10y2y
    );

    const analysis10y3m = analyzeCurveRegime(
      y10Summary.changeMom,
      m3Summary.changeMom,
      spread10y3mSummary.current,
      spread10y3mSummary.changeMom,
      recent6m10y3m
    );

    const payload: YieldSpreadApiResponse = {
      summary: {
        y10: y10Summary,
        y2: y2Summary,
        m3: m3Summary,
        spread10y2y: spread10y2ySummary,
        spread10y3m: spread10y3mSummary,
      },
      analysis: {
        spread10y2y: analysis10y2y,
        spread10y3m: analysis10y3m,
      },
      history,
      updatedAt: new Date().toISOString(),
    };

    cachedResponse = payload;
    cacheTime = now;

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching Yield Spread data:", error);
    return NextResponse.json(
      { error: "미국채 장단기 금리차 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
