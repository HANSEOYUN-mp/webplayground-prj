import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GAMMA_URL = "https://gamma-api.polymarket.com/events"

export async function GET() {
  try {
    // featured=true 로 폴리마켓이 선정한 주요 이슈들을 모두 가져온 뒤
    // volume24hr 기준으로 재정렬 → 홈 화면 실시간 트렌딩 순서 반영
    const params = new URLSearchParams({
      active: "true",
      closed: "false",
      featured: "true",
    })
    const res = await fetch(`${GAMMA_URL}?${params}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      const text = await res.text()
      console.error("Polymarket API", res.status, text)
      return NextResponse.json(
        { error: `Polymarket API 오류 (${res.status})` },
        { status: 502 }
      )
    }
    const raw = await res.json()
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "잘못된 응답 형식" }, { status: 502 })
    }

    // volume24hr 내림차순 정렬 → 폴리마켓 메인 화면과 동일한 트렌딩 순서
    const sorted = [...raw].sort((a, b) => (b.volume24hr ?? 0) - (a.volume24hr ?? 0))
    const top = sorted.slice(0, 10)

    const items = top.map((evt) => {
      // 파생 마켓(날짜별 옵션 등) 파싱
      const markets = (evt.markets || []).slice(0, 5).map((m: any) => {
        let yesPrice = null
        try {
          const prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices
          if (Array.isArray(prices)) yesPrice = parseFloat(prices[0])
        } catch (e) {}
        return {
          id: m.id,
          title: m.groupItemTitle || m.question || "Yes/No",
          yesPrice,
        }
      })

      return {
        id: evt.id ?? "",
        slug: evt.slug ?? "",
        title: evt.title ?? "Untitled",
        description: evt.description ?? "",
        volume: evt.volume24hr ?? 0,
        image: evt.image ?? "",
        markets,
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    console.error("Polymarket fetch error", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 }
    )
  }
}
