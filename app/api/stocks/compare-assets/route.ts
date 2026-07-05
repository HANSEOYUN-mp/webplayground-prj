import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 14400; // Cache for 4 hours

const SYMBOLS: Record<string, string> = {
  stocks: '^GSPC', // S&P 500
  gold: 'GLD',     // Gold ETF
  reits: 'VNQ',    // Vanguard Real Estate ETF
  oil: 'USO',      // WTI Crude Oil ETF
  bonds: 'TLT',    // US Long-term Treasury Bond ETF
  crypto: 'BTC-USD' // Bitcoin
};

async function fetchHistorical(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    next: { revalidate: 14400 } // Next.js fetch caching
  });
  if (!res.ok) throw new Error(`Fetch failed for ${symbol}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result || !result.timestamp) throw new Error(`No data for ${symbol}`);
  
  const quotes = result.indicators.quote[0].close;
  const timestamps = result.timestamp;
  
  const dataMap: Record<string, number> = {};
  for (let i = 0; i < timestamps.length; i++) {
    const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    const val = quotes[i];
    if (val !== null && val !== undefined && !isNaN(val)) {
      dataMap[dateStr] = val;
    }
  }
  return dataMap;
}

export async function GET() {
  try {
    const maps: Record<string, Record<string, number>> = {};
    for (const [key, sym] of Object.entries(SYMBOLS)) {
      maps[key] = await fetchHistorical(sym);
    }
    
    // Dates from stocks (S&P 500) are trading days, use that as the reference timeline
    const currentYear = new Date().getFullYear();
    const startOfYearStr = `${currentYear}-01-01`;
    const dates = Object.keys(maps.stocks).filter(d => d >= startOfYearStr).sort();
    
    // Find basePrices on first trading day where all have data
    let baseDate = null;
    const basePrices: Record<string, number> = {};
    for (const d of dates) {
      let allValid = true;
      for (const key of Object.keys(SYMBOLS)) {
        if (maps[key][d] === undefined) {
          allValid = false;
          break;
        }
      }
      if (allValid) {
        baseDate = d;
        for (const key of Object.keys(SYMBOLS)) {
          basePrices[key] = maps[key][d];
        }
        break;
      }
    }
    
    if (!baseDate) {
      throw new Error('자산군 비교를 위한 공통 기준일을 찾지 못했습니다.');
    }
    
    const resultData = [];
    
    for (const d of dates) {
      const point: any = { date: d };
      let allValid = true;
      for (const key of Object.keys(SYMBOLS)) {
        const val = maps[key][d];
        if (val === undefined) {
          allValid = false;
          break;
        }
        point[key] = parseFloat(((val / basePrices[key] - 1) * 100).toFixed(2));
      }
      if (allValid) {
        resultData.push(point);
      }
    }
    
    const latestPoint = resultData[resultData.length - 1] || {};
    
    return NextResponse.json({
      baseDate,
      latest: {
        date: latestPoint.date || '',
        stocks: latestPoint.stocks || 0,
        gold: latestPoint.gold || 0,
        reits: latestPoint.reits || 0,
        oil: latestPoint.oil || 0,
        bonds: latestPoint.bonds || 0,
        crypto: latestPoint.crypto || 0
      },
      items: resultData
    });
  } catch (error: any) {
    console.error("Asset Comparison API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load asset comparison data" }, { status: 500 });
  }
}
