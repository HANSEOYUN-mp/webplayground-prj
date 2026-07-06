import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 14400; // Cache for 4 hours

const SYMBOLS: Record<string, string> = {
  dia: 'DIA', // Dow Jones
  voo: 'VOO', // S&P 500
  qqq: 'QQQ'  // Nasdaq 100
};

async function fetchHistorical(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    next: { revalidate: 14400 }
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
    
    // Use VOO dates as the trading calendar
    const currentYear = new Date().getFullYear();
    const startOfYearStr = `${currentYear}-01-01`;
    const dates = Object.keys(maps.voo).sort();
    
    // Find the latest trading date
    const latestDate = dates[dates.length - 1];
    
    // Filter dates for the current year YTD
    const ytdDates = dates.filter(d => d >= startOfYearStr);
    
    // Find base YTD date (first trading day of the year with all data)
    let baseDateYtd = null;
    for (const d of ytdDates) {
      if (maps.dia[d] !== undefined && maps.voo[d] !== undefined && maps.qqq[d] !== undefined) {
        baseDateYtd = d;
        break;
      }
    }
    
    if (!baseDateYtd) {
      baseDateYtd = ytdDates[0] || dates[0];
    }
    
    // Find base 1-Month date (closest trading day to 1 month ago)
    const latestDateObj = new Date(latestDate);
    const oneMonthAgoObj = new Date(latestDateObj);
    oneMonthAgoObj.setMonth(oneMonthAgoObj.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgoObj.toISOString().split('T')[0];
    
    let baseDateOneMonth = dates.find(d => d >= oneMonthAgoStr);
    if (!baseDateOneMonth || maps.dia[baseDateOneMonth] === undefined || maps.voo[baseDateOneMonth] === undefined || maps.qqq[baseDateOneMonth] === undefined) {
      // Fallback: search backwards or just take an index
      baseDateOneMonth = dates[Math.max(0, dates.length - 22)]; // approx 22 trading days in a month
    }
    
    const results: Record<string, { ytdYield: number; oneMonthYield: number; latestPrice: number }> = {};
    
    for (const key of Object.keys(SYMBOLS)) {
      const latestPrice = maps[key][latestDate];
      const ytdBasePrice = maps[key][baseDateYtd];
      const oneMonthBasePrice = maps[key][baseDateOneMonth];
      
      const ytdYield = parseFloat(((latestPrice / ytdBasePrice - 1) * 100).toFixed(2));
      const oneMonthYield = parseFloat(((latestPrice / oneMonthBasePrice - 1) * 100).toFixed(2));
      
      results[key] = {
        ytdYield,
        oneMonthYield,
        latestPrice
      };
    }
    
    return NextResponse.json({
      latestDate,
      baseDateYtd,
      baseDateOneMonth,
      dia: results.dia,
      voo: results.voo,
      qqq: results.qqq
    });
  } catch (error: any) {
    console.error("ETF Comparison API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load ETF comparison data" }, { status: 500 });
  }
}
