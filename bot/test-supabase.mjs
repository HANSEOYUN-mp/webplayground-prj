/**
 * bot/.env 의 SUPABASE_* 로 INSERT/DELETE 1회 테스트 (테스트 행은 바로 삭제)
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("bot/.env 에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const sb = createClient(url, key);
const T = Date.now();
const row = {
  market: "KRW-BTC",
  event_time: T,
  price: 1,
  threshold: 1,
  range: 1,
  k: 0.5,
  volume_relative_pct: 300,
  breakout_excess_pct: 0.1,
  post_1m_window_start: T,
  post_1m_window_end: T + 60_000,
  post_1m_dominant_side: "BALANCED",
  ob_total_bid_qty: 1,
  ob_total_ask_qty: 1,
  ob_snapshot_at: T,
};

const { data, error: e1 } = await sb
  .from("crypto_volatility_events")
  .insert([row])
  .select("id")
  .single();

if (e1) {
  console.error("INSERT 실패:", e1.message);
  process.exit(1);
}

console.log("INSERT OK id=", data.id);

const { error: e2 } = await sb.from("crypto_volatility_events").delete().eq("id", data.id);

if (e2) {
  console.error("DELETE 실패:", e2.message);
  process.exit(1);
}

console.log("DELETE OK — Supabase 연결·권한 정상");
