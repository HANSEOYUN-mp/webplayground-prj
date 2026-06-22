import { NextResponse } from 'next/server';

const MAJOR_US_STOCKS = new Set([
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "TSLA", "NVDA", "META", "NFLX", "AMD",
  "INTC", "QCOM", "AVGO", "TXN", "MU", "AMAT", "LRCX", "ADI", "NXPI", "ASML",
  "TSM", "ARM", "PANW", "CRWD", "PLTR", "DDOG", "NET", "SNOW", "MDB", "TEAM",
  "DIS", "NKE", "SBUX", "KO", "PEP", "COST", "WMT", "TGT", "HD", "LOW",
  "JPM", "BAC", "MS", "GS", "C", "WFC", "V", "MA", "AXP", "PYPL",
  "LLY", "UNH", "JNJ", "ABBV", "MRK", "PFE", "BMY", "AMGN", "GILD", "ISRG",
  "XOM", "CVX", "COP", "SLB", "EOG", "CAT", "DE", "GE", "HON", "LMT",
  "RTX", "BA", "UPS", "FDX", "WM", "NOC", "GD", "MMM", "T", "VZ",
  "TMUS", "CMCSA", "CHTR", "PG", "CL", "EL", "ORCL", "CRM", "ADBE", "INTU",
  "NOW", "WDAY", "SNPS", "CDNS", "ROP", "MCHP", "ON", "ANET", "MSTR", "COIN",
  "SOFI", "PLTR", "SQ", "SHOP", "SE", "MELI", "UBER", "LYFT", "ABNB", "BKNG",
  "VRT", "SMCI", "DELL", "HPE", "IONQ"
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const symbol = searchParams.get('symbol');

  if (!from || !to) {
    return NextResponse.json({ error: "from 및 to 날짜 파라미터가 필요합니다. (YYYY-MM-DD)" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버에 Finnhub API Key가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    let url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`;
    if (symbol) {
      url += `&symbol=${symbol.toUpperCase()}`;
    }

    const response = await fetch(url, { next: { revalidate: 3600 } }); // 1시간 캐싱
    if (!response.ok) {
      throw new Error(`Finnhub API 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    let list = data.earningsCalendar || [];

    // 개별 심볼 조회가 아닐 경우 주요 종목들만 필터링
    if (!symbol) {
      list = list.filter((item: any) => MAJOR_US_STOCKS.has(item.symbol?.toUpperCase()));
    }

    // 날짜순으로 정렬
    list.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ items: list });
  } catch (error: any) {
    console.error("Finnhub Earnings API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
