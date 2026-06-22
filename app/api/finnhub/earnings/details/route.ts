import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: "symbol 파라미터가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버에 Finnhub API Key가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const symbolUpper = symbol.toUpperCase();

    // 3가지 데이터를 병렬로 요청 (24시간 캐싱 적용)
    const [surpriseRes, metricRes, recommendationRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${symbolUpper}&token=${apiKey}`, { next: { revalidate: 86400 } }),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbolUpper}&metric=all&token=${apiKey}`, { next: { revalidate: 86400 } }),
      fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${symbolUpper}&token=${apiKey}`, { next: { revalidate: 86400 } }),
    ]);

    // 1. 서프라이즈 데이터 파싱
    let surpriseItems: any[] = [];
    if (surpriseRes.ok) {
      const surpriseData = await surpriseRes.json();
      surpriseItems = (Array.isArray(surpriseData) ? surpriseData : [])
        .slice(0, 4)
        .map((item: any) => ({
          period: item.period || '',
          quarter: item.quarter || 0,
          year: item.year || 0,
          actual: item.actual ?? 0,
          estimate: item.estimate ?? 0,
          surprisePercent: item.surprisePercent ?? 0,
        }))
        .reverse();
    }

    // 2. PER 메트릭 파싱
    let pe: number | null = null;
    if (metricRes.ok) {
      const metricData = await metricRes.json();
      pe = metricData?.metric?.peTTM ?? metricData?.metric?.peBasicExclExtraTTM ?? null;
    }

    // 3. 투자의견 컨센서스 파싱
    let recommendation = { buy: 0, hold: 0, sell: 0 };
    if (recommendationRes.ok) {
      const recData = await recommendationRes.json();
      if (Array.isArray(recData) && recData.length > 0) {
        const latest = recData[0]; // 가장 최근 분기 컨센서스
        const strongBuy = latest.strongBuy ?? 0;
        const buy = latest.buy ?? 0;
        const hold = latest.hold ?? 0;
        const sell = latest.sell ?? 0;
        const strongSell = latest.strongSell ?? 0;

        recommendation = {
          buy: strongBuy + buy,
          hold: hold,
          sell: sell + strongSell,
        };
      }
    }

    return NextResponse.json({
      symbol: symbolUpper,
      surprise: surpriseItems,
      pe,
      recommendation,
    });
  } catch (error: any) {
    console.error(`Finnhub Details API Error for ${symbol}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
