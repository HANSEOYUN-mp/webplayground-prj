"use client"

import { useCallback, useEffect, useState } from "react"
import { Landmark, RefreshCw } from "lucide-react"
import type { FinlifeCategoryKey, FinlifeProductRow } from "@/lib/finlife"

type TabId = FinlifeCategoryKey

const TABS: { id: TabId; label: string }[] = [
  { id: "deposit", label: "정기예금" },
  { id: "saving", label: "적금" },
  { id: "mortgage", label: "주택담보" },
  { id: "rentHouse", label: "전세" },
  { id: "credit", label: "신용대출" },
]

interface ApiPayload {
  configured: boolean
  message?: string
  dclsMonth?: string
  items: Record<TabId, FinlifeProductRow[]>
  errors?: Partial<Record<TabId, string>>
}

export function FinlifeProductsWidget() {
  const [tab, setTab] = useState<TabId>("deposit")
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/finance/finlife-products")
      const json = (await res.json()) as ApiPayload
      setData(json)
    } catch {
      setData({
        configured: false,
        message: "네트워크 오류로 데이터를 불러오지 못했습니다.",
        items: {
          deposit: [],
          saving: [],
          mortgage: [],
          rentHouse: [],
          credit: [],
        },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rows = data?.items?.[tab] ?? []
  const err = data?.errors?.[tab]
  const monthLabel = data?.dclsMonth
    ? `${data.dclsMonth.slice(0, 4)}.${data.dclsMonth.slice(4, 6)}`
    : null

  return (
    <div className="w-full flex flex-col h-[360px] bg-sky-950/40 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(14,165,233,0.12)] transition-colors duration-300 hover:bg-sky-900/45 hover:border-sky-500/55">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-sky-500/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="w-5 h-5 text-sky-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-black text-white tracking-widest leading-none">은행 금리 공시</h2>
            <p className="text-[9px] text-sky-300/80 mt-1 truncate">
              금감원 금융상품 한눈에 · 은행(020000)
              {monthLabel ? ` · 공시 ${monthLabel}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg border border-sky-500/30 bg-sky-950/50 text-sky-300 hover:bg-sky-900/60 hover:text-sky-100 disabled:opacity-50 transition-colors shrink-0"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-2 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
              tab === t.id ? "bg-sky-500 text-white shadow" : "text-sky-300/80 hover:text-sky-100 bg-sky-950/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0 finlife-scroll">
        {data && !data.configured && (
          <div className="text-[11px] text-sky-200/70 leading-relaxed p-1">
            {data.message ?? "API 키를 설정해 주세요."}
          </div>
        )}
        {data?.configured && err && rows.length === 0 && (
          <div className="text-[11px] text-amber-200/90 p-2 rounded-lg bg-amber-950/30 border border-amber-500/20">{err}</div>
        )}
        {data?.configured && !err && rows.length === 0 && !loading && (
          <div className="text-[11px] text-sky-200/50 text-center py-6">표시할 상품이 없습니다.</div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-10 text-sky-300/60 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            불러오는 중…
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {rows.map((row, i) => (
              <div
                key={`${row.bank}-${row.product}-${i}`}
                className="flex flex-col gap-0.5 bg-sky-900/15 hover:bg-sky-900/25 px-2.5 py-2 rounded-lg border border-sky-800/30 shrink-0"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-sky-50 text-[11px] leading-tight line-clamp-2" title={row.product}>
                    <span className="text-sky-400/90 text-[10px] mr-1">{row.bank}</span>
                    {row.product}
                  </span>
                  {row.rate && (
                    <span className="text-[11px] font-extrabold text-sky-200 whitespace-nowrap shrink-0">{row.rate}</span>
                  )}
                </div>
                <div className="flex justify-between text-[9px] text-sky-300/55">
                  <span>{row.term ?? "—"}</span>
                  <span className="text-sky-500/50">공시 기준</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[8px] text-sky-500/60 mt-2 shrink-0 leading-tight">
        출처:{" "}
        <a
          href="https://finlife.fss.or.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-sky-400"
        >
          금융감독원 금융상품통합비교공시
        </a>
      </p>

      <style jsx>{`
        .finlife-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .finlife-scroll::-webkit-scrollbar-track {
          background: rgba(14, 165, 233, 0.06);
          border-radius: 4px;
        }
        .finlife-scroll::-webkit-scrollbar-thumb {
          background: rgba(14, 165, 233, 0.35);
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
