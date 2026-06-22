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
    const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${symbol.toUpperCase()}&token=${apiKey}`;
    
    // 분기별 데이터는 하루(24시간) 동안 캐싱해도 안전합니다.
    const response = await fetch(url, { next: { revalidate: 86400 } }); 
    if (!response.ok) {
      throw new Error(`Finnhub Surprise API 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    
    // 최근 4개 분기 데이터만 필터링 (Finnhub은 최신순으로 정렬해서 반환하거나 리스트 형태로 반환함)
    // 일반적으로 반환 데이터가 [최신, 이전, 이전, ...] 순으로 정렬되어 있으므로 slice(0, 4)를 하고 
    // 차트 렌더링을 위해 시간 순서(과거 -> 현재)로 reverse() 시킵니다.
    const recentSurprises = (Array.isArray(data) ? data : [])
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

    return NextResponse.json({ items: recentSurprises });
  } catch (error: any) {
    console.error(`Finnhub Surprise API Error for ${symbol}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
