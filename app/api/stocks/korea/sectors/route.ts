import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 300; // Cache for 5 minutes

const BASE_URL = "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo"

interface StockItem {
  basDt?: string
  srtnCd?: string
  isinCd?: string
  itmsNm?: string
  mrktCtg?: string
  clpr?: string
  vs?: string
  fltRt?: string
  mkp?: string
  hipr?: string
  lopr?: string
  trqu?: string
  trPrc?: string
  lstgStCnt?: string
  mrktTotAmt?: string
}

interface ApiBody {
  items?: { item?: StockItem | StockItem[] }
  totalCount?: string
}

// 120+ 주요 중대형주 섹터 매핑 정의
const SECTORS: Record<string, string[]> = {
  "반도체": [
    "삼성전자", "SK하이닉스", "한미반도체", "DB하이텍", "리노공업", "이오테크닉스", "ISC", "HPSP", 
    "주성엔지니어링", "하나마이크론", "가온칩스", "에이디테크놀로지", "동진쎄미켐", "솔브레인", "원익IPS", 
    "티씨케이", "피에스케이", "테스", "에스앤에스텍"
  ],
  "2차전지": [
    "LG에너지솔루션", "POSCO홀딩스", "에코프로비엠", "에코프로", "LG화학", "삼성SDI", "포스코퓨처엠", 
    "금양", "엘앤에프", "코스모신소재", "대주전자재료", "나노신소재", "이수스페셜티케미컬", "에코프로머티", 
    "코스모화학", "성일하이텍", "더블유씨피"
  ],
  "IT/전자부품": [
    "삼성전기", "LG이노텍", "삼성에스디에스", "LG디스플레이", "한화시스템", "대덕전자", "코리아써키트", "심텍"
  ],
  "바이오": [
    "삼성바이오로직스", "셀트리온", "유한양행", "알테오젠", "HLB", "SK바이오팜", "한미약품", "대웅제약", 
    "리가켐바이오", "삼천당제약", "에스티팜", "휴젤", "셀트리온제약", "메디톡스", "클래시스", "파마리서치", 
    "신풍제약", "HLB생명과학", "녹십자", "한올바이오파마"
  ],
  "자동차": [
    "현대차", "기아", "현대모비스", "HL만도", "현대위아", "서연이화", "성우하이텍", "화신", "에스엘"
  ],
  "인터넷/게임/엔터": [
    "NAVER", "카카오", "카카오페이", "카카오뱅크", "크래프톤", "엔씨소프트", "넷마블", "펄어비스", 
    "하이브", "JYP Ent.", "에스엠", "와이지엔터테인먼트", "CJ ENM", "위메이드", "카카오게임즈", "데브시스터즈", "시프트업"
  ],
  "조선/기계/방산": [
    "한화에어로스페이스", "현대로템", "LIG넥스원", "한국항공우주", "HD현대중공업", "삼성중공업", "한화오션", 
    "HD현대마린솔루션", "두산에너빌리티", "효성중공업", "HD현대일렉트릭", "두산밥캣", "HD현대인프라코어", "태광", "성광벤드"
  ],
  "금융/지주": [
    "KB금융", "신한지주", "하나금융지주", "우리금융지주", "메리츠금융지주", "삼성생명", "삼성화재", 
    "DB손해보험", "현대해상", "기업은행", "한국금융지주", "삼성증권", "미래에셋증권", "키움증권", "NH투자증권", "동양생명", "한화생명"
  ],
  "철강/에너지/소비재": [
    "고려아연", "포스코인터내셔널", "SK이노베이션", "S-Oil", "한화솔루션", "금호석유", "롯데케미칼", "대한항공", 
    "아시아나항공", "HMM", "팬오션", "한국가스공사", "한국전력", "SKC", "효성티앤씨", "코오롱인더", "이수화학", 
    "영원무역", "한세실업", "CJ제일제당", "대상", "오뚜기", "농심", "삼양식품", "풀무원", "롯데칠성", 
    "하이트진로", "BGF리테일", "GS리테일", "신세계", "현대백화점", "이마트", "호텔신라", "아모레퍼시픽", 
    "LG생활건강", "코스맥스", "한국콜마"
  ]
};

