import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5분 캐시

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
const CACHE_DURATION = 5 * 60 * 1000; // 5분

/** 네이버 금융 특정 시장(sosok=0: 코스피, sosok=1: 코스닥) 1~3페이지 스크랩 */
async function scrapeMarketTop(sosok: "0" | "1"): Promise<StockItem[]> {
  const items: any[] = [];
  const promises: Promise<void>[] = [];

  for (const page of [1, 2, 3]) {
    const p = (async () => {
      try {
        const res = await fetch(`https://finance.naver.com/sise/sise_market_sum.naver?sosok=${sosok}&page=${page}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          next: { revalidate: 300 }
        });
        if (!res.ok) return;

        const buf = await res.arrayBuffer();
        const decoder = new TextDecoder("euc-kr");
        const html = decoder.decode(buf);

        const trRegex = /<tr[\s\S]*?<\/tr>/g;
        let trMatch;

        while ((trMatch = trRegex.exec(html)) !== null) {
          const tr = trMatch[0];
          const code = tr.match(/code=(\d{6})/)?.[1];
          const name = tr.match(/class="tltle">([^<]+)<\/a>/)?.[1]?.trim();
          if (!code || !name) continue;

          const tds = (tr.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []).map(td => td.replace(/<[^>]+>/g, "").trim());

          if (tds.length >= 10) {
            const clprRaw = tds[2].replace(/,/g, "");
            const vsRaw = tds[3].replace(/[,\s]/g, "");
            const fltRtRaw = tds[4].replace(/[%+,\s]/g, "");
            const mrktTotAmtRaw = tds[6].replace(/,/g, ""); // 억원
            const trquRaw = tds[9].replace(/,/g, ""); // 주

            const priceNum = parseFloat(clprRaw) || 0;
            const volNum = parseFloat(trquRaw) || 0;
            const fltRtNum = parseFloat(fltRtRaw) || 0;
            const trPrc = priceNum * volNum; // 원 단위 거래대금

            items.push({
              srtnCd: code,
              itmsNm: name,
              mrktCtg: sosok === "0" ? "KOSPI" : "KOSDAQ",
              clpr: String(priceNum),
              vs: vsRaw,
              fltRt: fltRtNum.toFixed(2),
              mrktTotAmt: String((parseFloat(mrktTotAmtRaw) || 0) * 100000000), // 원 단위
              trPrc: String(trPrc), // 원 단위
              trqu: String(volNum)
            });
          }
        }
      } catch (e) {
        console.error(`Scraping error (sosok=${sosok}, page=${page}):`, e);
      }
    })();
    promises.push(p);
  }

  await Promise.all(promises);

  // 거래대금 내림차순 정렬 후 20개 추출
  items.sort((a, b) => parseFloat(b.trPrc) - parseFloat(a.trPrc));

  return items.slice(0, 20).map((item, idx) => ({
    rank: idx + 1,
    ...item
  }));
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
      scrapeMarketTop("0"),
      scrapeMarketTop("1")
    ]);

    // 전체 통합 랭킹
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
