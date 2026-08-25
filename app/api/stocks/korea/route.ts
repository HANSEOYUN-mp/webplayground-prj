import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

const TICKERS: Record<string, string> = {
  KOSPI: '^KS11',
  KOSPI200: '^KS200',
  KOSDAQ: '^KQ11',
  NQ_F: 'NQ=F',
  SAMSUNG: '005930.KS',
  HYNIX: '000660.KS',
  DOOSAN: '034020.KS',
  GOLD: 'GC=F',
  EXCHANGE: 'KRW=X',
  JPY: 'JPYKRW=X'
};

async function fetchKoreaTickerData(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    next: { revalidate: 300 }
  });
  if (!res.ok) throw new Error(`Yahoo Finance fetch failed for ${ticker}`);
  
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result || !result.timestamp) throw new Error(`No data returned for ${ticker}`);

  const timestamps: number[] = result.timestamp;
  const closes: (number | null)[] = result.indicators.quote[0].close;
  
  // 엔화(JPYKRW=X)인 경우 100엔당 원화 단위로 100배 환산
  const isJpy = ticker === 'JPYKRW=X';
  const multiplier = isJpy ? 100 : 1;

  const history: { date: string; value: number }[] = [];
  const validCloses: number[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    const val = closes[i];
    if (val !== null && val !== undefined && !isNaN(val)) {
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      const scaledVal = val * multiplier;
      history.push({
        date: dateStr,
        value: parseFloat(scaledVal.toFixed(2))
      });
      validCloses.push(scaledVal);
    }
  }

  if (validCloses.length === 0) throw new Error(`No valid close prices for ${ticker}`);

  const rawCurrent = result.meta?.regularMarketPrice !== undefined 
    ? result.meta.regularMarketPrice * multiplier 
    : validCloses[validCloses.length - 1];
  const rawPrev = result.meta?.previousClose !== undefined 
    ? result.meta.previousClose * multiplier 
    : (validCloses.length > 1 ? validCloses[validCloses.length - 2] : (result.meta?.chartPreviousClose ? result.meta.chartPreviousClose * multiplier : rawCurrent));

  const currentPrice = rawCurrent;
  const prevClose = rawPrev;
  const change = currentPrice - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  
  const high52w = Math.max(...validCloses);
  const low52w = Math.min(...validCloses);

  return {
    symbol: ticker,
    currency: isJpy ? 'KRW (100엔)' : (result.meta?.currency || 'KRW'),
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    prevClose: parseFloat(prevClose.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    high52w: parseFloat(high52w.toFixed(2)),
    low52w: parseFloat(low52w.toFixed(2)),
    history
  };
}

export async function GET() {
  try {
    const data: Record<string, any> = {};
    for (const [key, ticker] of Object.entries(TICKERS)) {
      try {
        data[key] = await fetchKoreaTickerData(ticker);
      } catch (err: any) {
        console.error(`Failed to fetch Korean stock data for ${key}:`, err.message);
        data[key] = { error: err.message || "Failed to load" };
      }
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Korea stock API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load Korean market data" }, { status: 500 });
  }
}
