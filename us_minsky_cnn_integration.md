# 미국 주식 시장 하이먼 민스키 스마일 커브 통합 명세서 (v1.0)
## 부제: CNN Fear & Greed Index를 활용한 대리 지표 연동 방안

## 1. 개요 (Overview)
본 문서는 실시간으로 수집하기 까다로운 미국 주식 시장의 레버리지 및 모멘텀 지표를 대체하기 위해 **CNN Fear & Greed Index(공포와 탐욕 지수)** 를 활용하여, 미국 거시 주식 시장(S&P 500 등)을 하이먼 민스키(Hyman Minsky) 모델의 단계별로 매핑하여 웹 어플리케이션에 시각화하기 위한 아키텍처 및 구현 가이드라인이다.

## 2. 핵심 지표 매핑 전략 (Data Mapping Strategy)
기존 `requirement.md`의 $Score(모멘텀+소셜+레버리지)$ 산식을 **CNN Fear & Greed Index 단일 지표**로 대체한다. 이 지수는 이미 모멘텀(125일선 이격), 주가 강도/폭, 옵션 레버리지(Put/Call), 변동성(VIX), 안전/위험 자산 수요 등 7가지 척도를 모두 포괄하여 0~100 사이의 숫자를 반환하므로 미국 시장 매크로 분석에 최적화되어 있다.

### 스코어 정규화 (Normalization)
$Minsky\_Score = CNN\_Index / 100$ (0.0 ~ 1.0 범위로 변환)

## 3. 하이먼 민스키 단계 환산 로직 (Phase Logic)

CNN 지수(0~100)를 하이먼 민스키의 4단계와 매핑하여 웹 UI 출력용 데이터로 활용한다.

| 범위 (점수) | CNN 지수 원본 단계 | 변환된 하이먼 민스키 Phase | 웹 UI 출력 가이드 (에이전트 권고) |
| :--- | :--- | :--- | :--- |
| **0 ~ 25** | Extreme Fear (극단적 공포) | **PHASE 4. 붕괴 및 좌절 (Despair)** | "시장 패닉 상태, 투매 발생. 장기적 관점의 분할 매수 기회 탐색 구간" |
| **26 ~ 45** | Fear (공포) | **PHASE 1. 잠복기 (Stealth / Awareness)** | "스마트 머니와 기관의 매집이 일어나는 저점 다지기 구간" |
| **46 ~ 55** | Neutral (중립) | 전환기 (Transition) | "방향성 탐색 구간, 관망세 유지" |
| **56 ~ 75** | Greed (탐욕) | **PHASE 2. 언론보도 증가 및 열정 (Enthusiasm)** | "상승장 본격화, 대중과 언론의 관심 집중, 추세 순응 구간" |
| **76 ~ 100**| Extreme Greed (극단적 탐욕)| **PHASE 3. 광기 및 환상 (Mania)** | "신용 레버리지가 극에 달한 환상 국면. 신규 대규모 매수 자제 및 리스크 관리(익절) 구간" |

---

## 4. 웹 어플리케이션 구현 아키텍처 (Architecture)

### Phase 1. 백엔드 데이터 수집 파이프라인 (Data Fetching)
*   **목적:** 매일 혹은 특정 주기로 CNN Fear & Greed Index를 스크래핑하여 DB에 저장.
*   **도구:** Node.js/TypeScript 서버 기반 스케줄링 (Cron) 또는 Serverless API (Vercel API/AWS Lambda 등).
*   **방법:** Python `fear-and-greed-index` 라이브러리 사용 혹은 npm의 비공식 패키지(`fear-and-greed` 등)를 통해 0~100 사이 반환된 값을 추출.
*   **저장 포맷 예시 (Supabase/PostgreSQL):**
    ```json
    {
       "date": "2026-04-23",
       "score": 82,
       "rating": "extreme greed",
       "minsky_phase": "Phase 3 (Mania)"
    }
    ```

### Phase 2. 백엔드 분석 (RAG 연동 - Optional)
*   에이전트 노드(LangGraph)에서 해당 점수(예: 82)와 현재 주가(S&P 500) 상황 지표를 컨텍스트로 LLM에 던지고, 사용자에게 전달할 '투자자 서한(인사이트 텍스트)'을 동적으로 생성.

### Phase 3. 프론트엔드 시각화 (Web Dashboard)
*   **스토리보드:**
    1. 대시보드 위젯 영역에 배경으로 '하이먼 민스키 산맥 곡선'을 흐리게 깔아둔다.
    2. 데이터베이스에서 불러온 현재 `minsky_phase`를 기반으로 배경 곡선 위 해당하는 지점에 **반짝이는 애니메이션 점(Ping Indicator)** 을 렌더링한다.
    3. 점 근처 툴팁 또는 하단 패널에 "현재 미국 시장 로직: 광기 및 환상 (CNN 지수: 82)" 형태의 텍스트가 표시된다.
*   **컴포넌트 설계 방식 (Next.js & Tailwind CSS 예시):**
    - `MinskyCurveChart` 컴포넌트: 백그라운드 SVG.
    - `DotPosition` 산출 로직: Score(0~100)를 곡선의 X 좌표와 Y 좌표로 보간(Interpolation)하여 `top`과 `left` CSS 속성을 동적으로 할당.

## 5. 단계별 다음 작업 (To-Do)
1. [ ] 백엔드: CNN Fear & Greed 데이터를 파싱하여 JSON 형태로 가져오는 간단한 스크립트 작성 (Python or Node.js)
2. [ ] DB 연동: 가져온 데이터를 Supabase에 적재하는 로직 구성
3. [ ] 프론트엔드: React/Next.js 기반으로 하이먼 민스키 위젯 UI 컴포넌트 마크업 및 애니메이션 위치 조정
