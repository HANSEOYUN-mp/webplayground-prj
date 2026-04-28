import { NextResponse } from "next/server";

export const revalidate = 0; // 항상 최신 데이터(접속 시 실시간 호출)

const FRED_API_KEY = process.env.FRED_API_KEY;

const SERIES = [
  { id: "DGS10", title: "미국채 10년물 금리", format: "percent" },
  { id: "DGS2", title: "미국채 2년물 금리", format: "percent" },
  { id: "T10Y2Y", title: "장단기 금리차 (10Y-2Y)", format: "percent" },
  { id: "CPIAUCSL", title: "소비자물가지수 (CPI)", format: "index" },
  { id: "PPIFIS", title: "생산자물가지수 (PPI)", format: "index" },
  { id: "UNRATE", title: "실업률", format: "percent" },
  { id: "A191RL1Q225SBEA", title: "실질 GDP 성장률", format: "percent" }
];

export async function GET() {
  if (!FRED_API_KEY) {
    return NextResponse.json({ error: "FRED API Key is missing" }, { status: 500 });
  }

  try {
    const results = await Promise.all(
      SERIES.map(async (s) => {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=10`;
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`Failed to fetch ${s.id}`);
          return null;
        }
        const data = await res.json();
        
        // FRED 데이터에서 "." 으로 표시되는 결측치 필터링
        const validObservations = data.observations.filter((obs: any) => obs.value !== ".");
        
        // 최신 2개 데이터 추출
        if (validObservations.length >= 2) {
          const latest = validObservations[0];
          const previous = validObservations[1];
          
          return {
            id: s.id,
            title: s.title,
            format: s.format,
            latest: {
              date: latest.date,
              value: parseFloat(latest.value)
            },
            previous: {
              date: previous.date,
              value: parseFloat(previous.value)
            }
          };
        }
        return null;
      })
    );

    const validResults = results.filter((r) => r !== null);

    return NextResponse.json({ items: validResults });
  } catch (error) {
    console.error("Error fetching FRED data:", error);
    return NextResponse.json({ error: "Failed to fetch FRED data" }, { status: 500 });
  }
}
