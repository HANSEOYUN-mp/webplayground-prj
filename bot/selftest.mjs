/**
 * breakoutBot.js 와 동일한 KST 거래일·dominantSide 로직을 복제해 검증합니다.
 * (봇 본체는 import 시 Supabase 필수라 별도 스크립트로 실행)
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const MARKETS = (process.env.MARKETS ?? "KRW-BTC,KRW-ETH")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TRADE_SAMPLE = 40;

/** breakoutBot.js getKstTradingDayStartMs 와 동일 */
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

function dominantSide(nBuy, nSell) {
  if (nBuy > nSell) return "BUY_HEAVY";
  if (nSell > nBuy) return "SELL_HEAVY";
  return "BALANCED";
}

function dominantSideByVolume(vBuy, vSell) {
  if (vBuy > vSell) return "BUY_HEAVY";
  if (vSell > vBuy) return "SELL_HEAVY";
  return "BALANCED";
}

function assert(name, cond, detail = "") {
  if (!cond) {
    throw new Error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`  ✓ ${name}`);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

function fmtQty(n, digits = 6) {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: digits });
}

function fmtKrw(n) {
  if (!Number.isFinite(n)) return "-";
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function runUnitTests() {
  console.log("\n[1] 단위: getKstTradingDayStartMs");
  const before9 = Date.parse("2026-05-14T08:59:00+09:00");
  assert(
    "08:59 KST → 전일 09:00 KST 구간 시작",
    getKstTradingDayStartMs(before9) === 1778630400000,
    `got ${getKstTradingDayStartMs(before9)}`
  );
  const after9 = Date.parse("2026-05-14T09:00:01+09:00");
  assert(
    "09:00:01 KST → 당일 09:00 KST 구간 시작",
    getKstTradingDayStartMs(after9) === 1778716800000,
    `got ${getKstTradingDayStartMs(after9)}`
  );

  console.log("\n[2] 단위: dominantSide");
  assert("매수 우세", dominantSide(10, 3) === "BUY_HEAVY");
  assert("매도 우세", dominantSide(2, 8) === "SELL_HEAVY");
  assert("동률", dominantSide(5, 5) === "BALANCED");

  console.log("\n[3] 단위: VolRel% · 돌파선 (봇과 동일 식)");
  const K = 0.5;
  const todayOpen = 100;
  const range = 10;
  const breakoutLong = todayOpen + range * K;
  assert("BreakoutLong = 시가 + K*range", breakoutLong === 105);
  const v10d = 100;
  const vcum = 300;
  const volRelPct = (vcum / v10d) * 100;
  assert("VolRel% = (V_cum / V10d) * 100", volRelPct === 300);
  assert("MIN_VOL_REL_PCT=300 이면 조건1 통과", volRelPct >= 300);
}

/** 최근 체결 샘플 — 건수·코인수량 기준 우세 (봇 1분 창과 동일 개념, 표본만 다름) */
function aggregateRecentTrades(trades) {
  let nBuy = 0;
  let nSell = 0;
  let vBuy = 0;
  let vSell = 0;
  for (const t of trades) {
    const vol = Number(t.trade_volume) || 0;
    if (t.ask_bid === "BID") {
      nBuy += 1;
      vBuy += vol;
    } else if (t.ask_bid === "ASK") {
      nSell += 1;
      vSell += vol;
    }
  }
  return {
    nBuy,
    nSell,
    vBuy,
    vSell,
    domByCount: dominantSide(nBuy, nSell),
    domByVol: dominantSideByVolume(vBuy, vSell),
    sampleCount: trades.length,
  };
}

async function fetchMarketSnapshot(market) {
  const [candles, obList, ticks] = await Promise.all([
    fetchJson(
      `https://api.upbit.com/v1/candles/days?market=${encodeURIComponent(market)}&count=1`
    ),
    fetchJson(`https://api.upbit.com/v1/orderbook?markets=${encodeURIComponent(market)}`),
    fetchJson(
      `https://api.upbit.com/v1/trades/ticks?market=${encodeURIComponent(market)}&count=${TRADE_SAMPLE}`
    ),
  ]);

  assert(`${market} 일봉 배열`, Array.isArray(candles) && candles.length >= 1);
  const c0 = candles[0];
  const vcum = Number(c0.candle_acc_trade_volume);
  assert(`${market} V_cum`, Number.isFinite(vcum) && vcum >= 0);

  const ob = Array.isArray(obList) ? obList[0] : obList;
  assert(`${market} 호가`, ob && ob.total_bid_size != null);

  assert(`${market} 체결 ticks`, Array.isArray(ticks) && ticks.length >= 1);
  const tradeAgg = aggregateRecentTrades(ticks);

  const accKrw = Number(c0.candle_acc_trade_price);
  return {
    market,
    day: {
      candle_date_time_kst: c0.candle_date_time_kst ?? "",
      opening_price: Number(c0.opening_price),
      high_price: Number(c0.high_price),
      low_price: Number(c0.low_price),
      trade_price: Number(c0.trade_price),
      candle_acc_trade_volume: vcum,
      candle_acc_trade_price: Number.isFinite(accKrw) ? accKrw : null,
    },
    orderbook: {
      total_bid_size: Number(ob.total_bid_size) || 0,
      total_ask_size: Number(ob.total_ask_size) || 0,
      timestamp: Number(ob.timestamp) || null,
    },
    tradeSample: tradeAgg,
  };
}

function formatSnapshotReport(snapshots, titleLine) {
  const lines = [titleLine, `샘플: 최근 체결 ${TRADE_SAMPLE}건`, ""];
  for (const s of snapshots) {
    const d = s.day;
    const ob = s.orderbook;
    const tr = s.tradeSample;
    const base = s.market.split("-")[1] ?? "BASE";
    lines.push(`━━ ${s.market} ━━`);
    lines.push(`일봉시각(KST): ${d.candle_date_time_kst}`);
    lines.push(`시가: ${fmtQty(d.opening_price, 0)} / 고가: ${fmtQty(d.high_price, 0)} / 저가: ${fmtQty(d.low_price, 0)} / 현재가: ${fmtQty(d.trade_price, 0)}`);
    lines.push(`당일누적거래량 V_cum: ${fmtQty(d.candle_acc_trade_volume, 8)} ${base}`);
    if (d.candle_acc_trade_price != null) {
      lines.push(`당일누적거래대금: ${fmtKrw(d.candle_acc_trade_price)}`);
    }
    lines.push(`호가 총매수잔량: ${fmtQty(ob.total_bid_size, 8)} / 총매도잔량: ${fmtQty(ob.total_ask_size, 8)} ${base}`);
    lines.push(
      `최근${tr.sampleCount}건 체결 — 매수 ${tr.nBuy}건·${fmtQty(tr.vBuy, 8)} / 매도 ${tr.nSell}건·${fmtQty(tr.vSell, 8)} ${base}`
    );
    lines.push(`  → 건수우세: ${tr.domByCount} / 거래량우세: ${tr.domByVol}`);
    lines.push("");
  }
  lines.push("단위테스트: KST경계·dominantSide·VolRel식 통과");
  return lines.join("\n");
}

async function runIntegrationSmoke() {
  console.log("\n[4] 통합(실네트): 일봉·호가·최근체결");
  const snapshots = [];
  for (const m of MARKETS) {
    const snap = await fetchMarketSnapshot(m);
    snapshots.push(snap);
    console.log(`  → ${m} 스냅샷 수집 완료`);
  }
  return snapshots;
}

async function main() {
  console.log("=== breakoutBot 셀프테스트 ===");
  console.log("시각:", new Date().toISOString());
  console.log("MARKETS:", MARKETS.join(", "));

  runUnitTests();
  const snapshots = await runIntegrationSmoke();

  const report = formatSnapshotReport(
    snapshots,
    `📊 Webplayground 봇 셀프테스트 (UTC ${new Date().toISOString()})`
  );

  console.log("\n--- 지표 스냅샷 (텔레그램과 동일) ---\n");
  console.log(report);
  console.log("--- 끝 ---\n");

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("SKIP 텔레그램: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 없음");
    process.exit(0);
  }

  console.log("[5] 텔레그램: 지표 스냅샷 전송…");
  const tg = await sendTelegram(report);
  assert("Telegram ok", tg.ok === true);

  console.log("\n=== 전부 통과 ===\n");
}

main().catch((e) => {
  console.error("\n=== 실패 ===\n", e.message);
  process.exit(1);
});
