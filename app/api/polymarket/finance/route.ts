import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GAMMA_URL = "https://gamma-api.polymarket.com/events"

export async function GET() {
  try {
    // 연준, 금리, CPI/인플레이션 관련 태그만 사용
    const tags = ["federal-reserve", "interest-rates", "inflation"]

    // 제목에 반드시 포함돼야 할 핵심 키워드 (미국 관련만)
    const STRICT_KEYWORDS = ["fed", "fomc", "powell", "federal reserve", "rate cut", "rate hike", "basis point", "cpi", "inflation", "interest rate"]

    const fetchPromises = tags.map(tag => {
      const params = new URLSearchParams({
        active: "true",
        closed: "false",
        tag_slug: tag,
        limit: "50",
      })
      return fetch(`${GAMMA_URL}?${params}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }).then(r => r.ok ? r.json() : [])
    })

    const results = await fetchPromises.reduce(async (accP, p) => {
      const acc = await accP
      const res = await p
      return [...acc, ...res]
    }, Promise.resolve([]))

    // 제목 기준 엄격한 키워드 필터링
    const filtered = results.filter((e: any) => {
      const title = (e.title || "").toLowerCase()
      return STRICT_KEYWORDS.some(kw => title.includes(kw))
    })
    
    // 중복 제거 (filtered 기준)
    const uniqueEvents = Array.from(new Map(filtered.map((e: any) => [e.id, e])).values())

    // endDate 없는 것 제거 후 가까운 날짜 순 정렬
    const validEvents = uniqueEvents
      .filter((e: any) => e.endDate)
      .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())

    const top = validEvents.slice(0, 10)

    const items = top.map((evt: any) => {
      const pricesRaw = evt.markets?.[0]?.outcomePrices
      let yesPrice: string | null = null
      if (typeof pricesRaw === "string") {
        try {
          const arr = JSON.parse(pricesRaw) as string[]
          yesPrice = arr?.[0] ?? null
        } catch {
          yesPrice = null
        }
      } else if (Array.isArray(pricesRaw)) {
        yesPrice = pricesRaw[0] ?? null
      }
      return {
        id: evt.id ?? "",
        slug: evt.slug ?? "",
        title: evt.title ?? "Untitled",
        volume: evt.volume ?? 0,
        yesPrice: yesPrice != null ? parseFloat(String(yesPrice)) : null,
        endDate: evt.endDate ?? null,
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    console.error("Polymarket finance fetch error", e)
    return NextResponse.json(
      { error: "Fetch failed" },
      { status: 500 }
    )
  }
}
