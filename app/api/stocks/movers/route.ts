import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TECH_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'AVGO', 'META', 'TSLA', 'AMD', 'QCOM', 'ADBE', 'CRM', 
  'TXN', 'AMAT', 'MU', 'INTC', 'LRCX', 'PANW', 'CSCO', 'ORCL', 'ASML', 'ADI', 
  'NXPI', 'KLAC', 'SNPS', 'CDNS', 'MSI', 'FTNT', 'CRWD', 'NOW', 'PLTR', 'TEAM', 
  'WDAY', 'SNOW', 'MDB', 'NET', 'ZS', 'OKTA', 'DDOG', 'ANET'
];

interface CNBCQuote {
  symbol: string;
  name?: string;
  shortName?: string;
  last?: string;
  change_pct?: string;
  curmktstatus?: string;
  ExtendedMktQuote?: {
    type?: string;
    last?: string;
    change_pct?: string;
  };
}

export async function GET() {
  try {
    const url = `https://quote.cnbc.com/quote-html-webservice/quote.htm?partnerId=2&requestMethod=quick&symbols=${TECH_SYMBOLS.join('|')}&exthrs=1&noform=1&fund=1&output=json`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch CNBC quotes: ${res.status}`);
    }
    
    const json = await res.json();
    const quotes: CNBCQuote[] = json.QuickQuoteResult?.QuickQuote || [];
    
    const processed = quotes.map(q => {
      const symbol = q.symbol;
      const name = q.name || q.shortName || symbol;
      
      const regularPrice = parseFloat(q.last || '0');
      const regularChangePercent = parseFloat(q.change_pct || '0');
      
      // Premarket calculations
      let preMarketPrice = regularPrice;
      let preMarketChangePercent = 0;
      
      if (q.ExtendedMktQuote && q.ExtendedMktQuote.type === 'PRE_MKT') {
        preMarketPrice = parseFloat(q.ExtendedMktQuote.last || q.last || '0');
        preMarketChangePercent = parseFloat(q.ExtendedMktQuote.change_pct || '0');
      } else if (q.curmktstatus === 'PRE_MKT') {
        preMarketPrice = regularPrice;
        preMarketChangePercent = regularChangePercent;
      }
      
      // Postmarket calculations
      let postMarketPrice = regularPrice;
      let postMarketChangePercent = 0;
      
      if (q.ExtendedMktQuote && (q.ExtendedMktQuote.type === 'POST_MKT' || q.ExtendedMktQuote.type === 'AFTHRS')) {
        postMarketPrice = parseFloat(q.ExtendedMktQuote.last || q.last || '0');
        postMarketChangePercent = parseFloat(q.ExtendedMktQuote.change_pct || '0');
      } else if (q.curmktstatus === 'POST_MKT' || q.curmktstatus === 'AFTHRS') {
        postMarketPrice = regularPrice;
        postMarketChangePercent = regularChangePercent;
      }
      
      return {
        symbol,
        name,
        regular: { price: regularPrice, changePercent: regularChangePercent },
        premarket: { price: preMarketPrice, changePercent: preMarketChangePercent },
        postmarket: { price: postMarketPrice, changePercent: postMarketChangePercent }
      };
    });
    
    // Helper to sort and slice gainers and losers
    const getMovers = (key: 'regular' | 'premarket' | 'postmarket') => {
      const sorted = [...processed].sort((a, b) => b[key].changePercent - a[key].changePercent);
      
      // Gainers: sorted descending (highest positive first)
      const gainers = sorted.slice(0, 4).map(item => ({
        symbol: item.symbol,
        name: item.name,
        price: item[key].price,
        changePercent: item[key].changePercent
      }));
      
      // Losers: sorted ascending (lowest negative first)
      const losers = [...processed]
        .sort((a, b) => a[key].changePercent - b[key].changePercent)
        .slice(0, 4)
        .map(item => ({
          symbol: item.symbol,
          name: item.name,
          price: item[key].price,
          changePercent: item[key].changePercent
        }));
        
      return { gainers, losers };
    };
    
    return NextResponse.json({
      premarket: getMovers('premarket'),
      regular: getMovers('regular'),
      postmarket: getMovers('postmarket')
    });
  } catch (error) {
    console.error("CNBC Movers API error:", error);
    return NextResponse.json({ error: "Failed to load movers data" }, { status: 500 });
  }
}
