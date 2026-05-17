/**
 * 업비트 변동성 돌파 봇 (GCP VM용)
 * 요구사항: upbitbot_requirement.md
 * - 감시: KRW-BTC, KRW-ETH (env MARKETS 로 덮어쓰기 가능)
 * - 롱: VolRel%(V_cum=candle_acc_trade_volume 당일 일봉) >= MIN_VOL_REL_PCT AND P > BreakoutLong → (T,T+60s] 집계 → 지연 INSERT
 * - 집계 중 P <= BreakoutLong → 취소
 * - 숏: P < BreakoutShort → 당일·해당 마켓 행 DELETE + 집계 버퍼 리셋 (진입 1회 래치)
 * - 새 롱 전 당일 동일 마켓 기존 행 DELETE (최신 1건만)
 * - 완성 INSERT 후 텔레그램 sendMessage 1회
 */

import { WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TABLE = "crypto_volatility_events";

const K = Number(process.env.K_VOL ?? "0.5");
const MIN_VOL_REL_PCT = Number(process.env.MIN_VOL_REL_PCT ?? "300");
const MARKETS = (process.env.MARKETS ?? "KRW-BTC,KRW-ETH")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 가 필요합니다(MVP 필수).");
  process.exit(1);
}

// Node.js 20 환경에서 Supabase가 WebSocket을 찾지 못하는 문제를 해결합니다.
globalThis.WebSocket = WebSocket;

const supabase = createClient(supabaseUrl, supabaseKey);

/** KST 거래일 시작(09:00)을 UTC epoch ms 로 반환 — whales API와 동일 패턴 */
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Accept: "application/json", ...opts.headers } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status} ${url}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

/** 일봉 11개 → V10d(최신 봉 제외 앞 10개 평균 거래량), 전일 H/L, 당일 시가 + 당일 봉 누적거래량(V_cum) */
async function loadDailyParams(market) {
  const candles = await fetchJson(
    `https://api.upbit.com/v1/candles/days?market=${encodeURIComponent(market)}&count=11`
  );
  if (!Array.isArray(candles) || candles.length < 2) {
    throw new Error(`${market}: 일봉 데이터 부족`);
  }
  const latest = candles[0];
  const prevDay = candles[1];
  const ten = candles.slice(1, 11);
  if (ten.length < 10) {
    console.warn(`${market}: 완료 10일 미만 — 가능한 만큼만 평균`);
  }
  const vols = ten.map((c) => Number(c.candle_acc_trade_volume) || 0);
  const v10d = vols.reduce((a, b) => a + b, 0) / Math.max(vols.length, 1);

  const prevHigh = Number(prevDay.high_price);
  const prevLow = Number(prevDay.low_price);
  const range = prevHigh - prevLow;
  const todayOpen = Number(latest.opening_price);
  const breakoutLong = todayOpen + range * K;
  const breakoutShort = todayOpen - range * K;
  const lastCandleAccVolume = Number(latest.candle_acc_trade_volume) || 0;

  return {
    params: {
      prevHigh,
      prevLow,
      range,
      todayOpen,
      breakoutLong,
      breakoutShort,
      v10d: v10d > 0 ? v10d : null,
    },
    lastCandleAccVolume,
  };
}

/** 호가 스냅샷 — total_bid_size / total_ask_size (코인 수량) */
async function fetchOrderbookSnapshot(market) {
  const list = await fetchJson(
    `https://api.upbit.com/v1/orderbook?markets=${encodeURIComponent(market)}`
  );
  const ob = Array.isArray(list) ? list[0] : list;
  if (!ob) throw new Error(`${market}: orderbook empty`);
  const at = Number(ob.timestamp) || Date.now();
  return {
    ob_total_bid_qty: Number(ob.total_bid_size) || 0,
    ob_total_ask_qty: Number(ob.total_ask_size) || 0,
    ob_snapshot_at: at,
  };
}

