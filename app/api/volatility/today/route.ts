import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 서버에서 매번 최신 데이터를 가져오도록 캐싱 방지
export const revalidate = 0;

/** KST 거래일 시작(09:00)을 UTC epoch ms 로 반환 — 봇 로직과 동일 */
function getKstTradingDayStartMs(now = Date.now()) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const nowKst = new Date(now + kstOffset);
  const target = new Date(nowKst);
  if (nowKst.getUTCHours() < 9) {
    target.setUTCDate(target.getUTCDate() - 1);
  }
  target.setUTCHours(9, 0, 0, 0);
  return target.getTime() - kstOffset;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ items: [], error: "Supabase credentials missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const startMs = getKstTradingDayStartMs();

    const { data, error } = await supabase
      .from("crypto_volatility_events")
      .select("*")
      .gte("event_time", startMs)
      .order("event_time", { ascending: false });

    if (error) {
      console.error("Supabase API Error:", error);
      return NextResponse.json({ items: [], error: error.message }, { status: 500 });
    }

    // `post_1m_trade_count` 등 집계가 끝난 '완료' 행만 프론트로 내려보내는 것이 원칙.
    // 현재 봇 구현은 완료된 후 지연 INSERT를 하므로, 모든 반환되는 행은 기본적으로 완료 행입니다.
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    console.error("Volatility API Error:", err);
    return NextResponse.json({ items: [], error: err.message }, { status: 500 });
  }
}
