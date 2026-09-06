import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 43200; // 12시간 캐시

const ASSET_TICKERS: Record<string, { ticker: string; name: string; unit: string; isJpy?: boolean }> = {
  USDKRW: { ticker: "KRW=X", name: "원/달러 환율", unit: "원" },
  JPYKRW: { ticker: "JPYKRW=X", name: "엔/원 환율 (100엔)", unit: "원", isJpy: true },
  BTC: { ticker: "BTC-USD", name: "비트코인 (BTC)", unit: "$" },
  ETH: { ticker: "ETH-USD", name: "이더리움 (ETH)", unit: "$" },
  GOLD: { ticker: "GC=F", name: "국제 금 (Gold)", unit: "$" }
};

interface AssetHistoryPoint {
  date: string;
  price: number;
}

interface AssetValuationData {
  key: string;
  symbol: string;
  name: string;
  unit: string;
  currentPrice: number;
  prevClose: number;
  change: number;
  changePercent: number;
  mean3y: number;
  disparity: number; // ((currentPrice - mean3y) / mean3y) * 100
  isBuyZone: boolean; // currentPrice < mean3y
  high3y: number;
  low3y: number;
  dataPoints: number;
  history: AssetHistoryPoint[];
  error?: string;
}

let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12시간

async function fetchAsset3YData(key: string, config: { ticker: string; name: string; unit: string; isJpy?: boolean }): Promise<AssetValuationData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${config.ticker}?range=3y&interval=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    next: { revalidate: 43200 }
  });

  if (!res.ok) throw new Error(`Yahoo Finance failed for ${config.ticker} (${res.status})`);

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result || !result.timestamp) throw new Error(`No data returned for ${config.ticker}`);

  const timestamps: number[] = result.timestamp;
  const closes: (number | null)[] = result.indicators.quote[0].close;
  const multiplier = config.isJpy ? 100 : 1;

  const history: AssetHistoryPoint[] = [];
  const validCloses: number[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const rawVal = closes[i];
    if (rawVal !== null && rawVal !== undefined && !isNaN(rawVal)) {
      const scaledVal = rawVal * multiplier;
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
      history.push({
        date: dateStr,
        price: parseFloat(scaledVal.toFixed(2))
      });
      validCloses.push(scaledVal);
    }
  }

  if (validCloses.length === 0) throw new Error(`No valid prices for ${config.ticker}`);

  const rawCurrent = result.meta?.regularMarketPrice !== undefined 
    ? result.meta.regularMarketPrice * multiplier 
    : validCloses[validCloses.length - 1];

  const rawPrev = result.meta?.previousClose !== undefined 
    ? result.meta.previousClose * multiplier 
    : (validCloses.length > 1 ? validCloses[validCloses.length - 2] : rawCurrent);

  const currentPrice = parseFloat(rawCurrent.toFixed(2));
  const prevClose = parseFloat(rawPrev.toFixed(2));
  const change = parseFloat((currentPrice - prevClose).toFixed(2));
  const changePercent = prevClose !== 0 ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;

  // 3년 산술평균 계산
  const sum = validCloses.reduce((acc, cur) => acc + cur, 0);
  const mean3y = parseFloat((sum / validCloses.length).toFixed(2));

  // 괴리율 (현재가가 평균 대비 몇 %인지)
  const disparity = parseFloat((((currentPrice - mean3y) / mean3y) * 100).toFixed(2));
  const isBuyZone = currentPrice < mean3y;

  const high3y = parseFloat(Math.max(...validCloses).toFixed(2));
  const low3y = parseFloat(Math.min(...validCloses).toFixed(2));

  return {
    key,
    symbol: config.ticker,
    name: config.name,
    unit: config.unit,
    currentPrice,
    prevClose,
    change,
    changePercent,
    mean3y,
    disparity,
    isBuyZone,
    high3y,
    low3y,
    dataPoints: validCloses.length,
    history
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bypassCache = searchParams.get("bypassCache") === "true";

    // 12시간 캐시 확인
    if (!bypassCache && cachedData && (Date.now() - cacheTime < CACHE_DURATION)) {
      return NextResponse.json(cachedData);
    }

    const promises = Object.entries(ASSET_TICKERS).map(async ([key, config]) => {
      try {
        return await fetchAsset3YData(key, config);
      } catch (err: any) {
        console.error(`Asset valuation error for ${key}:`, err.message);
        return {
          key,
          symbol: config.ticker,
          name: config.name,
          unit: config.unit,
          currentPrice: 0,
          prevClose: 0,
          change: 0,
          changePercent: 0,
          mean3y: 0,
          disparity: 0,
          isBuyZone: false,
          high3y: 0,
          low3y: 0,
          dataPoints: 0,
          history: [],
          error: err.message || "Failed to load"
        };
      }
    });

    const results = await Promise.all(promises);
    const assetsMap: Record<string, AssetValuationData> = {};
    results.forEach((item) => {
      assetsMap[item.key] = item;
    });

    const payload = {
      assets: assetsMap,
      assetKeys: Object.keys(ASSET_TICKERS),
      updatedAt: new Date().toISOString()
    };

    cachedData = payload;
    cacheTime = Date.now();

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Assets valuation API error:", error);
    return NextResponse.json(
      { error: error.message || "3년 자산 가치평가 데이터를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
