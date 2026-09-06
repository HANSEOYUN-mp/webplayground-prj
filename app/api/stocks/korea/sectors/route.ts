import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5분 캐시

let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 네이버 금융 실시간 업종별 시세 파싱
async function fetchNaverSectorData() {
  const res = await fetch('https://finance.naver.com/sise/sise_group.naver?type=upjong', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    next: { revalidate: 300 }
  });
  if (!res.ok) throw new Error(`네이버 금융 호출 실패 (${res.status})`);

  const buf = await res.arrayBuffer();
  const decoder = new TextDecoder('euc-kr');
  const html = decoder.decode(buf);

  const regex = /<a href="\/sise\/sise_group_detail\.naver\?type=upjong&no=(\d+)">([^<]+)<\/a>[\s\S]*?<span class="[^"]*">([\s\S]*?)<\/span>/g;
  let m;
  const list: { no: string; name: string; changeRate: number; changeText: string }[] = [];

  while ((m = regex.exec(html)) !== null) {
    const no = m[1];
    const name = m[2].trim();
    const changeText = m[3].replace(/[\r\n\t]/g, '').trim();
    const num = parseFloat(changeText.replace(/[%+]/g, ''));
    const changeRate = isNaN(num) ? 0 : num;
    list.push({ no, name, changeRate, changeText });
  }

  // 등락률 높은 순으로 정렬 후 상위 16개 업종 추출
  const topGainers = [...list].sort((a, b) => b.changeRate - a.changeRate).slice(0, 16);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  return {
    source: "naver",
    basDt: dateStr,
    totalCount: list.length,
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
