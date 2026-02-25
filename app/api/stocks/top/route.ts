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

  // 최근 기준일자 (어제, 영업일 보정 없음)
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const basDt = d.toISOString().slice(0, 10).replace(/-/g, "")

  const all: StockItem[] = []
  const numOfRows = 1000
  let pageNo = 1
  let hasMore = true

  while (hasMore && pageNo <= 10) {
    try {
      const page = await fetchPage(serviceKey, pageNo, numOfRows, basDt)
      if (page.length === 0) break
      all.push(...page)
      if (page.length < numOfRows) break
      pageNo++
    } catch (e) {
      console.error("stock API page error", e)
      break
    }
  }

  // 시가총액 내림차순 정렬 후 상위 10
  const sorted = [...all].sort((a, b) => {
    const amtA = Number(a.mrktTotAmt ?? 0)
    const amtB = Number(b.mrktTotAmt ?? 0)
    return amtB - amtA
  })
  const top10 = sorted.slice(0, 10)

  return NextResponse.json({
    basDt,
    items: top10.map((item, i) => ({
      rank: i + 1,
      itmsNm: item.itmsNm ?? "-",
      mrktCtg: item.mrktCtg ?? "-",
      clpr: item.clpr ?? "-",
      vs: item.vs ?? "-",
      fltRt: item.fltRt ?? "-",
      mrktTotAmt: item.mrktTotAmt ?? "-",
      trqu: item.trqu ?? "-",
      srtnCd: item.srtnCd ?? "-",
    })),
  })
}