/** 당일 일봉(candles/days count=1)의 candle_acc_trade_volume — 문서 V_cum(당일 KST 봉 누적) */
async function fetchCandleAccTradeVolumes() {
  const map = {};
  await Promise.all(
    MARKETS.map(async (market) => {
      try {
        const candles = await fetchJson(
          `https://api.upbit.com/v1/candles/days?market=${encodeURIComponent(market)}&count=1`
        );
        if (candles?.[0]) {
          map[market] = Number(candles[0].candle_acc_trade_volume) || 0;
        }
      } catch (e) {
        console.error(`[${market}] V_cum(일봉) fetch`, e.message);
      }
    })
  );
  return map;
}

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[Telegram]", res.status, errText.slice(0, 300));
  }
}

function formatTelegramRow(row) {
  const m = row.market;
  const t = new Date(Number(row.event_time)).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  return (
    `🟢 롱 돌파 이벤트\n` +
    `${m}\n` +
    `T(KST): ${t}\n` +
    `가격: ${row.price} / 돌파선: ${row.threshold}\n` +
    `돌파 초과%: ${Number(row.breakout_excess_pct).toFixed(3)}%\n` +
    `거래량비율%: ${Number(row.volume_relative_pct).toFixed(1)}% (R=${Number(row.volume_surge_ratio).toFixed(2)})\n` +
    `1분 체결: ${row.post_1m_trade_count}건, 우세: ${row.post_1m_dominant_side}\n` +
    `호가 총매수/총매도: ${row.ob_total_bid_qty} / ${row.ob_total_ask_qty}`
  );
}

function createMarketRuntime(market) {
  return {
    market,
    params: null,
    tradingDayStartMs: getKstTradingDayStartMs(),
    lastPrice: null,
    lastCandleAccVolume: null,
    shortLatched: false,
    pending: null,
    restTimer: null,
  };
}

const runtimes = new Map();
for (const m of MARKETS) runtimes.set(m, createMarketRuntime(m));

async function refreshAllDailyParams() {
  const start = getKstTradingDayStartMs();
  for (const rt of runtimes.values()) {
    try {
      const { params, lastCandleAccVolume } = await loadDailyParams(rt.market);
      rt.params = params;
      rt.lastCandleAccVolume = lastCandleAccVolume;
      rt.tradingDayStartMs = start;
      rt.shortLatched = false;
      console.log(
        `[${rt.market}] 일봉 갱신 range=${rt.params.range?.toFixed(0)} long=${rt.params.breakoutLong?.toFixed(0)} short=${rt.params.breakoutShort?.toFixed(0)} V10d=${rt.params.v10d?.toFixed(4)} V_cum=${lastCandleAccVolume}`
      );
    } catch (e) {
      console.error(`[${rt.market}] 일봉 로드 실패`, e.message);
    }
  }
}

async function deleteSessionRows(market) {
  const start = getKstTradingDayStartMs();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("market", market)
    .gte("event_time", start);
  if (error) console.error(`[${market}] DELETE 세션 실패`, error.message);
}

function clearPending(rt, reason) {
  if (rt.pending?.timer) {
    clearTimeout(rt.pending.timer);
  }
  rt.pending = null;
  if (reason) console.log(`[${rt.market}] 집계 취소: ${reason}`);
}

function dominantSide(nBuy, nSell) {
  if (nBuy > nSell) return "BUY_HEAVY";
  if (nSell > nBuy) return "SELL_HEAVY";
  return "BALANCED";
}

