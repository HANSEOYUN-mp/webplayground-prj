import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30분 캐시

interface StockItem {
  rank: number;
  srtnCd: string;
  itmsNm: string;
  mrktCtg: string;
  clpr: string;
  vs: string;
  fltRt: string;
  mrktTotAmt: string;
  trPrc: string;
  trqu: string;
}

let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30분

/** 네이버 공식 모바일 API로 시장별(KOSPI / KOSDAQ) 상위 300종목 가져와 거래대금 순 Top 20 추출 */
async function fetchMarketTop(market: "KOSPI" | "KOSDAQ"): Promise<StockItem[]> {
  try {
    const pages = [1, 2, 3];
    const promises = pages.map(async (page) => {
      try {
        const res = await fetch(`https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=100`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
          },
          next: { revalidate: 1800 }
        });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.stocks || []) as any[];
      } catch (err) {
        console.error(`Error fetching ${market} page ${page}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allStocks = results.flat();

    // 거래대금(accumulatedTradingValueRaw) 내림차순 정렬
    const sorted = allStocks.sort((a, b) => {
      const vA = parseFloat(a.accumulatedTradingValueRaw) || 0;
      const vB = parseFloat(b.accumulatedTradingValueRaw) || 0;
      return vB - vA;
    });

    return sorted.slice(0, 20).map((s, idx) => ({
      rank: idx + 1,
      srtnCd: s.itemCode || "",
      itmsNm: s.stockName || "",
      mrktCtg: market,
      clpr: String(s.closePriceRaw ?? 0),
      vs: String(s.compareToPreviousClosePriceRaw ?? 0),
      fltRt: String(s.fluctuationsRatio ?? "0"),
      mrktTotAmt: String(s.marketValueRaw ?? 0),
      trPrc: String(s.accumulatedTradingValueRaw ?? 0),
      trqu: String(s.accumulatedTradingVolumeRaw ?? 0)
    }));
  } catch (error) {
    console.error(`fetchMarketTop error for ${market}:`, error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bypassCache = searchParams.get("bypassCache") === "true";

    // 5분 메모리 캐시 반환
    if (!bypassCache && cachedData && (Date.now() - cacheTime < CACHE_DURATION)) {
      return NextResponse.json(cachedData);
    }

    // 코스피 & 코스닥 병렬 수집
    const [kospi, kosdaq] = await Promise.all([
      fetchMarketTop("KOSPI"),
      fetchMarketTop("KOSDAQ")
    ]);

    // 전체 통합 랭킹 (코스피 + 코스닥 상위 거래대금 20개)
    const allCombined = [...kospi, ...kosdaq]
      .sort((a, b) => parseFloat(b.trPrc) - parseFloat(a.trPrc))
      .slice(0, 20)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000));
    const rawDate = kst.toISOString().slice(0, 10).replace(/-/g, "");

    const payload = {
      basDt: rawDate,
      all: allCombined,
      kospi,
      kosdaq,
      items: allCombined, // 하위 호환
      updatedAt: new Date().toISOString()
    };

    cachedData = payload;
    cacheTime = Date.now();

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Top stocks API error:", error);
    return NextResponse.json(
      { error: error.message || "거래대금 상위 데이터를 가져오지 못했습니다." },
      { status: 500 }
    );
  }
}
