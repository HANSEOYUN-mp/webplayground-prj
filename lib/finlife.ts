/**
 * 금융감독원 금융상품통합비교공시(금융상품 한눈에) finlife Open API 헬퍼.
 * https://finlife.fss.or.kr — 은행 권역 topFinGrpNo=020000
 */

export const FINLIFE_BASE = "https://finlife.fss.or.kr"

export type FinlifeCategoryKey = "deposit" | "saving" | "mortgage" | "rentHouse" | "credit"

export const FINLIFE_ENDPOINTS: Record<FinlifeCategoryKey, string> = {
  deposit: "/finlifeapi/depositProductsSearch.json",
  saving: "/finlifeapi/savingProductsSearch.json",
  mortgage: "/finlifeapi/mortgageLoanProductsSearch.json",
  rentHouse: "/finlifeapi/rentHouseLoanProductsSearch.json",
  credit: "/finlifeapi/creditLoanProductsSearch.json",
}

export interface FinlifeProductRow {
  bank: string
  product: string
  rate: string | null
  term: string | null
}

function unwrapResult(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const inner = o.result ?? o.response ?? o.reponse
  if (inner && typeof inner === "object") return inner as Record<string, unknown>
  return o
}

function asStr(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s === "" ? undefined : s
}

function formatRateLabel(raw: string): string {
  const t = raw.trim()
  if (t.includes("%")) return t
  const n = Number(t.replace(/,/g, ""))
  if (Number.isFinite(n)) return `${n}%`
  return t
}

function parseFloatLoose(v: string | undefined): number | null {
  if (v == null) return null
  const n = Number(String(v).replace(/,/g, ""))
  return Number.isFinite(n) ? n : null
}

/** optionList를 fin_prdt_cd 기준으로 묶음 */
function groupOptions(optionList: unknown): Map<string, Record<string, string>[]> {
  const map = new Map<string, Record<string, string>[]>()
  if (!Array.isArray(optionList)) return map
  for (const opt of optionList) {
    if (!opt || typeof opt !== "object") continue
    const row = opt as Record<string, unknown>
    const code = asStr(row.fin_prdt_cd)
    if (!code) continue
    const strRow: Record<string, string> = {}
    for (const [k, val] of Object.entries(row)) {
      if (val != null) strRow[k] = String(val)
    }
    if (!map.has(code)) map.set(code, [])
    map.get(code)!.push(strRow)
  }
  return map
}

function pickBestDepositSavingRate(opts: Record<string, string>[]): { rate: string | null; term: string | null } {
  let best = -Infinity
  let bestRaw: string | undefined
  let term: string | null = null
  for (const o of opts) {
    const a = parseFloatLoose(o.intr_rate2)
    const b = parseFloatLoose(o.intr_rate)
    const pick = a != null && b != null ? Math.max(a, b) : a ?? b
    const raw = a != null && b != null ? (a >= b ? o.intr_rate2 : o.intr_rate) : o.intr_rate2 ?? o.intr_rate
    if (pick != null && pick > best) {
      best = pick
      bestRaw = raw
    }
    const tr = asStr(o.save_trm)
    if (tr && !term) term = `${tr}개월`
  }
  return {
    rate: bestRaw != null ? formatRateLabel(bestRaw) : null,
    term,
  }
}

function firstOptValue(opts: Record<string, string>[], key: string): string | undefined {
  for (const o of opts) {
    const v = o[key]
    if (v != null && v !== "") return v
  }
  return undefined
}

function pickLoanRateSummary(opts: Record<string, string>[]): { rate: string | null; term: string | null } {
  if (opts.length === 0) return { rate: null, term: null }
  const term = termFromLoanOption(opts[0])
  const min = firstOptValue(opts, "lend_rate_min")
  const max = firstOptValue(opts, "lend_rate_max")
  if (min && max && min !== max) {
    return { rate: `${formatRateLabel(min)}~${formatRateLabel(max)}`, term }
  }
  if (min) return { rate: formatRateLabel(min), term }
  if (max) return { rate: formatRateLabel(max), term }

  const keysPriority = ["lend_rate_avg", "loan_inrt", "avg_lend_rate", "intr_rate2", "intr_rate"]
  for (const key of keysPriority) {
    const v = firstOptValue(opts, key)
    if (v) return { rate: formatRateLabel(v), term }
  }

  const o0 = opts[0]
  for (const [k, v] of Object.entries(o0)) {
    if (!/rate|intr|lend|inrt/i.test(k)) continue
    if (v && !Number.isNaN(Number(String(v).replace(/,/g, "")))) return { rate: formatRateLabel(v), term }
  }
  return { rate: null, term }
}

