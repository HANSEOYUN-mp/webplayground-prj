"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, RefreshCw } from "lucide-react"
import { monthlyXAxisTicks } from "@/lib/monthly-x-ticks"

type Row = {
  timestamp: number
  btc_price: number | null
  open_interest: number | null
  volume: number | null
}

type ApiPayload =
  | { configured: false; message: string; range: string; points: Row[]; source: "SoSoValue"; chart: string }
  | { configured: true; range: string; points: Row[]; source: "SoSoValue"; chart: string; error?: string }

/** 천 단위 k 표기 (예: 80193 → 80k, 23193 → 23k) */
function fmtK(n: number): string {
  const k = n / 1000
  const rounded = Math.round(k)
  if (Math.abs(k - rounded) < 0.05) return `${rounded}k`
  return `${k.toFixed(1)}k`
}

function fmtDate(ts?: number) {
  if (!ts) return "-"
  return new Date(ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

/** 차트와 동일: 끝에서부터 처음으로 유효한 숫자가 있는 행 (마지막 점 기준) */
function lastFiniteFromSeries(
  points: Row[],
  read: (p: Row) => number | null
): { value: number; timestamp: number } | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]
    const v = read(p)
    if (v != null && Number.isFinite(v)) {
      return { value: v, timestamp: p.timestamp }
    }
  }
  return null
}

/** 데이터 범위 기준 Y축 자동 스케일 (상·하 패딩) */
function autoDomain(values: number[], padRatio = 0.08): { min: number; max: number } {
  const v = values.filter((x) => Number.isFinite(x))
  if (v.length === 0) return { min: 0, max: 1 }
  const mn = Math.min(...v)
  const mx = Math.max(...v)
  const span = mx - mn
  const pad = span > 1e-9 ? span * padRatio : Math.max(Math.abs(mx), 1) * padRatio
  return { min: mn - pad, max: mx + pad }
}

/** 논리 너비(고정). 실제 표시는 width:100% + preserveAspectRatio로 슬롯에 맞춤 */
const VB_W = 520

/** 하단/좌측 라벨 여백 */
const M = { left: 56, right: 56, top: 20, bottom: 42 }

