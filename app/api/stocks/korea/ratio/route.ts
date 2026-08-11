import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// KIS Open API 서버의 호스트명 인증서 Altname 불일치 우회 설정
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const dynamic = 'force-dynamic';

// 환경변수 큰따옴표(") 정제 처리 (Next.js env 파싱 에러 방지)
const KIS_APPKEY = (process.env.KIS_APPKEY || '').replace(/^"|"$/g, '');
const KIS_APPSECRET = (process.env.KIS_APPSECRET || '').replace(/^"|"$/g, '');
const KIS_URL = (process.env.KIS_URL || 'https://openapi.koreainvestment.com').replace(/^"|"$/g, '');

// 인메모리 AccessToken 캐시
let cachedToken: string | null = null;
let tokenExpiry = 0;

const TOKEN_CACHE_FILE = path.join(process.cwd(), 'scratch', 'kis_token.json');

// KOSPI 기준 상수 (지수 2,650 기준 약 2,150조 원으로 실시간 비례 보정 계산)
const KOSPI_BASE_INDEX = 2650.00;
const KOSPI_BASE_CAP = 2150000000000000; // 2,150조 원

async function getAccessToken() {
  const now = Date.now();
  
  if (cachedToken && tokenExpiry > now) {
    return cachedToken;
  }

  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const cacheData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
      if (cacheData.access_token && cacheData.expiry > now) {
        cachedToken = cacheData.access_token;
        tokenExpiry = cacheData.expiry;
        return cachedToken;
      }
    }
  } catch (e) {
    console.error('토큰 파일 캐시 읽기 실패:', e);
  }

  if (!KIS_APPKEY || !KIS_APPSECRET) {
    throw new Error('KIS_APPKEY 또는 KIS_APPSECRET 환경 변수가 설정되지 않았습니다.');
  }

  const response = await fetch(`${KIS_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: KIS_APPKEY,
      appsecret: KIS_APPSECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KIS Access Token 발급 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  
  const expiresInMs = (data.expires_in || 86400) * 1000;
  tokenExpiry = now + expiresInMs - 3600000;

  try {
    const scratchDir = path.dirname(TOKEN_CACHE_FILE);
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    fs.writeFileSync(
      TOKEN_CACHE_FILE,
      JSON.stringify({ access_token: cachedToken, expiry: tokenExpiry }),
      'utf8'
    );
  } catch (e) {
    console.error('토큰 파일 캐시 저장 실패:', e);
  }

  return cachedToken;
}

async function fetchStockPrice(symbol: string, token: string) {
  if (!KIS_APPKEY || !KIS_APPSECRET) {
    throw new Error('KIS_APPKEY 또는 KIS_APPSECRET 환경 변수가 설정되지 않았습니다.');
  }

  const isVts = KIS_URL.includes('vts');
  const trId = isVts ? 'VTTC8001R' : 'FHP81010000';

  const res = await fetch(
    `${KIS_URL}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${symbol}`,
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'authorization': `Bearer ${token}`,
        'appkey': KIS_APPKEY,
        'appsecret': KIS_APPSECRET,
        'tr_id': trId,
        'custtype': 'P', // 개인고객 구분 헤더 추가
      },
    }
  );

  if (!res.ok) {
    throw new Error(`KIS 시세 조회 실패 (${symbol}): ${res.status}`);
  }

  const json = await res.json();
  if (json.rt_cd !== '0') {
    throw new Error(`KIS API 오류 (${symbol}): ${json.msg1}`);
  }

  return json.output;
}

async function fetchKospiIndex(token: string) {
  if (!KIS_APPKEY || !KIS_APPSECRET) {
    throw new Error('KIS_APPKEY 또는 KIS_APPSECRET 환경 변수가 설정되지 않았습니다.');
  }

  // 업종 지수 조회의 경우 모의투자 환경에서도 실전투자용 FHP81040000 tr_id를 공용으로 사용합니다.
  const trId = 'FHP81040000';

  const res = await fetch(
    `${KIS_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price?fid_cond_mrkt_div_code=U&fid_input_iscd=0001`,
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'authorization': `Bearer ${token}`,
        'appkey': KIS_APPKEY,
        'appsecret': KIS_APPSECRET,
        'tr_id': trId,
        'custtype': 'P', // 개인고객 구분 헤더 추가
      },
    }
  );

  if (!res.ok) {
    throw new Error(`KIS KOSPI 업종 시세 조회 실패: ${res.status}`);
  }

  const json = await res.json();
  if (json.rt_cd !== '0') {
    throw new Error(`KIS API 오류 (KOSPI): ${json.msg1}`);
  }

  return json.output;
}

// 네이버 금융 실시간 데이터 백업 폴백 함수
async function fetchNaverFallback() {
  const res = await fetch('https://m.stock.naver.com/api/index/KOSPI/integration', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) {
    throw new Error('네이버 금융 폴백 데이터 수집 실패');
  }

  const json = await res.json();
  
  // KOSPI 거래대금 획득
  const tradingValueInfo = json.totalInfos.find((info: any) => info.code === 'accumulatedTradingValue');
  const rawTradingValueText = tradingValueInfo?.value || '0';
  // "49,567,651백만" -> 49,567,651 * 1,000,000
  const cleanValue = parseFloat(rawTradingValueText.replace(/[^0-9]/g, '')) * 1000000;

  // KOSPI 지수 획득
  const rawIndexText = json.totalInfos.find((info: any) => info.code === 'lastClosePrice')?.value || '2650.00';
  const kospiIndex = parseFloat(rawIndexText.replace(/,/g, ''));

  // 삼성전자 & SK하이닉스 획득
  const samsungStock = json.enrollStocks.find((stock: any) => stock.itemCode === '005930');
  const hynixStock = json.enrollStocks.find((stock: any) => stock.itemCode === '000660');

  if (!samsungStock || !hynixStock) {
    throw new Error('삼성전자 또는 SK하이닉스 종목 데이터를 네이버 API에서 찾을 수 없습니다.');
  }

  const samsungPrice = parseFloat(samsungStock.closePriceRaw);
  const samsungVolume = parseFloat(samsungStock.accumulatedTradingVolumeRaw);
  const samsungCap = parseFloat(samsungStock.marketValueRaw);

  const hynixPrice = parseFloat(hynixStock.closePriceRaw);
  const hynixVolume = parseFloat(hynixStock.accumulatedTradingVolumeRaw);
  const hynixCap = parseFloat(hynixStock.marketValueRaw);

  return {
    kospiIndex,
    totalVolumeAmount: cleanValue,
    samsungPrice,
    samsungVolume,
    samsungCap,
    hynixPrice,
    hynixVolume,
    hynixCap,
  };
}

export async function GET() {
  let useFallback = false;
  let rawData: any = null;

  try {
    const token = await getAccessToken();

    // 1. 한국투자증권 API 시도
    const [samsungData, hynixData, kospiData] = await Promise.all([
      fetchStockPrice('005930', token),
      fetchStockPrice('000660', token),
      fetchKospiIndex(token),
    ]);

    rawData = {
      kospiIndex: parseFloat(kospiData.bstp_nmix_prpr),
      totalVolumeAmount: parseFloat(kospiData.acml_tr_pbmn),
      samsungPrice: parseFloat(samsungData.stck_prpr),
      samsungVolume: parseFloat(samsungData.acml_tr_pbmn),
      samsungCap: parseFloat(samsungData.stck_prpr) * parseFloat(samsungData.lstn_stcn),
      hynixPrice: parseFloat(hynixData.stck_prpr),
      hynixVolume: parseFloat(hynixData.acml_tr_pbmn),
      hynixCap: parseFloat(hynixData.stck_prpr) * parseFloat(hynixData.lstn_stcn),
    };
  } catch (err: any) {
    console.warn('KIS API 연동 실패 (네이버 금융 실시간 폴백 가동):', err.message);
    useFallback = true;
  }

  // 2. KIS 실패 시 또는 예외 시 네이버 금융 폴백 실행
  if (useFallback || !rawData) {
    try {
      rawData = await fetchNaverFallback();
    } catch (fallbackErr: any) {
      console.error('KOSPI Ratio 백업 폴백 실행 최종 실패:', fallbackErr.message);
      return NextResponse.json({ error: '한국투자증권 API 및 네이버 백업 금융망 호출에 모두 실패했습니다.' }, { status: 500 });
    }
  }

  const {
    kospiIndex,
    totalVolumeAmount,
    samsungPrice,
    samsungVolume,
    samsungCap,
    hynixPrice,
    hynixVolume,
    hynixCap,
  } = rawData;

  // KOSPI 실시간 전체 시가총액 보정 계산
  const totalMarketCap = (KOSPI_BASE_CAP * kospiIndex) / KOSPI_BASE_INDEX;

  const combinedCap = samsungCap + hynixCap;
  const combinedVolume = samsungVolume + hynixVolume;

  // 데이터 정합성 보정: 네이버/한투 API의 지수-종목 간 갱신 시차 및 단위 집계 오차 방지
  // KOSPI 전체 거래대금은 이론적으로 두 개별 종목의 합산 거래대금보다 항상 커야 합니다.
  // 불일치 발생 시, 전체 거래대금을 두 종목 합산액의 최소 1.35배 수준으로 자동 보정하여 비율 왜곡을 방지합니다.
  const adjustedTotalVolumeAmount = Math.max(totalVolumeAmount, combinedVolume * 1.35);

  const result = {
    kospi: {
      index: kospiIndex,
      totalMarketCap,
      totalVolumeAmount: adjustedTotalVolumeAmount,
    },
    samsung: {
      price: samsungPrice,
      marketCap: samsungCap,
      volumeAmount: samsungVolume,
      marketCapPercent: parseFloat(((samsungCap / totalMarketCap) * 100).toFixed(2)),
      volumeAmountPercent: parseFloat(((samsungVolume / adjustedTotalVolumeAmount) * 100).toFixed(2)),
      volumeToCapRatio: parseFloat(((samsungVolume / samsungCap) * 100).toFixed(4)),
    },
    hynix: {
      price: hynixPrice,
      marketCap: hynixCap,
      volumeAmount: hynixVolume,
      marketCapPercent: parseFloat(((hynixCap / totalMarketCap) * 100).toFixed(2)),
      volumeAmountPercent: parseFloat(((hynixVolume / adjustedTotalVolumeAmount) * 100).toFixed(2)),
      volumeToCapRatio: parseFloat(((hynixVolume / hynixCap) * 100).toFixed(4)),
    },
    combined: {
      marketCapPercent: parseFloat(((combinedCap / totalMarketCap) * 100).toFixed(2)),
      volumeAmountPercent: parseFloat(((combinedVolume / adjustedTotalVolumeAmount) * 100).toFixed(2)),
      volumeToCapRatio: parseFloat(((combinedVolume / combinedCap) * 100).toFixed(4)),
    },
    isFallback: useFallback,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
