import { NextResponse } from "next/server"

export const revalidate = 3600 // 1시간 캐시 (한국과 동일)

export async function GET() {
  try {
    const res = await fetch("https://trends.google.com/trending/rss?geo=US", {
      next: { revalidate: 3600 }
    })

    if (!res.ok) {
      throw new Error(`Google Trends RSS error: ${res.status}`)
    }

    const xml = await res.text()

    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    const trends = []

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemBlock = match[1]

      const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(itemBlock)
      const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : "Unknown"

      const trafficMatch = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/.exec(itemBlock)
      const traffic = trafficMatch ? trafficMatch[1].replace(/\+/g, '+') : ""

      if (title.toLowerCase().includes("daily search trends") || title === "Unknown") continue

      trends.push({ title, traffic })
    }

    return NextResponse.json({
      items: trends.slice(0, 20)
    })
  } catch (e) {
    console.error("US Trends fetch error:", e)
    return NextResponse.json({ error: "Failed to fetch US trends", items: [] }, { status: 500 })
  }
}
