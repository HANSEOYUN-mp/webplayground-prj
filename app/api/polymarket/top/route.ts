import { NextResponse } from "next/server"

const GAMMA_URL = "https://gamma-api.polymarket.com/events"

/** Gamma API 이벤트 객체 (필요 필드만) */
interface GammaEvent {
  id?: string
  slug?: string
  title?: string
  description?: string | null
  volume?: number | null
  volumeNum?: number | null
  volume_24hr?: number | null
  liquidity?: number | null
  active?: boolean
  closed?: boolean
  endDate?: string | null
  markets?: Array<{ question?: string; outcomePrices?: string | string[] }>
}

/** 베팅 금액(volume) 순 상위 이벤트 조회 */
export async function GET() {
  try {
    const params = new URLSearchParams({
      active: "true",
      closed: "false",
      _limit: "100",
    })
    const res = await fetch(`${GAMMA_URL}?${params}`, {
      next: { revalidate: 300 },
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
    const raw: GammaEvent[] = await res.json()
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "잘못된 응답 형식" }, { status: 502 })
    }

    const vol = (evt: GammaEvent) =>
      evt.volume ?? evt.volumeNum ?? (evt as Record<string, unknown>).volume_24hr ?? 0
    const sorted = [...raw].sort((a, b) => vol(b) - vol(a))
    const top = sorted.slice(0, 15)

    const items = top.map((evt, i) => {
      const volumeNum = vol(evt)
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
        rank: i + 1,
        id: evt.id ?? "",
        slug: evt.slug ?? "",
        title: evt.title ?? "Untitled",
        volume: volumeNum,
        liquidity: evt.liquidity ?? null,
        yesPrice: yesPrice != null ? parseFloat(String(yesPrice)) : null,
        endDate: evt.endDate ?? null,
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
