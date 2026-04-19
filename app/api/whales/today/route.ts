import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 0; // 항상 실시간(최신) 데이터 반환

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase 연결 정보가 .env.local에 설정되지 않았습니다.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // KST(UTC+9) 기준으로 오전 9시 계산
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    
    // 현재 시간을 KST로 변환 (Date 객체의 UTC 필드를 KST값으로 쓰기 위함)
    const nowKst = new Date(now.getTime() + kstOffset);

    // 기준점(오전 9시) 설정
    const targetKstDate = new Date(nowKst);
    if (nowKst.getUTCHours() < 9) {
      // 오전 9시 이전이면 "어제 오전 9시"가 기준
      targetKstDate.setUTCDate(targetKstDate.getUTCDate() - 1);
    }
    targetKstDate.setUTCHours(9, 0, 0, 0);

    // 실제 UTC timestamp(밀리초)로 다시 변환
    const startTimestampMs = targetKstDate.getTime() - kstOffset;

    // Supabase에서 timestamp 기준 이후 데이터만 가져오기
    const { data: whales, error } = await supabase
      .from('crypto_whales')
      .select('*')
      .gte('timestamp', startTimestampMs)
      .order('timestamp', { ascending: false })
      .limit(100); // UI 보호 차원에서 최대 100건만 가져옴

    if (error) {
      throw error;
    }

    return NextResponse.json({ items: whales || [] });
  } catch (error) {
    console.error("Whales API Error:", error);
    return NextResponse.json(
      { items: [], message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
