"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, RefreshCw } from "lucide-react"

type FlowRow = {
  date: string
  blackrock: number | null
  fidelity: number | null
  total: number | null
}

type ApiPayload =
  | {
      configured: true
      days: number
      btc: FlowRow[]
      eth: FlowRow[]
      source?: string
      error?: string
    }
  | {
      configured: false
      message: string
      days: number
      btc: FlowRow[]
      eth: FlowRow[]
    }

type TabId = "btc" | "eth"

function formatSigned(v: number | null) {
  if (v == null) return "-"
  if (v > 0) return `+${v.toFixed(1)}`
  if (v < 0) return v.toFixed(1)
  return "0.0"
}

function valueClass(v: number | null) {
  if (v == null) return "text-slate-500"
  if (v < 0) return "text-rose-400"
  if (v > 0) return "text-emerald-400"
  return "text-slate-300"
}

export function FarsideEtfFlowsWidget() {
  const [tab, setTab] = useState<TabId>("btc")
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/etf/flows?days=10")
      const json = (await res.json()) as ApiPayload
      setData(json)
    } catch {
      setData({
        configured: false,
        message: "네트워크 오류로 ETF 유입 데이터를 불러오지 못했습니다.",
        days: 10,
        btc: [],
        eth: [],
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => {
    if (!data) return []
    return tab === "btc" ? data.btc : data.eth
  }, [data, tab])

  const header = tab === "btc"
    ? { title: "BTC ETF FLOWS", subtitle: "BlackRock(IBIT) · Fidelity(FBTC) · Total ($M)" }
    : { title: "ETH ETF FLOWS", subtitle: "BlackRock(ETHA) · Fidelity(FETH) · Total ($M)" }

  return (
    <div className="w-full flex flex-col h-[360px] bg-blue-950/40 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-colors duration-300 hover:bg-blue-900/50 hover:border-blue-500/60">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-blue-500/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-black text-white tracking-widest leading-none">{header.title}</h2>
            <p className="text-[9px] text-blue-300/80 mt-1 truncate">{header.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-950/50 text-blue-300 hover:bg-blue-900/60 hover:text-blue-100 disabled:opacity-50 transition-colors shrink-0"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-2 shrink-0">
        {([
          { id: "btc", label: "Bitcoin" },
          { id: "eth", label: "Ethereum" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
              tab === t.id ? "bg-blue-500 text-white shadow" : "text-blue-300/80 hover:text-blue-100 bg-blue-950/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-0 etf-scroll relative">
        {data && !data.configured && (
          <div className="text-[11px] text-blue-200/70 leading-relaxed p-1">{data.message}</div>
        )}
        {data?.configured && "error" in data && data.error && rows.length === 0 && !loading && (
          <div className="text-[11px] text-amber-200/90 p-2 rounded-lg bg-amber-950/30 border border-amber-500/20">
            {data.error}
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-10 text-blue-300/60 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            불러오는 중…
          </div>
        )}

        {!loading && rows.length > 0 && (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-blue-500/30">
              <tr>
                <th className="py-2 font-semibold text-blue-200">Date</th>
                <th className="py-2 font-semibold text-blue-200 text-right">BlackRock</th>
                <th className="py-2 font-semibold text-blue-200 text-right">Fidelity</th>
                <th className="py-2 font-semibold text-blue-200 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-b border-blue-500/10 hover:bg-blue-900/20 transition-colors">
                  <td className="py-2.5 font-medium text-slate-300">{row.date.slice(5).replace("-", ".")}</td>
                  <td className={`py-2.5 text-right font-bold ${valueClass(row.blackrock)}`}>{formatSigned(row.blackrock)}</td>
                  <td className={`py-2.5 text-right font-bold ${valueClass(row.fidelity)}`}>{formatSigned(row.fidelity)}</td>
                  <td className={`py-2.5 text-right font-extrabold ${valueClass(row.total)}`}>{formatSigned(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[8px] text-blue-500/60 mt-2 shrink-0 leading-tight">
        출처:{" "}
        <a
          href={tab === "btc" ? "https://farside.co.uk/btc/" : "https://farside.co.uk/eth/"}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-400"
        >
          Farside (UI 참고)
        </a>
        {data?.configured && "source" in data && data.source ? ` · Data API: ${data.source}` : ""}
      </p>

      <style jsx>{`
        .etf-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .etf-scroll::-webkit-scrollbar-track {
          background: rgba(59, 130, 246, 0.06);
          border-radius: 4px;
        }
        .etf-scroll::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.35);
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

