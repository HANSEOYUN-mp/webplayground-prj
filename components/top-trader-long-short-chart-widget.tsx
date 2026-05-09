"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { LineChart, RefreshCw } from "lucide-react"
import { monthlyXAxisTicks } from "@/lib/monthly-x-ticks"

type Point = { timestamp: number; value: number | null }

type ApiPayload =
  | {
      configured: false
      message: string
      chart: string
      field: string
      points: Point[]
      source: "SoSoValue"
    }
  | {
      configured: true
      chart: string
      field: string
      points: Point[]
      source: "SoSoValue"
      error?: string
    }

function fmt(v: number | null) {
  if (v == null || Number.isNaN(v)) return "-"
  return v.toFixed(4)
}

function pct(v: number) {
  return `${v.toFixed(1)}%`
}

/** 1일봉 기준: 캔들 날짜(시간대 로컬) */
function fmtBarDate(ts?: number) {
  if (!ts) return "-"
  return new Date(ts).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function fmtRatioAxis(n: number) {
  if (!Number.isFinite(n)) return "-"
  if (n === 0) return "0"
  if (n >= 10) return n.toFixed(1)
  return n.toFixed(3)
}

function autoDomain(values: number[], padRatio = 0.1): { min: number; max: number } {
  const v = values.filter((x) => Number.isFinite(x))
  if (v.length === 0) return { min: 0, max: 1 }
  const mn = Math.min(...v)
  const mx = Math.max(...v)
  const span = mx - mn
  const pad = span > 1e-9 ? span * padRatio : Math.max(Math.abs(mx), 0.01) * padRatio
  return { min: mn - pad, max: mx + pad }
}

const VB_W = 520
const M = { left: 44, right: 12, top: 18, bottom: 40 }

export function TopTraderLongShortChartWidget() {
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/crypto/long-short/top-trader")
      const json = (await res.json()) as ApiPayload
      setData(json)
    } catch {
      setData({
        configured: false,
        message: "네트워크 오류로 차트를 불러오지 못했습니다.",
        chart: "binance_btcusdt_futures_long_short_ratio_1d",
        field: "top_trader_long/short_ratio_(accounts)",
        points: [],
        source: "SoSoValue",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const points = useMemo(() => (data?.points ?? []).filter((p) => p && Number.isFinite(p.timestamp)), [data])
  const last = points.length ? points[points.length - 1] : null
  const values = useMemo(() => points.map((p) => p.value), [points])
  const lastRatio = last?.value != null && Number.isFinite(last.value) ? last.value : null

  const shares = useMemo(() => {
    if (lastRatio == null) return null
    const longPct = (lastRatio / (1 + lastRatio)) * 100
    const shortPct = 100 - longPct
    const dominance = lastRatio >= 1 ? "롱 우세" : "숏 우세"
    return { longPct, shortPct, dominance }
  }, [lastRatio])

  const ratioDomain = useMemo(() => {
    const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    return autoDomain(valid, 0.1)
  }, [values])

  const n = Math.max(1, points.length)
  const w = VB_W
  const h = 232

  const plot = useMemo(() => {
    const plotLeft = M.left
    const plotRight = w - M.right
    const plotTop = M.top
    const plotBottom = h - M.bottom
    const plotW = plotRight - plotLeft
    const plotH = plotBottom - plotTop
    const { min: yMin, max: yMax } = ratioDomain
    const ySpan = yMax - yMin || 1

    const xAt = (i: number) => plotLeft + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
    const yAt = (v: number) => plotTop + (1 - (v - yMin) / ySpan) * plotH

    const path: string[] = []
    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      if (v == null || !Number.isFinite(v)) continue
      const x = xAt(i)
      const y = yAt(v)
      path.push(`${path.length ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    }

    const tickCount = 5
    const gridLines = Array.from({ length: tickCount }, (_, k) => {
      const t = k / (tickCount - 1)
      const y = plotTop + t * plotH
      const val = yMax - t * ySpan
      return { y, val }
    })

    let lastPt: { x: number; y: number } | null = null
    for (let i = values.length - 1; i >= 0; i--) {
      const v = values[i]
      if (v != null && Number.isFinite(v)) {
        lastPt = { x: xAt(i), y: yAt(v) }
        break
      }
    }

    const xMonthTicks = monthlyXAxisTicks(points, plotLeft, plotRight)

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      path: path.join(" "),
      gridLines,
      lastPt,
      yMin,
      yMax,
      xMonthTicks,
    }
  }, [n, w, h, values, ratioDomain, points])

  const dataMin = useMemo(() => {
    const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    return valid.length ? Math.min(...valid) : 0
  }, [values])
  const dataMax = useMemo(() => {
    const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    return valid.length ? Math.max(...valid) : 0
  }, [values])

  return (
    <div className="w-full flex flex-col h-[360px] overflow-hidden bg-slate-950/40 backdrop-blur-xl border border-slate-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(148,163,184,0.10)] transition-colors duration-300 hover:bg-slate-900/50 hover:border-slate-500/60">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-500/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <LineChart className="w-5 h-5 text-violet-300 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-black text-white tracking-widest leading-none">TOP TRADER L/S</h2>
            <p className="text-[9px] text-slate-300/70 mt-1 truncate">
              Binance BTCUSDT · accounts · 1일봉 · 최근 90일 · Y축 자동 · 가로 슬롯 맞춤 (SoSoValue)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-500/30 bg-slate-950/50 text-slate-300 hover:bg-slate-900/60 hover:text-slate-100 disabled:opacity-50 transition-colors shrink-0"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {data && !data.configured && <div className="text-[11px] text-slate-200/70 leading-relaxed p-1">{data.message}</div>}
      {data?.configured && "error" in data && data.error && (
        <div className="text-[11px] text-amber-200/90 p-2 rounded-lg bg-amber-950/30 border border-amber-500/20">
          {data.error}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain pr-1 flex flex-col gap-2 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-300/60 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            불러오는 중…
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3 px-1 shrink-0">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Latest</div>
                <div className="text-xl font-extrabold text-white tracking-tight">{fmt(last?.value ?? null)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-400">최신 캔들</div>
                <div className="text-[11px] text-slate-200/80">{fmtBarDate(last?.timestamp)}</div>
              </div>
            </div>

            <div className="px-1 shrink-0">
              {shares ? (
                <div className="rounded-xl border border-slate-500/20 bg-slate-950/30 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-300/80">
                      해석: <span className="font-extrabold text-white">{shares.dominance}</span>{" "}
                      <span className="text-slate-400/70">(L/S {fmt(lastRatio)})</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      롱 {pct(shares.longPct)} · 숏 {pct(shares.shortPct)}
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full overflow-hidden bg-slate-800/60 border border-slate-700/40">
                    <div
                      className="h-full bg-emerald-500/80"
                      style={{ width: `${Math.max(0, Math.min(100, shares.longPct))}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400/70 leading-relaxed">
                    기준: 상위 트레이더 계정(accounts) 롱/숏 비율. 1보다 작으면 숏 우세, 1보다 크면 롱 우세.
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400/80 px-1">비중 계산을 위해 최신 값이 필요합니다.</div>
              )}
            </div>

            <div className="shrink-0 min-h-[260px] rounded-xl border border-violet-500/20 bg-violet-950/10">
              <div className="w-full py-1">
                <svg
                  viewBox={`0 0 ${w} ${h}`}
                  preserveAspectRatio="none"
                  className="block h-[232px] w-full max-w-full"
                >
                  <defs>
                    <linearGradient id="lsLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(167,139,250,0.95)" />
                      <stop offset="100%" stopColor="rgba(167,139,250,0.15)" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width={w} height={h} fill="transparent" />

                  <text x={8} y={14} fill="rgba(148,163,184,0.65)" fontSize="9">
                    L/S accounts ({fmtRatioAxis(plot.yMin)} → {fmtRatioAxis(plot.yMax)})
                  </text>

                  {plot.gridLines.map((gline, idx) => (
                    <g key={idx}>
                      <line
                        x1={plot.plotLeft}
                        x2={plot.plotRight}
                        y1={gline.y}
                        y2={gline.y}
                        stroke="rgba(148,163,184,0.14)"
                        strokeWidth="1"
                      />
                      <text
                        x={6}
                        y={gline.y}
                        dominantBaseline="middle"
                        fill="rgba(196,181,253,0.92)"
                        fontSize="10"
                      >
                        {fmtRatioAxis(gline.val)}
                      </text>
                    </g>
                  ))}

                  {plot.xMonthTicks.map((tk, idx) => (
                    <g key={idx}>
                      <line
                        x1={tk.x}
                        x2={tk.x}
                        y1={plot.plotTop}
                        y2={plot.plotBottom}
                        stroke="rgba(148,163,184,0.1)"
                        strokeWidth="1"
                      />
                      <text
                        x={tk.x}
                        y={plot.plotBottom + 14}
                        textAnchor="middle"
                        fill="rgba(148,163,184,0.78)"
                        fontSize="9"
                      >
                        {tk.label}
                      </text>
                    </g>
                  ))}

                  {plot.path ? (
                    <>
                      <path
                        d={plot.path}
                        fill="none"
                        stroke="url(#lsLine)"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {plot.lastPt && (
                        <circle
                          cx={plot.lastPt.x}
                          cy={plot.lastPt.y}
                          r="4"
                          fill="rgba(167,139,250,0.95)"
                          stroke="rgba(15,23,42,0.9)"
                          strokeWidth="2"
                        />
                      )}
                    </>
                  ) : (
                    <text x={w / 2} y={h / 2} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="12">
                      데이터 없음
                    </text>
                  )}
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400/80 px-1 shrink-0">
              <span>
                90d · Y 자동 {fmtRatioAxis(plot.yMin)}–{fmtRatioAxis(plot.yMax)} · 데이터 {dataMin.toFixed(4)}–
                {dataMax.toFixed(4)}
              </span>
              <span>{points.length} pts</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