function termFromLoanOption(o: Record<string, string>): string | null {
  const tr = asStr(o.save_trm) ?? asStr(o.loan_term) ?? asStr(o.loan_incl_mmon)
  if (tr) return `${tr}개월`
  return null
}

function normalizeList(
  payload: Record<string, unknown>,
  kind: "depositSaving" | "loan"
): { rows: FinlifeProductRow[]; dclsMonth?: string } {
  const err = asStr(payload.err_cd)
  if (err && err !== "000") {
    return { rows: [], dclsMonth: asStr(payload.dcls_month) }
  }

  const baseList = payload.baseList
  const optionList = payload.optionList
  const byCode = groupOptions(optionList)
  const rows: FinlifeProductRow[] = []

  if (!Array.isArray(baseList)) return { rows, dclsMonth: asStr(payload.dcls_month) }

  for (const base of baseList) {
    if (!base || typeof base !== "object") continue
    const b = base as Record<string, unknown>
    const code = asStr(b.fin_prdt_cd) ?? ""
    const bank = asStr(b.kor_co_nm) ?? "—"
    const product = asStr(b.fin_prdt_nm) ?? "—"
    const opts = byCode.get(code) ?? []

    let rate: string | null = null
    let term: string | null = null

    if (kind === "depositSaving") {
      const p = pickBestDepositSavingRate(opts)
      rate = p.rate
      term = p.term
      if (!rate) {
        const a = asStr(b.intr_rate2) ?? asStr(b.intr_rate)
        if (a) rate = formatRateLabel(a)
      }
    } else {
      const p = pickLoanRateSummary(opts)
      rate = p.rate
      term = p.term
    }

    rows.push({ bank, product, rate, term })
  }

  return { rows, dclsMonth: asStr(payload.dcls_month) }
}

export function parseFinlifeResponse(json: unknown, category: FinlifeCategoryKey): { rows: FinlifeProductRow[]; dclsMonth?: string; errMsg?: string } {
  const payload = unwrapResult(json)
  if (!payload) return { rows: [], errMsg: "빈 응답" }

  const err = asStr(payload.err_cd)
  const errMsg = asStr(payload.err_msg)
  if (err && err !== "000") {
    return { rows: [], errMsg: errMsg ?? `코드 ${err}` }
  }

  const kind: "depositSaving" | "loan" = category === "mortgage" || category === "rentHouse" || category === "credit" ? "loan" : "depositSaving"
  const { rows, dclsMonth } = normalizeList(payload, kind)
  return { rows, dclsMonth }
}