async function finalizeLongEvent(rt, T, deadlineMs) {
  const p = rt.pending;
  if (!p || p.T !== T) return;
  rt.pending = null;
  if (p.timer) clearTimeout(p.timer);

  const { nBuy, nSell, buyVol, sellVol } = p;
  const totalCount = nBuy + nSell;
  const volSum = buyVol + sellVol;
  let buyPctC = null;
  let sellPctC = null;
  let buyPctV = null;
  let sellPctV = null;
  if (totalCount > 0) {
    buyPctC = (nBuy / totalCount) * 100;
    sellPctC = (nSell / totalCount) * 100;
  }
  if (volSum > 0) {
    buyPctV = (buyVol / volSum) * 100;
    sellPctV = (sellVol / volSum) * 100;
  }
  const dom = dominantSide(nBuy, nSell);
  const vcum = p.cumVolumeToday;
  const v10d = p.v10d;
  const ratio = v10d > 0 ? vcum / v10d : null;
  const volRelPct = v10d > 0 ? (vcum / v10d) * 100 : 0;

  const row = {
    market: rt.market,
    event_time: T,
    price: p.priceAtT,
    threshold: p.breakoutLong,
    range: p.range,
    k: K,
    volume_surge_ratio: ratio,
    volume_relative_pct: volRelPct,
    avg_volume_10d: v10d,
    cum_volume_today: vcum,
    breakout_excess_pct: p.breakoutLong > 0 ? ((p.priceAtT - p.breakoutLong) / p.breakoutLong) * 100 : 0,
    post_1m_window_start: T,
    post_1m_window_end: deadlineMs,
    post_1m_trade_count: totalCount,
    post_1m_volume_sum: volSum,
    post_1m_buy_volume: buyVol,
    post_1m_sell_volume: sellVol,
    post_1m_buy_pct_by_count: buyPctC,
    post_1m_sell_pct_by_count: sellPctC,
    post_1m_buy_pct_by_volume: buyPctV,
    post_1m_sell_pct_by_volume: sellPctV,
    post_1m_dominant_side: dom,
    ob_total_bid_qty: p.obBid,
    ob_total_ask_qty: p.obAsk,
    ob_snapshot_at: p.obAt,
  };

  await deleteSessionRows(rt.market);
  const { error } = await supabase.from(TABLE).insert([row]);
  if (error) {
    console.error(`[${rt.market}] INSERT 실패`, error.message);
    return;
  }
  console.log(`[${rt.market}] ✅ 롱 이벤트 기록 T=${T}`);
  try {
    await sendTelegram(formatTelegramRow(row));
  } catch (e) {
    console.error("[Telegram]", e.message);
  }
}

function startPendingAggregation(rt, trade) {
  const T = Number(trade.trade_timestamp);
  const price = Number(trade.trade_price);
  const pr = rt.params;
  if (!pr || pr.v10d == null || pr.v10d <= 0 || pr.breakoutLong <= 0) return;

  if (rt.pending && rt.pending.T === T) return;

  const vcum = rt.lastCandleAccVolume ?? 0;
  const volRelPct = (vcum / pr.v10d) * 100;
  if (volRelPct < MIN_VOL_REL_PCT || price <= pr.breakoutLong) return;

  if (rt.pending) {
    clearPending(rt, "새 AND — 이전 집계 중단");
  }

  let obBid = 0;
  let obAsk = 0;
  let obAt = Date.now();

  const deadlineMs = T + 60_000;

  rt.pending = {
    T,
    deadlineMs,
    timer: null,
    breakoutLong: pr.breakoutLong,
    priceAtT: price,
    range: pr.range,
    v10d: pr.v10d,
    cumVolumeToday: vcum,
    nBuy: 0,
    nSell: 0,
    buyVol: 0,
    sellVol: 0,
    obBid,
    obAsk,
    obAt,
  };

  (async () => {
    try {
      const snap = await fetchOrderbookSnapshot(rt.market);
      if (rt.pending && rt.pending.T === T) {
        rt.pending.obBid = snap.ob_total_bid_qty;
        rt.pending.obAsk = snap.ob_total_ask_qty;
        rt.pending.obAt = snap.ob_snapshot_at;
      }
    } catch (e) {
      console.error(`[${rt.market}] orderbook 실패`, e.message);
    }
  })();

  const delay = Math.max(0, deadlineMs - Date.now() + 50);
  rt.pending.timer = setTimeout(() => finalizeLongEvent(rt, T, deadlineMs), delay);

  console.log(`[${rt.market}] 롱 AND 충족 T=${T} → 1분 집계 시작 (deadline ${deadlineMs})`);
}

