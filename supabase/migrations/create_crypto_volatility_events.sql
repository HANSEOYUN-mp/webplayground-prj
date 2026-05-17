-- 변동성 돌파 롱 이벤트 (봇 지연 INSERT, 완료 행만)
CREATE TABLE IF NOT EXISTS public.crypto_volatility_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market TEXT NOT NULL,
    event_time BIGINT NOT NULL,
    price NUMERIC NOT NULL,
    threshold NUMERIC NOT NULL,
    range NUMERIC NOT NULL,
    k NUMERIC NOT NULL DEFAULT 0.5,
    volume_surge_ratio NUMERIC,
    volume_relative_pct NUMERIC NOT NULL,
    avg_volume_10d NUMERIC,
    cum_volume_today NUMERIC,
    breakout_excess_pct NUMERIC NOT NULL,
    post_1m_window_start BIGINT NOT NULL,
    post_1m_window_end BIGINT NOT NULL,
    post_1m_trade_count INTEGER NOT NULL DEFAULT 0,
    post_1m_volume_sum NUMERIC NOT NULL DEFAULT 0,
    post_1m_buy_volume NUMERIC NOT NULL DEFAULT 0,
    post_1m_sell_volume NUMERIC NOT NULL DEFAULT 0,
    post_1m_buy_pct_by_count NUMERIC,
    post_1m_sell_pct_by_count NUMERIC,
    post_1m_buy_pct_by_volume NUMERIC,
    post_1m_sell_pct_by_volume NUMERIC,
    post_1m_dominant_side TEXT NOT NULL,
    ob_total_bid_qty NUMERIC NOT NULL,
    ob_total_ask_qty NUMERIC NOT NULL,
    ob_snapshot_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_volatility_events_event_time
    ON public.crypto_volatility_events (event_time DESC);

CREATE INDEX IF NOT EXISTS idx_crypto_volatility_events_market_time
    ON public.crypto_volatility_events (market, event_time DESC);

ALTER TABLE public.crypto_volatility_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read volatility events"
    ON public.crypto_volatility_events
    FOR SELECT
    USING (true);

-- Data API (PostgREST) — 신규 프로젝트 정책 대비
GRANT SELECT ON public.crypto_volatility_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crypto_volatility_events TO service_role;
