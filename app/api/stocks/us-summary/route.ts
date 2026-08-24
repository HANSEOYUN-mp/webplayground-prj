import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

const TICKERS: Record<string, string> = {
  SPY: 'SPY',
  QQQ: 'QQQ',
  QLD: 'QLD',
  SCHD: 'SCHD',
  JEPI: 'JEPI',
  SOXX: 'SOXX',
  TECL: 'TECL'
};

async function fetchUSTickerData(ticker: string) {
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
  
  const history: { date: string; value: number }[] = [];
  const validCloses: number[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    const val = closes[i];
    if (val !== null && val !== undefined && !isNaN(val)) {
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      history.push({
        date: dateStr,
        value: parseFloat(val.toFixed(2))
      });
      validCloses.push(val);
    }
  }

  if (validCloses.length === 0) throw new Error(`No valid close prices for ${ticker}`);

  // 실시간 현재가 정합성 우선 적용
  const currentPrice = result.meta?.regularMarketPrice || validCloses[validCloses.length - 1];
  const prevClose = result.meta?.previousClose || (validCloses.length > 1 ? validCloses[validCloses.length - 2] : (result.meta?.chartPreviousClose || currentPrice));
  const change = currentPrice - prevClose;
  const changePercent = (change / prevClose) * 100;
  
  const high52w = Math.max(...validCloses);
  const low52w = Math.min(...validCloses);

  return {
    symbol: ticker,
    currency: result.meta?.currency || 'USD',
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    prevClose: parseFloat(prevClose.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    high52w: parseFloat(high52w.toFixed(2)),
    low52w: parseFloat(low52w.toFixed(2)),
    history
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker')?.toUpperCase().trim();

    // 단일 티커 검색 요청인 경우
    if (ticker) {
      try {
        const singleData = await fetchUSTickerData(ticker);
        return NextResponse.json({ singleData });
      } catch (err: any) {
        console.error(`Failed to fetch US stock data for single search ${ticker}:`, err.message);
        return NextResponse.json({ error: `종목 코드(${ticker})를 찾을 수 없거나 데이터 수집에 실패했습니다.` }, { status: 404 });
      }
    }

    // 기본 전체 ETF 요약 요청인 경우
    const data: Record<string, any> = {};
    for (const [key, tkr] of Object.entries(TICKERS)) {
      try {
        data[key] = await fetchUSTickerData(tkr);
      } catch (err: any) {
        console.error(`Failed to fetch US stock data for ${key}:`, err.message);
        data[key] = { error: err.message || "Failed to load" };
      }
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("US stock summary API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load US market data" }, { status: 500 });
  }
}