export function CmeBtcFuturesWidget() {
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExplanation, setShowExplanation] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/crypto/cme/volume-open-interest")
      setData((await res.json()) as ApiPayload)
    } catch {
      setData({
        configured: false,
        message: "네트워크 오류로 차트를 불러오지 못했습니다.",
        range: "90d",
        points: [],
        source: "SoSoValue",
        chart: "bitcoin_futures_volume_open_interest",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 1000)
    return () => window.clearTimeout(t)
  }, [load])

  const points = useMemo(() => (data?.points ?? []).filter((p) => p && Number.isFinite(p.timestamp)), [data])

  const lastBtcSnap = useMemo(() => lastFiniteFromSeries(points, (p) => p.btc_price), [points])
  const lastOiSnap = useMemo(() => lastFiniteFromSeries(points, (p) => p.open_interest), [points])
  const lastVolSnap = useMemo(() => lastFiniteFromSeries(points, (p) => p.volume), [points])

  const priceVals = useMemo(() => points.map((p) => p.btc_price), [points])
  const oiVals = useMemo(() => points.map((p) => p.open_interest), [points])
  const volVals = useMemo(() => points.map((p) => p.volume), [points])

  const n = Math.max(1, points.length)
  const w = VB_W
  const h = 248

  const oiDomain = useMemo(() => {
    const valid = oiVals.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    return autoDomain(valid, 0.08)
  }, [oiVals])

  const volMax = useMemo(() => {
    const valid = volVals.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    if (valid.length === 0) return 1
    return Math.max(...valid, 1)
  }, [volVals])

  const priceDomain = useMemo(() => {
    const valid = priceVals.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    return autoDomain(valid, 0.06)
  }, [priceVals])

  const plot = useMemo(() => {
    const plotLeft = M.left
    const plotRight = w - M.right
    const plotTop = M.top
    const plotBottom = h - M.bottom
    const plotW = plotRight - plotLeft
    const plotH = plotBottom - plotTop
    const { min: pMin, max: pMax } = priceDomain
    const pSpan = pMax - pMin || 1
    const { min: lMin, max: lMax } = oiDomain
    const lSpan = lMax - lMin || 1

    const xAt = (i: number) => plotLeft + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
    const yLeft = (v: number) => plotTop + (1 - (v - lMin) / lSpan) * plotH
    const yRight = (p: number) => plotTop + (1 - (p - pMin) / pSpan) * plotH

    const oiPath: string[] = []
    for (let i = 0; i < oiVals.length; i++) {
      const v = oiVals[i]
      if (v == null || !Number.isFinite(v)) continue
      const x = xAt(i)
      const y = yLeft(v)
      oiPath.push(`${oiPath.length ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    }

    const pricePath: string[] = []
    for (let i = 0; i < priceVals.length; i++) {
      const p = priceVals[i]
      if (p == null || !Number.isFinite(p)) continue
      const x = xAt(i)
      const y = yRight(p)
      pricePath.push(`${pricePath.length ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    }

    const bars = volVals.map((v, i) => {
      const vv = v == null || !Number.isFinite(v) ? 0 : v
      const norm = Math.max(0, vv / volMax)
      const bh = norm * (plotH * 0.3) // 볼륨은 차트 하단 30% 영역만 사용
      const step = n <= 1 ? plotW : plotW / (n - 1)
      const barW = Math.max(1, step * 0.65)
      const cx = n <= 1 ? plotLeft + plotW / 2 : xAt(i)
      const x = cx - barW / 2
      const y = plotBottom - bh
      return { x, y, w: barW, h: bh }
    })

    const tickCount = 5
    const ticks = Array.from({ length: tickCount }, (_, k) => k / (tickCount - 1))
    const gridLines = ticks.map((t) => {
      const y = plotTop + t * plotH
      const vLeft = lMax - t * lSpan
      const vRight = pMax - t * pSpan
      return { y, vLeft, vRight }
    })

    let lastOi: { x: number; y: number } | null = null
    let lastPx: { x: number; y: number } | null = null
    for (let i = oiVals.length - 1; i >= 0; i--) {
      const v = oiVals[i]
      if (v != null && Number.isFinite(v)) {
        lastOi = { x: xAt(i), y: yLeft(v) }
        break
      }
    }
    for (let i = priceVals.length - 1; i >= 0; i--) {
      const p = priceVals[i]
      if (p != null && Number.isFinite(p)) {
        lastPx = { x: xAt(i), y: yRight(p) }
        break
      }
    }

    const xMonthTicks = monthlyXAxisTicks(points, plotLeft, plotRight)

    return {
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      plotW,
      plotH,
      oiPath: oiPath.join(" "),
      pricePath: pricePath.join(" "),
      bars,
      gridLines,
      lastOi,
      lastPx,
      xMonthTicks,
    }
  }, [n, w, oiDomain, volMax, priceDomain, oiVals, volVals, priceVals, points])

  return (
    <div className="w-full flex flex-col h-[360px] overflow-hidden bg-slate-950/40 backdrop-blur-xl border border-slate-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(148,163,184,0.10)] transition-colors duration-300 hover:bg-slate-900/50 hover:border-slate-500/60">
      <div className="flex items-center justify-between gap-2 mb-2 pb-3 border-b border-slate-500/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-5 h-5 text-orange-300 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-black text-white tracking-widest leading-none">CME BTC FUTURES</h2>
            <p className="text-[9px] text-slate-300/70 mt-1 truncate">
              Volume &amp; OI (좌) · BTC Price (우) · 최근 90일 · Y축 자동 · k · 가로 슬롯 맞춤
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
      {data?.configured && data.error && (
        <div className="text-[11px] text-amber-200/90 p-2 rounded-lg bg-amber-950/30 border border-amber-500/20">{data.error}</div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain pr-1 flex flex-col gap-2 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-300/60 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            불러오는 중…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 text-[8px] shrink-0">
              <div className="rounded-xl border border-slate-500/20 bg-slate-950/30 p-1">
                <div className="text-slate-400">BTC Price</div>
                <div className="text-white font-extrabold text-[11px] leading-tight">
                  {lastBtcSnap != null ? fmtK(lastBtcSnap.value) : "-"}
                </div>
                <div className="text-[7px] text-slate-400/80">{fmtDate(lastBtcSnap?.timestamp)}</div>
              </div>
              <div className="rounded-xl border border-slate-500/20 bg-slate-950/30 p-1">
                <div className="text-slate-400">Open Interest</div>
                <div className="text-white font-extrabold text-[11px] leading-tight">
                  {lastOiSnap != null ? fmtK(lastOiSnap.value) : "-"}
                </div>
                <div className="text-[7px] text-slate-500/70">{fmtDate(lastOiSnap?.timestamp)}</div>
              </div>
              <div className="rounded-xl border border-slate-500/20 bg-slate-950/30 p-1">
                <div className="text-slate-400">Volume</div>
                <div className="text-white font-extrabold text-[11px] leading-tight">
                  {lastVolSnap != null ? fmtK(lastVolSnap.value) : "-"}
                </div>
                <div className="text-[7px] text-slate-500/70">{fmtDate(lastVolSnap?.timestamp)}</div>
              </div>
            </div>

            <div className="shrink-0 min-h-[260px] rounded-xl border border-slate-500/20 bg-slate-950/20">
              <div className="w-full py-1">
                <svg
                  viewBox={`0 0 ${w} ${h}`}
                  preserveAspectRatio="none"
                  className="block h-[248px] w-full max-w-full"
                >
                  <rect x="0" y="0" width={w} height={h} fill="transparent" />

                  {plot.gridLines.map((gline, idx) => (
                    <g key={idx}>
                      <line
                        x1={plot.plotLeft}
                        x2={plot.plotRight}
                        y1={gline.y}
                        y2={gline.y}
                        stroke="rgba(148,163,184,0.12)"
                        strokeWidth="1"
                      />
                      <text
                        x={8}
                        y={gline.y}
                        dominantBaseline="middle"
                        fill="rgba(148,163,184,0.9)"
                        fontSize="10"
                      >
                        {fmtK(gline.vLeft)}
                      </text>
                      <text
                        x={w - 8}
                        y={gline.y}
                        dominantBaseline="middle"
                        textAnchor="end"
                        fill="rgba(251,146,60,0.95)"
                        fontSize="10"
                      >
                        {fmtK(gline.vRight)}
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

                  <text x={6} y={12} fill="rgba(148,163,184,0.6)" fontSize="9">
                    OI / Vol (k)
                  </text>
                  <text x={w - 6} y={12} textAnchor="end" fill="rgba(251,146,60,0.65)" fontSize="9">
                    BTC (k)
                  </text>

                  {plot.bars.map((b, i) => (
                    <rect
                      key={i}
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill="rgba(148,163,184,0.32)"
                      stroke="rgba(148,163,184,0.12)"
                      strokeWidth="0.5"
                    />
                  ))}

                  {plot.oiPath ? (
                    <path
                      d={plot.oiPath}
                      fill="none"
                      stroke="rgba(56,189,248,0.95)"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                  {plot.lastOi && (
                    <circle
                      cx={plot.lastOi.x}
                      cy={plot.lastOi.y}
                      r="3.5"
                      fill="rgba(56,189,248,0.95)"
                      stroke="rgba(15,23,42,0.9)"
                      strokeWidth="2"
                    />
                  )}

                  {plot.pricePath ? (
                    <path
                      d={plot.pricePath}
                      fill="none"
                      stroke="rgba(251,146,60,0.95)"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                  {plot.lastPx && (
                    <circle
                      cx={plot.lastPx.x}
                      cy={plot.lastPx.y}
                      r="3.5"
                      fill="rgba(251,146,60,0.95)"
                      stroke="rgba(15,23,42,0.9)"
                      strokeWidth="2"
                    />
                  )}

                  {points.length === 0 && (
                    <text
                      x={w / 2}
                      y={h / 2}
                      textAnchor="middle"
                      fill="rgba(148,163,184,0.65)"
                      fontSize="12"
                    >
                      데이터 없음 (90d)
                    </text>
                  )}
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400/80 px-1 shrink-0">
              <div className="flex items-center gap-3">
                <span>회색: Volume · 파랑: Open Interest · 주황: BTC Price</span>
                <button 
                  onClick={() => setShowExplanation(!showExplanation)} 
                  className="text-slate-300 hover:text-white font-bold bg-slate-800/50 hover:bg-slate-700/60 px-2 py-0.5 rounded transition-colors"
                >
                  {showExplanation ? "설명 닫기 ▲" : "지표 해석법 ▼"}
                </button>
              </div>
              <span>{points.length} pts · 90d</span>
            </div>

            {showExplanation && (
              <div className="mt-1 p-3 bg-slate-900/80 rounded-xl border border-slate-500/30 text-[10px] text-slate-300 shrink-0">
                <div className="font-bold text-white mb-2 text-[11px]">💡 가격 + OI + 거래량 핵심 해석 공식</div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-500/50 text-slate-400">
                      <th className="py-1.5 w-10">가격</th>
                      <th className="py-1.5 w-10">OI</th>
                      <th className="py-1.5 w-10">거래량</th>
                      <th className="py-1.5 w-[110px]">해석</th>
                      <th className="py-1.5">의미</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-500/20">
                    <tr>
                      <td className="py-1.5 text-emerald-400 font-bold">상승</td>
                      <td className="py-1.5 text-emerald-400 font-bold">상승</td>
                      <td className="py-1.5 text-emerald-400 font-bold">증가</td>
                      <td className="py-1.5 text-emerald-300 font-bold">강한 강세</td>
                      <td className="py-1.5 text-slate-400">신규 매수(Long) 세력 진입. 신뢰도 높은 상승장.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-emerald-400 font-bold">상승</td>
                      <td className="py-1.5 text-rose-400 font-bold">하락</td>
                      <td className="py-1.5 text-emerald-400 font-bold">증가</td>
                      <td className="py-1.5 text-amber-300 font-bold">숏 커버링</td>
                      <td className="py-1.5 text-slate-400">기존 숏 포지션의 강제 손절로 인한 상승. 상승 지속력 낮음.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-rose-400 font-bold">하락</td>
                      <td className="py-1.5 text-emerald-400 font-bold">상승</td>
                      <td className="py-1.5 text-emerald-400 font-bold">증가</td>
                      <td className="py-1.5 text-rose-400 font-bold">강한 약세</td>
                      <td className="py-1.5 text-slate-400">신규 공매도(Short) 세력 진입. 신뢰도 높은 하락장.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-rose-400 font-bold">하락</td>
                      <td className="py-1.5 text-rose-400 font-bold">하락</td>
                      <td className="py-1.5 text-emerald-400 font-bold">증가</td>
                      <td className="py-1.5 text-amber-300 font-bold">롱 청산</td>
                      <td className="py-1.5 text-slate-400">기존 롱 포지션의 강제 손절로 인한 하락. 바닥 근접 (반등 임박).</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-2 text-[9px] text-slate-400/80 leading-tight">
                  * 거래량이 감소할 때는 세력 개입이 없는 관망장/노이즈이므로 추세가 곧 꺾이거나 큰 의미가 없을 확률이 높습니다.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
