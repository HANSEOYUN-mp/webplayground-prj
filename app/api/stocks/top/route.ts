import { NextResponse } from "next/server"

const BASE_URL = "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo"

/** API 응답 item 타입 (주식시세) */
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

/** 한 페이지 조회 (공공데이터 포털) */
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
  })
  const res = await fetch(`${BASE_URL}?${params}`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json()
  const resultCode = data?.response?.header?.resultCode
  if (resultCode !== "00") {
    throw new Error(data?.response?.header?.resultMsg ?? "API error")
  }
  const body: ApiBody = data?.response?.body ?? {}
  const raw = body.items?.item
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list.filter((x): x is StockItem => x != null && typeof x === "object")
}

/** 시가총액 상위 10개 (한국 주식, 기준일자 데이터 수집 후 정렬) */
export async function GET() {
  const serviceKey = process.env.STOCK_API_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: "STOCK_API_KEY가 설정되지 않았습니다. .env.local에 STOCK_API_KEY를 추가하세요." },
      { status: 500 }
    )
  }

  const all: StockItem[] = []
  const numOfRows = 1000
  let finalBasDt = ""

  // 최대 7일(일주일) 전까지 거슬러 올라가며 가장 최근의 '영업일(장 열린 날)' 데이터를 찾음
  for (let offset = 1; offset <= 7; offset++) {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    const basDt = d.toISOString().slice(0, 10).replace(/-/g, "")
    
    try {
      // 해당 날짜의 첫 번째 페이지 확인
      const firstPage = await fetchPage(serviceKey, 1, numOfRows, basDt)
      if (firstPage.length > 0) {
        // 데이터가 존재하면 휴일이 아님! (가장 최근 영업일 발견)
        finalBasDt = basDt
        all.push(...firstPage)
        
        // 데이터가 1000개(한 페이지 꽉 참)이면 나머지 페이지들도 연달아 호출
        if (firstPage.length === numOfRows) {
          let pageNo = 2
          while (pageNo <= 10) {
            const page = await fetchPage(serviceKey, pageNo, numOfRows, basDt)
            if (page.length === 0) break
            all.push(...page)
            if (page.length < numOfRows) break
            pageNo++
          }
        }
        // 최신 영업일 1일치의 데이터를 전부 가져왔으므로 뒤의 날짜들은 검색 안 함
        break
      }
    } catch (e) {
      console.error(`stock API page error for basDt ${basDt}`, e)
    }
  }

  // 거래대금(trPrc) 내림차순 정렬 후 상위 15
  const sorted = [...all].sort((a, b) => {
    const prcA = Number(a.trPrc ?? 0)
    const prcB = Number(b.trPrc ?? 0)
    return prcB - prcA
  })
  const top15 = sorted.slice(0, 15)

  return NextResponse.json({
    basDt: finalBasDt || "N/A",
    items: top15.map((item, i) => ({
      rank: i + 1,
      itmsNm: item.itmsNm ?? "-",
      mrktCtg: item.mrktCtg ?? "-",
      clpr: item.clpr ?? "-",
      vs: item.vs ?? "-",
      fltRt: item.fltRt ?? "-",
      mrktTotAmt: item.mrktTotAmt ?? "-",
      trPrc: item.trPrc ?? "-",
      trqu: item.trqu ?? "-",
      srtnCd: item.srtnCd ?? "-",
    })),
  })
}
