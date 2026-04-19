# 고래 알림 자동 수집 및 누적 아키텍처 도입 (Crypto Whales Bot)

이 문서는 실시간으로 1억 원 이상의 코인 거래(고래 알림)를 24시간 감지하기 위해, 웹 브라우저 기반의 임시 수집 코드를 삭제하고 GCP(Google Cloud)와 Supabase 기반의 완전 자동화 백엔드 봇으로 마이그레이션 하는 계획안입니다.

## User Review Required

> [!WARNING]  
> 수집 봇 운영을 위한 **구글 클라우드 계정 가입(가입 시 무료 크레딧 제공 및 완전 무료 e2-micro 제공)** 및 **Supabase 프로젝트 연결** 설정이 필요합니다. 해당 과정들은 봇 코드 작성이 끝난 후 안내해 드릴 클라우드 접속 방법을 통해 직접 진행해주셔야 할 단계가 일부 포함될 수 있습니다. 진행 방식이 마음에 드시는지 확인해주세요.

## Proposed Changes

---

### Phase 1: DB 준비 (Supabase)
이전처럼 메모리에 남기지 않고, 수집된 데이터를 영구적으로 기록할 테이블을 만듭니다.

#### [NEW] `supabase/migrations/create_crypto_whales.sql`
- Supabase SQL Editor에 넣고 실행할 스크립트 작성
- `crypto_whales` 테이블 생성 
  - `id`: 고유 식별자 (자동 증가 또는 UUID)
  - `code`: 코인 종류 (BTC, ETH 등)
  - `price`: 체결 가격
  - `volume`: 체결 수량
  - `amount`: 총 체결액 (1억 원 이상)
  - `ask_bid`: 매수/매도 구분
  - `timestamp`: 체결 시간 (업비트 타임스탬프)
  - `created_at`: DB 저장 시간
- 접속 보안을 위해 RLS (Row Level Security) 설정

---

### Phase 2: 수집 봇(Node.js) 스크립트 작성
웹 브라우저의 접속 여부와 무관하게 완전히 분리되어 작동할 단독 실행형 스크립트를 작성합니다.

#### [NEW] `bot/whaleWatcher.js` (또는 별도 폴더 구성을 통한 프로젝트 분리)
- Node.js 환경에서 작동하는 자바스크립트 데몬
- 패키지 의존성: `ws` (웹소켓 연결용), `@supabase/supabase-js` (DB 연결용)
- 동작 시나리오:
  1. `wss://api.upbit.com/websocket/v1` 로 연결
  2. 수신되는 `trade` 데이터 중 체결액 1억 이상의 데이터 필터링
  3. 발견 즉시 Supabase의 `crypto_whales` 테이블에 `INSERT`
  4. 연결이 끊기면 자동으로 재연결을 시도하는 복구 로직 (에러 핸들링)

---

### Phase 3: 프론트엔드 연동 변경
이제 클라이언트의 컴퓨터나 폰 배터리를 낭비하지 않도록 프론트엔드 코드를 가볍게 바꿉니다.

#### [NEW] `app/api/whales/today/route.ts` (Next.js API 엔드포인트)
- 매일 오전 9시를 기준으로 데이터를 다르게 불러오는 로직 (Supabase 조회)
- 현재 서버 시간이 **당일 오전 9시 이전**이면: 어제 오전 9시 ~ 현재까지의 데이터를 조회.
- 현재 서버 시간이 **당일 오전 9시 이후**이면: 오늘 오전 9시 ~ 현재까지의 데이터를 조회.

#### [MODIFY] `components/galaxy-hero.tsx`
- 기존의 무거운 업비트 웹소켓 (WebSocket) 로직을 모두 일괄 **삭제**
- 웹소켓 대신 위에서 만든 Next.js API 엔드포인트를 일정 주기로 호출하거나, 페이지 로드 시 단방향으로 불러오게 수정
- 만약 대시보드 화면을 켜놓고 실시간으로 바뀌는 것을 보고 싶어한다면, Supabase의 'Realtime(실시간 구독)' 기능을 이용해 새로운 Row가 추가될 때만 화면에 자동 업데이트 하도록 반영

## Open Questions

> [!IMPORTANT]
> 1. 대시보드를 켜두었을 때 **실시간으로 새로고침할 필요 없이 고래 거래가 화면에 계속 올라오게(Supabase Realtime)** 연결해 드릴까요? 아니면 켜진 순간의 데이터를 가져오는 것으로 충분하신가요? (전자를 추천합니다)
> 2. 수집 봇은 기존 `Webplayground_prj` 프로젝트 내부의 `bot/` 폴더에 코드를 넣어드리는 방식으로 할까요? (이후 이 폴더만 압축해서 구글 클라우드에 올리는 방식을 가이드 해드리려 합니다.)

## Verification Plan

### Manual Verification
1. Supabase에서 테이블 생성이 정상적으로 작동하는지 SQL 쿼리 적용 결과를 함께 확인합니다.
2. 수집 봇을 로컬 환경(질문자의 현재 윈도우 컴퓨터)에서 잠깐 터미널로 돌려서 (`node whaleWatcher.js`) 실제로 1억 원 이상 거래가 콘솔과 Supabase에 잘 찍히는지 관찰합니다.
3. 데이터가 잘 쌓이는 걸 확인하면 프론트엔드 UI를 확인하고 변경된 날짜 계산이 맞는지 살펴봅니다.
4. 구글 클라우드 무료 서버 (e2-micro)를 생성하고 터미널 접속 창에서 봇을 올려 24시간 가동시키도록 명령어를 안내해 드립니다.
