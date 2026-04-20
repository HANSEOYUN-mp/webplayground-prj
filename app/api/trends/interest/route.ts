import { NextResponse } from "next/server"

export const revalidate = 14400 // 4시간 캐시

// 추적할 5개 금융 키워드
const KEYWORDS = ["Bitcoin", "Gold", "Recession", "Nasdaq", "Federal Reserve rate cut"]

export interface InterestKeyword {
  keyword: string
  label: string   // 화면에 표시할 짧은 이름
  value: number   // 현재(최신) 관심도 0~100
  trend: "up" | "down" | "flat" // 첫날 vs 마지막날 비교
  color: string   // 색상 클래스
}

export async function GET() {
  try {
    // google-trends-api는 CJS 모듈이므로 require 사용
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const googleTrends = require("google-trends-api")

    const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7일 전

    const raw: string = await googleTrends.interestOverTime({
      keyword: KEYWORDS,
      startTime,
      geo: "",       // 전세계
      hl: "en-US",
    })

    // 앞부분 ")]}'\n" 제거 후 JSON 파싱
    const json = JSON.parse(raw.replace(/^\)\]\}',?\n/, ""))
    const timeline: Array<{
      value: number[]
      formattedAxisTime: string
      hasData: boolean[]
    }> = json?.default?.timelineData ?? []

    if (timeline.length === 0) {
      return NextResponse.json({ error: "데이터 없음" }, { status: 502 })
    }

    const COLORS = [
      "amber",     // Bitcoin
      "yellow",    // Gold
      "rose",      // Recession
      "sky",       // Nasdaq
      "indigo",    // Federal Reserve rate cut
    ]
    const LABELS = ["Bitcoin", "Gold", "Recession", "Nasdaq", "Fed Rate Cut"]

    const items: InterestKeyword[] = KEYWORDS.map((kw, i) => {
      const firstVal  = timeline[0]?.value[i] ?? 0
      const lastVal   = timeline[timeline.length - 1]?.value[i] ?? 0
      const diff = lastVal - firstVal
      const trend: "up" | "down" | "flat" =
        diff > 5 ? "up" : diff < -5 ? "down" : "flat"

      return {
        keyword: kw,
        label: LABELS[i],
        value: lastVal,
        trend,
        color: COLORS[i],
      }
    })

    return NextResponse.json({ items, updatedAt: new Date().toISOString() })
  } catch (e) {
    console.error("Interest over time fetch error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패", items: [] },
      { status: 500 }
    )
  }
}
