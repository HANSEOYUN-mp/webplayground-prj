import { WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 환경 변수 설정 (.env 파일 로드)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
// 외부 로그인 없는 봇이기 때문에, 데이터를 쓰기(Insert) 위해서는 서비스 롤 키(Service Role Key)가 필요합니다.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 누락되었습니다.');
  process.exit(1);
}

// 클라이언트 초기화
const supabase = createClient(supabaseUrl, supabaseKey);

// 감지할 코인 목록 및 기준 금액 (1억 원)
const TARGET_COINS = ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-SOL", "KRW-DOGE"];
const THRESHOLD = 100_000_000;

function connectUpbit() {
  console.log('업비트 웹소켓 서버에 연결 중...');
  const ws = new WebSocket('wss://api.upbit.com/websocket/v1');

  ws.on('open', () => {
    console.log('✅ 연결 성공! 고래 움직임 감시를 시작합니다.');
    const msg = [
      { ticket: "whale-tracker-bot" },
      { type: "trade", codes: TARGET_COINS }
    ];
    ws.send(JSON.stringify(msg));
  });

  ws.on('message', async (data) => {
    try {
      const text = data.toString('utf-8');
      const payload = JSON.parse(text);

      if (payload.type === "trade") {
        const amount = payload.trade_price * payload.trade_volume;

        // 1억 원 이상인 경우만 캐치
        if (amount >= THRESHOLD) {
          const coinName = payload.code.replace("KRW-", "");
          const isBuy = payload.ask_bid === 'BID';
          console.log(`[🐳 고래발견] ${coinName} | ${isBuy ? '매수(빨강)' : '매도(파랑)'} | ${(amount / 100000000).toFixed(2)}억 원`);

          const insertData = {
            code: coinName,
            price: payload.trade_price,
            volume: payload.trade_volume,
            amount: amount,
            ask_bid: payload.ask_bid,
            timestamp: payload.trade_timestamp
          };

          // Supabase DB에 실시간 저장
          const { error } = await supabase
            .from('crypto_whales')
            .insert([insertData]);

          if (error) {
            console.error('❌ Supabase 저장 실패:', error.message);
          }
        }
      }
    } catch (err) {
      console.error('메세지 파싱 에러:', err);
    }
  });

  // 끊겼을 때의 자동 재연결 로직 (24시간 안정성을 위해 매우 중요함)
  ws.on('close', () => {
    console.log('⚠️ 웹소켓 연결이 끊어졌습니다. 5초 뒤 재연결을 시도합니다...');
    setTimeout(connectUpbit, 5000);
  });

  ws.on('error', (err) => {
    console.error('웹소켓 에러 발생:', err);
    ws.close(); // close 이벤트를 발생시켜 재연결 로직을 타게 함
  });
}

// ─────────────────────────────────────────
// 🗑️ 매일 오전 9시(KST) 자동 데이터 정리
// ─────────────────────────────────────────

async function cleanOldData() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const nowKst = new Date(now.getTime() + kstOffset);

  // 오늘 오전 9시 KST → UTC 밀리초
  const todayNineAm = new Date(nowKst);
  todayNineAm.setUTCHours(9, 0, 0, 0);
  const cutoffMs = todayNineAm.getTime() - kstOffset;

  console.log(`🗑️ [자동 정리] ${cutoffMs} (${new Date(cutoffMs).toISOString()}) 이전 데이터 삭제 시작...`);

  const { error, count } = await supabase
    .from('crypto_whales')
    .delete({ count: 'exact' })
    .lt('timestamp', cutoffMs);

  if (error) {
    console.error('❌ 자동 정리 실패:', error.message);
  } else {
    console.log(`✅ 자동 정리 완료: ${count ?? '?'}건 삭제됨`);
  }

  // 다음 날 오전 9시에 다시 실행 예약
  scheduleNextCleanup();
}

function scheduleNextCleanup() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const nowKst = new Date(now.getTime() + kstOffset);

  // 다음 오전 9시(KST) 계산
  const nextNineAm = new Date(nowKst);
  nextNineAm.setUTCHours(9, 0, 0, 0);

  // 이미 오전 9시가 지났으면 내일 오전 9시로
  if (nowKst.getTime() >= nextNineAm.getTime()) {
    nextNineAm.setUTCDate(nextNineAm.getUTCDate() + 1);
  }

  // 실제 UTC 기준 타겟 시각
  const nextCleanupUtc = new Date(nextNineAm.getTime() - kstOffset);
  const msUntilCleanup = nextCleanupUtc.getTime() - now.getTime();

  const hoursLeft = (msUntilCleanup / 1000 / 60 / 60).toFixed(1);
  console.log(`⏰ 다음 자동 정리 예약: ${nextCleanupUtc.toISOString()} (약 ${hoursLeft}시간 후)`);

  setTimeout(cleanOldData, msUntilCleanup);
}

// 봇 실행
connectUpbit();

// 자동 정리 스케줄 시작
scheduleNextCleanup();
