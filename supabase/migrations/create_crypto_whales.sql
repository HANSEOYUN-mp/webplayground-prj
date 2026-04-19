-- ==========================================
-- 1. crypto_whales 테이블 생성
-- ==========================================
CREATE TABLE IF NOT EXISTS public.crypto_whales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    price NUMERIC NOT NULL,
    volume NUMERIC NOT NULL,
    amount NUMERIC NOT NULL,
    ask_bid TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. 인덱스 생성 (시간순 정렬 및 빠른 검색을 위해)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_crypto_whales_timestamp ON public.crypto_whales (timestamp DESC);

-- ==========================================
-- 3. RLS (Row Level Security) 설정
-- ==========================================
-- 테이블의 RLS 활성화
ALTER TABLE public.crypto_whales ENABLE ROW LEVEL SECURITY;

-- 익명 유저(누구나)는 읽기만 가능하도록 허용 (API용)
CREATE POLICY "Allow anonymous read access" 
    ON public.crypto_whales 
    FOR SELECT 
    USING (true);

-- 주의: Insert는 Bot 전용 서비스 키(Service Role Key)를 사용하여 권한 우회 후 삽입합니다. 
-- 따라서 외부 로그인 없는 사용자에게는 Insert 권한을 주지 않습니다.

-- ==========================================
-- 4. 이전 데이터 자동 삭제를 위한 30일 보관 정책 추가 (선택사항)
-- 데이터가 무한히 쌓이는 것을 방지하기 위한 함수 및 트리거 (선택적으로 사용)
-- ==========================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete_old_crypto_whales', '0 3 * * *', $$
--     DELETE FROM public.crypto_whales WHERE created_at < NOW() - INTERVAL '30 days';
-- $$);
