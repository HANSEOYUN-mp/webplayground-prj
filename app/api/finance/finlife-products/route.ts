import { NextResponse } from "next/server"
import {
  type FinlifeCategoryKey,
  type FinlifeProductRow,
  fetchFinlifeCategory,
} from "@/lib/finlife"

/** 빌드 시점이 아닌 요청 시마다 인증키·금감원 데이터 반영 */
export const dynamic = "force-dynamic"

const CATEGORIES: FinlifeCategoryKey[] = ["deposit", "saving", "mortgage", "rentHouse", "credit"]

const EMPTY_ITEMS: Record<FinlifeCategoryKey, FinlifeProductRow[]> = {
  deposit: [],
  saving: [],
  mortgage: [],
  rentHouse: [],
  credit: [],
}

/** 금융상품한눈에 인증키 — https://finlife.fss.or.kr 에서 발급 */
function getAuth(): string | undefined {
  return process.env.FINLIFE_AUTH?.trim() || process.env.FSS_FINLIFE_AUTH?.trim()
}

export async function GET() {
  const auth = getAuth()
  if (!auth) {
    return NextResponse.json({
      configured: false as const,
      message:
        "FINLIFE_AUTH(또는 FSS_FINLIFE_AUTH) 환경 변수가 없습니다. 금융상품한눈에 오픈 API 인증키를 .env.local에 설정해 주세요.",
      dclsMonth: undefined as string | undefined,
      items: EMPTY_ITEMS,
      errors: {} as Partial<Record<FinlifeCategoryKey, string>>,
    })
  }

  const numOfRows = 8
  const settled = await Promise.all(
    CATEGORIES.map(async (cat) => {
      const r = await fetchFinlifeCategory(auth, cat, numOfRows)
      return { cat, ...r }
    })
  )

  const items = { ...EMPTY_ITEMS }
  const errors: Partial<Record<FinlifeCategoryKey, string>> = {}
  let dclsMonth: string | undefined

  for (const { cat, rows, dclsMonth: dm, errMsg } of settled) {
    items[cat] = rows
    if (dm) dclsMonth = dm
    if (errMsg && rows.length === 0) errors[cat] = errMsg
  }

  return NextResponse.json({
    configured: true as const,
    dclsMonth,
    items,
    errors,
  })
}