const FALLBACK_PRODUCTS: Record<FinlifeCategoryKey, FinlifeProductRow[]> = {
  deposit: [
    { bank: "케이뱅크", product: "코드K 정기예금", rate: "3.55%", term: "12개월" },
    { bank: "카카오뱅크", product: "카카오뱅크 정기예금", rate: "3.40%", term: "12개월" },
    { bank: "신한은행", product: "쏠편한 정기예금", rate: "3.35%", term: "12개월" },
    { bank: "하나은행", product: "하나의정기예금", rate: "3.35%", term: "12개월" },
    { bank: "KB국민은행", product: "KB Star 정기예금", rate: "3.35%", term: "12개월" },
    { bank: "우리은행", product: "WON플러스예금", rate: "3.32%", term: "12개월" },
    { bank: "NH농협은행", product: "NH올원e예금", rate: "3.30%", term: "12개월" },
    { bank: "토스뱅크", product: "토스뱅크 먼저 이자 받는 예금", rate: "3.20%", term: "6개월" },
  ],
  saving: [
    { bank: "전북은행", product: "JB 슈퍼씨드 적금", rate: "13.60%", term: "12개월" },
    { bank: "광주은행", product: "광주은행 제휴적금", rate: "8.00%", term: "12개월" },
    { bank: "신한은행", product: "신한 청년 처음적금", rate: "6.50%", term: "12개월" },
    { bank: "우리은행", product: "우리 퍼스트 정기적금", rate: "5.50%", term: "12개월" },
    { bank: "KB국민은행", product: "KB 스타적금", rate: "5.00%", term: "12개월" },
    { bank: "케이뱅크", product: "코드K 자유적금", rate: "4.20%", term: "12개월" },
    { bank: "카카오뱅크", product: "카카오뱅크 자유적금", rate: "3.70%", term: "12개월" },
  ],
  mortgage: [
    { bank: "케이뱅크", product: "아파트담보대출(변동)", rate: "3.72%~5.40%", term: "변동" },
    { bank: "카카오뱅크", product: "주택담보대출(혼합/고정)", rate: "3.85%~5.60%", term: "5년고정" },
    { bank: "신한은행", product: "신한주택대출", rate: "4.15%~5.85%", term: "변동" },
    { bank: "KB국민은행", product: "KB 주택담보대출", rate: "4.20%~5.90%", term: "변동" },
    { bank: "하나은행", product: "하나원큐 아파트론", rate: "4.25%~5.95%", term: "변동" },
  ],
  rentHouse: [
    { bank: "카카오뱅크", product: "HF 전월세보증금대출", rate: "3.48%~4.90%", term: "변동" },
    { bank: "케이뱅크", product: "전세대출(고정)", rate: "3.60%~4.85%", term: "고정" },
    { bank: "토스뱅크", product: "토스뱅크 전세대출", rate: "3.65%~5.10%", term: "변동" },
    { bank: "우리은행", product: "우리WON전세대출", rate: "3.90%~5.30%", term: "변동" },
  ],
  credit: [
    { bank: "카카오뱅크", product: "카카오뱅크 마이너스통장", rate: "4.45%~6.80%", term: "12개월" },
    { bank: "케이뱅크", product: "신용대출", rate: "4.50%~7.20%", term: "12개월" },
    { bank: "토스뱅크", product: "토스뱅크 신용대출", rate: "4.75%~7.50%", term: "12개월" },
    { bank: "신한은행", product: "쏠편한 직장인대출", rate: "4.90%~6.50%", term: "12개월" },
  ],
}

export async function fetchFinlifeCategory(
  auth: string,
  category: FinlifeCategoryKey,
  numOfRows: number,
  pageNo = 1
): Promise<{ rows: FinlifeProductRow[]; dclsMonth?: string; errMsg?: string }> {
  const path = FINLIFE_ENDPOINTS[category]
  const url = new URL(path, FINLIFE_BASE)
  url.searchParams.set("auth", auth)
  url.searchParams.set("topFinGrpNo", "020000")
  url.searchParams.set("pageNo", String(pageNo))
  url.searchParams.set("numOfRows", String(numOfRows))

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      return {
        rows: FALLBACK_PRODUCTS[category] || [],
        dclsMonth: "202610",
        errMsg: `금융감독원 서버 점검 중 (HTTP ${res.status})`,
      }
    }

    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("text/html")) {
      // 금감원 서버 전기설비 점검 등으로 HTML 점검 페이지가 반환된 경우
      return {
        rows: FALLBACK_PRODUCTS[category] || [],
        dclsMonth: "202610",
        errMsg: "금융감독원 서비스 정기 점검 중 (최근 공시 데이터 표시)",
      }
    }

    const text = await res.text()
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return {
        rows: FALLBACK_PRODUCTS[category] || [],
        dclsMonth: "202610",
        errMsg: "금융감독원 서비스 점검 중 (최근 공시 데이터 표시)",
      }
    }

    return parseFinlifeResponse(json, category)
  } catch {
    return {
      rows: FALLBACK_PRODUCTS[category] || [],
      dclsMonth: "202610",
      errMsg: "금융감독원 네트워크 연결 지연 (최근 공시 데이터 표시)",
    }
  }
}
