import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// KIS Open API 호스트명 인증서 우회
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1시간 캐시

// 1. KIS 핵심 업종 코드 매핑 (코스피 주요 10대 섹터)
const KIS_SECTORS = [
  { code: "0013", name: "전기전자 (반도체/IT)" },
  { code: "0021", name: "금융업 (은행/지주)" },
  { code: "0008", name: "화학 (2차전지/소재)" },
  { code: "0015", name: "운수장비 (자동차/조선)" },
  { code: "0012", name: "기계 (원전/방산)" },
  { code: "0009", name: "의약품 (바이오/제약)" },
  { code: "0011", name: "철강금속" },
  { code: "0019", name: "운수창고 (물류/해운)" },
  { code: "0005", name: "음식료품" },
  { code: "0020", name: "통신업" },
  { code: "0018", name: "건설업" }
];

// 인메모리 캐시 (API 호출 제한 보호용 1시간 주기)
let cachedData: any = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1시간 (3,600,000ms)

function getKisEnv() {
  const appKey = (process.env.KIS_APP_KEY || process.env.KIS_APPKEY || '').replace(/^"|"$/g, '');
  const appSecret = (process.env.KIS_APP_SECRET || process.env.KIS_APPSECRET || '').replace(/^"|"$/g, '');
  const url = (process.env.KIS_URL_BASE || process.env.KIS_URL || 'https://openapi.koreainvestment.com:9443').replace(/^"|"$/g, '');
  return { appKey, appSecret, url };
}

// KIS 토큰 발급 함수
async function getKisToken(appKey: string, appSecret: string, urlBase: string): Promise<string> {
  const tokenFilePath = path.join(process.cwd(), 'scratch', 'kis_token.json');
  try {
    if (fs.existsSync(tokenFilePath)) {
      const fileData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf8'));
      if (fileData.accessToken && fileData.expiresAt > Date.now()) {
        return fileData.accessToken;
      }
    }
  } catch (e) {
    // ignore
  }

  const res = await fetch(`${urlBase}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret
    })
  });
  if (!res.ok) throw new Error(`KIS 토큰 발급 실패 (${res.status})`);
  const json = await res.json();
  const token = json.access_token;
  const expiresAt = Date.now() + (json.expires_in || 86400) * 1000 - 60000;

  try {
    const dir = path.dirname(tokenFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tokenFilePath, JSON.stringify({ accessToken: token, expiresAt }));
  } catch (e) {
    // ignore
  }
  return token;
}

// KIS 실시간 업종 지수 조회
async function fetchKisSectorData() {
  const { appKey, appSecret, url } = getKisEnv();
  if (!appKey || !appSecret) {
    throw new Error("KIS API 키가 설정되지 않았습니다.");
  }

  const token = await getKisToken(appKey, appSecret, url);

  // 1) 코스피 종합(0001) 전체 거래대금 조회
  const kospiRes = await fetch(
    `${url}/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=0001`,
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: 'FHPUP02100000',
        custtype: 'P'
      },
      next: { revalidate: 3600 }
    }
  );
  const kospiJson = await kospiRes.json();
  const totalMarketVolume = parseFloat(kospiJson?.output?.acml_tr_pbmn || "0") * 1000000; // 백만원 -> 원 단위 변환

  // 2) 각 핵심 업종별 데이터 병렬 조회
  const promises = KIS_SECTORS.map(async (sec) => {
    try {
      const res = await fetch(
        `${url}/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=${sec.code}`,
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            authorization: `Bearer ${token}`,
            appkey: appKey,
            appsecret: appSecret,
            tr_id: 'FHPUP02100000',
            custtype: 'P'
          },
          next: { revalidate: 3600 }
        }
      );
      const data = await res.json();
      const out = data?.output || {};
      const volAmt = parseFloat(out.acml_tr_pbmn || "0") * 1000000; // 원
      const changeRate = parseFloat(out.bstp_nmix_prdy_ctrt || "0");
      const indexPrice = parseFloat(out.bstp_nmix_prpr || "0");

      return {
        name: sec.name,
        code: sec.code,
        value: volAmt,
        changeRate,
        indexPrice
      };
    } catch (e) {
      return null;
    }
  });

  const rawList = await Promise.all(promises);
  const validList = rawList.filter((x): x is NonNullable<typeof x> => x !== null && x.value > 0);

  const totalMappedVolume = validList.reduce((acc, cur) => acc + cur.value, 0);

  const sectorList = validList.map((item) => {
    const percent = totalMappedVolume > 0 ? parseFloat(((item.value / totalMappedVolume) * 100).toFixed(2)) : 0;
    const marketPercent = totalMarketVolume > 0 ? parseFloat(((item.value / totalMarketVolume) * 100).toFixed(2)) : 0;
    return {
      name: item.name,
      value: item.value,
      percent,
      marketPercent,
      changeRate: item.changeRate,
      indexPrice: item.indexPrice
    };
  }).sort((a, b) => b.value - a.value);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  return {
    source: "kis",
    basDt: dateStr,
    totalMarketVolume,
    totalMappedVolume,
    sectors: sectorList
  };
}

// 네이버 금융 실시간 업종별 시세 파싱
async function fetchNaverSectorData() {
  const res = await fetch('https://finance.naver.com/sise/sise_group.naver?type=upjong', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    next: { revalidate: 3600 }
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

  // 등락률 높은 순으로 정렬 후 상위 12개 업종 추출
  const topGainers = [...list].sort((a, b) => b.changeRate - a.changeRate).slice(0, 12);

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

    // 5분 캐시 확인
    if (!bypassCache && cachedData && (Date.now() - cacheTime < CACHE_DURATION)) {
      return NextResponse.json(cachedData);
    }

    // 한투 및 네이버 병렬 호출
    const [kisResult, naverResult] = await Promise.allSettled([
      fetchKisSectorData(),
      fetchNaverSectorData()
    ]);

    const kis = kisResult.status === "fulfilled" ? kisResult.value : { error: "한투 실시간 시세 조회 실패", sectors: [] };
    const naver = naverResult.status === "fulfilled" ? naverResult.value : { error: "네이버 실시간 시세 조회 실패", sectors: [] };

    const payload = {
      kis,
      naver,
      updatedAt: new Date().toISOString()
    };

    cachedData = payload;
    cacheTime = Date.now();

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Sector flow API error:", error);
    return NextResponse.json(
      { error: error.message || "섹터 데이터를 가져오지 못했습니다." },
      { status: 500 }
    );
  }
}
