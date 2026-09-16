import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30분 캐시

let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30분

// 네이버 공식 모바일 실시간 업종별 시세 API 연동
async function fetchNaverSectorData() {
  const res = await fetch('https://m.stock.naver.com/api/stocks/industry', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
    },
    next: { revalidate: 1800 }
  });
  if (!res.ok) throw new Error(`네이버 금융 호출 실패 (${res.status})`);

  const json = await res.json();
  const groups: any[] = json.groups || [];

  const list = groups.map((g) => {
    const num = parseFloat(g.changeRate) || 0;
    const changeText = `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
    return {
      no: String(g.no),
      name: g.name,
      changeRate: num,
      changeText
    };
  });

  // 등락률 높은 순으로 정렬 후 상위 16개 업종 추출
  const topGainers = [...list].sort((a, b) => b.changeRate - a.changeRate).slice(0, 16);

  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 60 * 60 * 1000));
  const dateStr = kst.toISOString().slice(0, 10);

  return {
    source: "naver",
    basDt: dateStr,
    totalCount: json.totalCount || list.length,
    sectors: topGainers
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bypassCache = searchParams.get('bypassCache') === 'true';

    // 캐시 확인
    if (!bypassCache && cachedData && (Date.now() - cacheTime < CACHE_DURATION)) {
      return NextResponse.json(cachedData);
    }

    const data = await fetchNaverSectorData();

    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    cachedData = payload;
    cacheTime = Date.now();

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Naver sector flow API error:", error);
    return NextResponse.json(
      { error: error.message || "실시간 섹터 데이터를 가져오지 못했습니다." },
      { status: 500 }
    );
  }
}