// O(1) 룩업을 위한 역방향 매핑 테이블 생성
const STOCK_TO_SECTOR: Record<string, string> = {};
for (const [sector, stocks] of Object.entries(SECTORS)) {
  for (const stock of stocks) {
    STOCK_TO_SECTOR[stock.replace(/\s+/g, "")] = sector;
  }
}

async function fetchPage(
  serviceKey: string,
  pageNo: number,
  numOfRows: number,
  basDt: string
): Promise<StockItem[]> {
  const params = new URLSearchParams({
    serviceKey,
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    resultType: "json",
    basDt,
  });
  
  const res = await fetch(`${BASE_URL}?${params}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const resultCode = data?.response?.header?.resultCode;
  if (resultCode !== "00") {
    throw new Error(data?.response?.header?.resultMsg ?? "API error");
  }
  const body: ApiBody = data?.response?.body ?? {};
  const raw = body.items?.item;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((x): x is StockItem => x != null && typeof x === "object");
}

export async function GET() {
  const serviceKey = process.env.STOCK_API_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "STOCK_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const all: StockItem[] = [];
  const numOfRows = 1000;
  let finalBasDt = "";

  // 영업일 조회 루프 (최근 7일)
  for (let offset = 1; offset <= 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const basDt = d.toISOString().slice(0, 10).replace(/-/g, "");

    try {
      const firstPage = await fetchPage(serviceKey, 1, numOfRows, basDt);
      if (firstPage.length > 0) {
        finalBasDt = basDt;
        all.push(...firstPage);

        // 전체 데이터를 수집하기 위해 추가 페이지 호출 (KOSPI/KOSDAQ 전체 커버용 최대 4페이지)
        let pageNo = 2;
        while (pageNo <= 4) {
          const page = await fetchPage(serviceKey, pageNo, numOfRows, basDt);
          if (page.length === 0) break;
          all.push(...page);
          if (page.length < numOfRows) break;
          pageNo++;
        }
        break;
      }
    } catch (e) {
      console.warn(`${basDt} 데이터 수집 중 에러 발생, 다른 날짜 시도:`, e);
    }
  }

  if (all.length === 0) {
    return NextResponse.json(
      { error: "최근 영업일 주식 데이터를 찾을 수 없습니다." },
      { status: 500 }
    );
  }

  // 섹터별 집계용 임시 저장소
  const sectorValues: Record<string, number> = {};
  for (const sector of Object.keys(SECTORS)) {
    sectorValues[sector] = 0;
  }

  let totalMarketVolume = 0;
  let totalMappedVolume = 0;

  // 전체 주식 목록을 돌며 섹터 매핑 및 집계
  for (const item of all) {
    if (!item.itmsNm || !item.trPrc) continue;
    const name = item.itmsNm.replace(/\s+/g, "");
    const trPrc = parseFloat(item.trPrc);
    if (isNaN(trPrc)) continue;

    totalMarketVolume += trPrc;

    const matchedSector = STOCK_TO_SECTOR[name];
    if (matchedSector) {
      sectorValues[matchedSector] += trPrc;
      totalMappedVolume += trPrc;
    }
  }

  // 섹터별 최종 포맷 구성 및 정렬
  const sectorList = Object.entries(sectorValues).map(([name, value]) => {
    const percent = totalMappedVolume > 0 ? parseFloat(((value / totalMappedVolume) * 100).toFixed(2)) : 0;
    const marketPercent = totalMarketVolume > 0 ? parseFloat(((value / totalMarketVolume) * 100).toFixed(2)) : 0;
    return {
      name,
      value, // 단위: 원
      percent, // 주요 섹터 합산 대비 비중 (%)
      marketPercent // 전체 시장 거래대금 대비 비중 (%)
    };
  }).sort((a, b) => b.value - a.value);

  // 기준일 날짜 포맷 (YYYY-MM-DD)
  const formattedDate = finalBasDt 
    ? `${finalBasDt.slice(0, 4)}-${finalBasDt.slice(4, 6)}-${finalBasDt.slice(6, 8)}`
    : "조회불가";

  return NextResponse.json({
    basDt: formattedDate,
    totalMarketVolume,
    totalMappedVolume,
    sectors: sectorList
  });
}