function onTrade(rt, payload) {
  const price = Number(payload.trade_price);
  const ts = Number(payload.trade_timestamp);
  const vol = Number(payload.trade_volume);
  const side = payload.ask_bid;
  rt.lastPrice = price;

  const pr = rt.params;
  if (!pr) return;

  if (price < pr.breakoutShort) {
    if (!rt.shortLatched) {
      rt.shortLatched = true;
      (async () => {
        clearPending(rt, "숏 돌파");
        await deleteSessionRows(rt.market);
        console.log(`[${rt.market}] 🔻 숏 돌파 — 당일 세션 행 DELETE`);
      })();
    }
  } else if (price >= pr.breakoutShort) {
    rt.shortLatched = false;
  }

  if (rt.pending) {
    const { T, deadlineMs, breakoutLong } = rt.pending;
    if (price <= breakoutLong) {
      clearPending(rt, "롱선 이탈 (P <= BreakoutLong)");
      return;
    }
    if (ts > T && ts <= deadlineMs) {
      if (side === "BID") {
        rt.pending.nBuy += 1;
        rt.pending.buyVol += vol;
      } else if (side === "ASK") {
        rt.pending.nSell += 1;
        rt.pending.sellVol += vol;
      }
    }
  }

  const vcum = rt.lastCandleAccVolume;
  if (vcum == null || pr.v10d == null || pr.v10d <= 0) return;
  const volRelPct = (vcum / pr.v10d) * 100;
  if (volRelPct >= MIN_VOL_REL_PCT && price > pr.breakoutLong) {
    if (!rt.pending) {
      startPendingAggregation(rt, payload);
    }
  }
}

function connectUpbit() {
  const ws = new WebSocket("wss://api.upbit.com/websocket/v1");

  ws.on("open", () => {
    console.log("✅ 업비트 WS 연결 —", MARKETS.join(", "));
    ws.send(
      JSON.stringify([{ ticket: "breakout-bot" }, { type: "trade", codes: MARKETS }])
    );
  });

  ws.on("message", (data) => {
    try {
      const text = data.toString("utf-8");
      const payload = JSON.parse(text);
      if (payload.type !== "trade" || !payload.code) return;
      const rt = runtimes.get(payload.code);
      if (rt) onTrade(rt, payload);
    } catch (e) {
      console.error("WS parse", e.message);
    }
  });

  ws.on("close", () => {
    console.warn("WS 끊김 — 5초 후 재연결");
    setTimeout(connectUpbit, 5000);
  });
  ws.on("error", (err) => {
    console.error("WS error", err);
    ws.close();
  });
}

async function candleAccVolumeLoop() {
  for (;;) {
    try {
      const vols = await fetchCandleAccTradeVolumes();
      for (const m of MARKETS) {
        const rt = runtimes.get(m);
        if (rt && vols[m] != null) rt.lastCandleAccVolume = vols[m];
      }
    } catch (e) {
      console.error("V_cum(일봉) poll", e.message);
    }
    await sleep(10_000);
  }
}

function scheduleNextKst9am(task) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const now = Date.now();
  const nowKst = new Date(now + kstOffset);
  let next = new Date(nowKst);
  next.setUTCHours(9, 0, 0, 0);
  if (nowKst.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  const nextUtc = next.getTime() - kstOffset;
  const ms = Math.max(1000, nextUtc - now);
  console.log(`⏰ 다음 KST 09:00 일봉 갱신: ${new Date(nextUtc).toISOString()} (${(ms / 3600000).toFixed(2)}h)`);
  setTimeout(async () => {
    await refreshAllDailyParams();
    for (const rt of runtimes.values()) clearPending(rt, "거래일 전환");
    scheduleNextKst9am(task);
  }, ms);
}

async function main() {
  console.log("변동성 돌파 봇 시작", { MARKETS, K, MIN_VOL_REL_PCT, TABLE });
  await refreshAllDailyParams();
  connectUpbit();
  candleAccVolumeLoop();
  scheduleNextKst9am(refreshAllDailyParams);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
