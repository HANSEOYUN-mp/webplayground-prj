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

// 인메모리 캐시 선언
const cacheMap = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 45000 // 45초

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const symbol = searchParams.get('symbol');

  // 캐시 키 생성 및 조회
  const cacheKey = `${from || ""}_${to || ""}_${symbol || ""}`
  const cached = cacheMap.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data)
  }

  if (!from || !to) {
    return NextResponse.json({ error: "from 및 to 날짜 파라미터가 필요합니다. (YYYY-MM-DD)" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버에 Finnhub API Key가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const now = new Date();
    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${date}`;
    };
    const todayStr = getLocalDateString(now);

    const isPast = (dateStr: string) => dateStr < todayStr;
    const isFutureOrToday = (dateStr: string) => dateStr >= todayStr;

    let list: any[] = [];

    // 만약 특정 심볼을 조회하거나, 요청 범위가 전부 과거이거나, 전부 미래인 경우는 단일 API 호출
    if (symbol || (isPast(from) && isPast(to)) || (isFutureOrToday(from) && isFutureOrToday(to))) {
      let url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`;
      if (symbol) {
        url += `&symbol=${symbol.toUpperCase()}`;
      }

      const response = await fetch(url, { next: { revalidate: 3600 } });
      if (!response.ok) {
        throw new Error(`Finnhub API 응답 에러: ${response.status}`);
      }

      const data = await response.json();
      list = data.earningsCalendar || [];
    } else {
      // 범위가 과거와 미래에 모두 걸쳐 있는 경우 (from < today <= to)
      // Finnhub 무료 API 정책상 과거와 미래가 혼재된 범위로 호출하면 과거 데이터를 누락시키므로,
      // 과거와 미래 영역을 쪼개서 병렬 요청한 후 병합함.
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      const pastUrl = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${yesterdayStr}&token=${apiKey}`;
      const futureUrl = `https://finnhub.io/api/v1/calendar/earnings?from=${todayStr}&to=${to}&token=${apiKey}`;

      const [pastRes, futureRes] = await Promise.all([
        fetch(pastUrl, { next: { revalidate: 3600 } }),
        fetch(futureUrl, { next: { revalidate: 3600 } })
      ]);

      let pastData: any = {};
      let futureData: any = {};

      if (pastRes.ok) {
        pastData = await pastRes.json();
      } else {
        console.error("Finnhub Past Earnings API Error:", pastRes.status);
      }

      if (futureRes.ok) {
        futureData = await futureRes.json();
      } else {
        console.error("Finnhub Future Earnings API Error:", futureRes.status);
      }

      const pastList = pastData.earningsCalendar || [];
      const futureList = futureData.earningsCalendar || [];
      list = [...pastList, ...futureList];
    }

    // 개별 심볼 조회가 아닐 경우 주요 종목들만 필터링
    if (!symbol) {
      list = list.filter((item: any) => MAJOR_US_STOCKS.has(item.symbol?.toUpperCase()));
    }

    // 날짜순으로 정렬
    list.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const resultData = { items: list };

    // 캐시에 데이터 적재 (TTL: 45초)
    cacheMap.set(cacheKey, {
      data: resultData,
      expiry: Date.now() + CACHE_TTL
    });

    return NextResponse.json(resultData);
  } catch (error: any) {
    console.error("Finnhub Earnings API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
