import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 14400; // Cache for 4 hours

const BIG_TECH_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'];
const NASDAQ_SYMBOL = '^IXIC';

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
    const nasdaqMap = await fetchHistorical(NASDAQ_SYMBOL);
    
    const bigTechMaps: Record<string, Record<string, number>> = {};
    for (const sym of BIG_TECH_SYMBOLS) {
      try {
        bigTechMaps[sym] = await fetchHistorical(sym);
      } catch (err) {
        console.error(`Failed to fetch ${sym} during comparison API call:`, err);
        // Continue if one symbol fails, we can average the remaining ones
      }
    }
    
    const currentYear = new Date().getFullYear();
    const startOfYearStr = `${currentYear}-01-01`;
    const dates = Object.keys(nasdaqMap).filter(d => d >= startOfYearStr).sort();
    
    // Find base prices (the oldest day in the dataset where all symbols have valid data)
    let baseDate = null;
    const basePrices: Record<string, number> = {};
    
    for (const d of dates) {
      let allValid = nasdaqMap[d] !== undefined;
      for (const sym of BIG_TECH_SYMBOLS) {
        if (!bigTechMaps[sym] || bigTechMaps[sym][d] === undefined) {
          allValid = false;
          break;
        }
      }
      if (allValid) {
        baseDate = d;
        basePrices[NASDAQ_SYMBOL] = nasdaqMap[d];
        for (const sym of BIG_TECH_SYMBOLS) {
          basePrices[sym] = bigTechMaps[sym][d];
        }
        break;
      }
    }
    
    if (!baseDate) {
      throw new Error('공통 기준 날짜를 찾지 못했습니다.');
    }
    
    const chartData = [];
    const baseIndex = dates.indexOf(baseDate);
    
    for (let i = baseIndex; i < dates.length; i++) {
      const d = dates[i];
      const nasdaqVal = nasdaqMap[d];
      
      const nasdaqNorm = (nasdaqVal / basePrices[NASDAQ_SYMBOL]) * 100;
      
      let sumBigTechNorm = 0;
      let validTechCount = 0;
      for (const sym of BIG_TECH_SYMBOLS) {
        const val = bigTechMaps[sym]?.[d];
        if (val !== undefined) {
          const norm = (val / basePrices[sym]) * 100;
          sumBigTechNorm += norm;
          validTechCount++;
        }
      }
      
      if (validTechCount > 0) {
        const bigTechNorm = sumBigTechNorm / validTechCount;
        chartData.push({
          date: d,
          nasdaq: parseFloat((nasdaqNorm - 100).toFixed(2)), // Represent as yield (e.g. +25.4%)
          bigTech: parseFloat((bigTechNorm - 100).toFixed(2)) // Represent as yield (e.g. +22.8%)
        });
      }
    }
    
    // Get latest rates for summary
    const latestPoint = chartData[chartData.length - 1];
    
    return NextResponse.json({
      baseDate,
      latest: {
        date: latestPoint?.date || '',
        nasdaqYield: latestPoint?.nasdaq || 0,
        bigTechYield: latestPoint?.bigTech || 0,
        difference: parseFloat(((latestPoint?.bigTech || 0) - (latestPoint?.nasdaq || 0)).toFixed(2))
      },
      items: chartData
    });
  } catch (error: any) {
    console.error("Comparison API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load comparison data" }, { status: 500 });
  }
}
