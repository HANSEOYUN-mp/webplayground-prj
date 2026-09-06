import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 600 // 10분 캐시

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

let cachedData: any = null
let cacheTime = 0
const CACHE_DURATION = 10 * 60 * 1000 // 10분

/** 공공데이터 포털 빠른 조회 (타임아웃 1.5초) */
async function fetchPublicDataPage(
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
  
  const res = await fetch(`${BASE_URL}?${params}`, { 
    signal: AbortSignal.timeout(1500),
    next: { revalidate: 3600 } 
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json()
  const resultCode = data?.response?.header?.resultCode
  if (resultCode !== "00") {
    throw new Error(data?.response?.header?.resultMsg ?? "API error")
  }
  const body = data?.response?.body ?? {}
  const raw = body.items?.item
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list.filter((x): x is StockItem => x != null && typeof x === "object")
}

/** 초고속 네이버 금융 거래대금/시총 상위 크롤링 폴백 (50~100ms) */
async function fetchNaverTopStocks(): Promise<StockItem[]> {
  const res = await fetch('https://finance.naver.com/sise/sise_market_sum.naver?sosok=0', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(3000),
    next: { revalidate: 600 }
  })
  if (!res.ok) throw new Error(`Naver fetch failed (${res.status})`)
  
  const buf = await res.arrayBuffer()
  const html = new TextDecoder('euc-kr').decode(buf)
  
  const trRegex = /<tr[\s\S]*?<\/tr>/g
  let trMatch
  const items: StockItem[] = []
  
  while ((trMatch = trRegex.exec(html)) !== null) {
    const tr = trMatch[0]
    const codeMatch = tr.match(/code=(\d{6})/)
    const nameMatch = tr.match(/class="tltle">([^<]+)<\/a>/)
    const tds = tr.match(/<td class="number">([^<]+)<\/td>/g)
    if (codeMatch && nameMatch && tds && tds.length >= 8) {
      const code = codeMatch[1]
      const name = nameMatch[1].trim()
      const clpr = tds[0].replace(/<[^>]+>/g, '').trim().replace(/,/g, '')
      const vs = tds[1].replace(/<[^>]+>/g, '').trim().replace(/,/g, '')
      const fltRt = tds[2].replace(/<[^>]+>/g, '').trim().replace(/[%+\s]/g, '')
      const mrktTotAmt = tds[4].replace(/<[^>]+>/g, '').trim().replace(/,/g, '') // 억원
      const trqu = tds[5].replace(/<[^>]+>/g, '').trim().replace(/,/g, '')
      
      items.push({
        srtnCd: code,
        itmsNm: name,
        mrktCtg: 'KOSPI',
        clpr,
        vs,
        fltRt,
        mrktTotAmt: String(Number(mrktTotAmt) * 100000000),
        trPrc: String(Number(clpr) * Number(trqu)),
        trqu
      })
    }
  }
  return items
}

export async function GET() {
  try {
    // 10분 메모리 캐시 반환
    if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
      return NextResponse.json(cachedData)
    }

    const serviceKey = process.env.STOCK_API_KEY
    let all: StockItem[] = []
    let finalBasDt = ""

    // 1. 공공데이터포털 시도 (빠른 타임아웃 1.5초)
    if (serviceKey) {
      for (let offset = 1; offset <= 3; offset++) {
        const d = new Date()
        d.setDate(d.getDate() - offset)
        const basDt = d.toISOString().slice(0, 10).replace(/-/g, "")
        try {
          const firstPage = await fetchPublicDataPage(serviceKey, 1, 100, basDt)
          if (firstPage.length > 0) {
            finalBasDt = basDt
            all.push(...firstPage)
            break
          }
        } catch (e) {
          // timeout or error -> skip to fallback
          break
        }
      }
    }

    // 2. 공공데이터포털 실패/지연 시 네이버 금융 초고속 폴백
    if (all.length === 0) {
      try {
        all = await fetchNaverTopStocks()
        finalBasDt = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      } catch (e) {
        console.error("Naver top fallback failed:", e)
      }
    }

    // 거래대금/시총 정렬
    const sorted = [...all].sort((a, b) => {
      const prcA = Number(a.trPrc ?? 0)
      const prcB = Number(b.trPrc ?? 0)
      return prcB - prcA
    })
    const top20 = sorted.slice(0, 20)

    const payload = {
      basDt: finalBasDt || new Date().toISOString().slice(0, 10),
      items: top20.map((item, i) => ({
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
    }

    cachedData = payload
    cacheTime = Date.now()

    return NextResponse.json(payload)
  } catch (error: any) {
    console.error("Top stocks API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load top stocks" },
      { status: 500 }
    )
  }
}
