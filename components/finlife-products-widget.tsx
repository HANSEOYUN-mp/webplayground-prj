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
    <div className="w-full flex flex-col h-[360px] bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50">
      {/* IDE Window Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5" /> 최고 금리 상품
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1 hover:bg-secondary rounded transition-colors shrink-0"
          title="새로고침"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1 p-3 pb-1 shrink-0 select-none font-sans">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-2 py-0.5 border text-[9px] font-bold transition-all ${
              tab === t.id
                ? "bg-primary text-white border-primary"
                : "bg-white text-muted-foreground border-border/20 hover:border-border/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 pt-1 min-h-0 finlife-scroll">
        {data && !data.configured && (
          <div className="text-[11px] text-muted-foreground leading-relaxed p-1 font-mono">
            {data.message ?? "API 키를 설정해 주세요."}
          </div>
        )}
        {data?.configured && err && rows.length === 0 && (
          <div className="text-[11px] text-primary p-2 border border-primary/20 bg-primary/5">{err}</div>
        )}
        {data?.configured && !err && rows.length === 0 && !loading && (
          <div className="text-[11px] text-muted-foreground text-center py-6 font-mono">표시할 상품이 없습니다.</div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin" />
            불러오는 중…
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {rows.map((row, i) => (
              <div
                key={`${row.bank}-${row.product}-${i}`}
                className="flex flex-col gap-0.5 bg-secondary/20 hover:bg-secondary/60 px-2.5 py-2 border border-border/10 shrink-0 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-foreground text-[11px] leading-tight line-clamp-2 font-sans" title={row.product}>
                    <span className="text-primary text-[10px] font-bold mr-1.5 border border-primary/20 bg-primary/5 px-1 font-mono">{row.bank}</span>
                    {row.product}
                  </span>
                  {row.rate && (
                    <span className="text-[11px] font-extrabold text-foreground whitespace-nowrap shrink-0 font-mono">{row.rate}</span>
                  )}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground font-sans select-none">
                  <span>{row.term ?? "—"}</span>
                  <span className="opacity-55">공시 기준</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 pb-2 select-none">
        <p className="text-[8px] text-muted-foreground/60 shrink-0 leading-tight font-mono">
          출처:{" "}
          <a
            href="https://finlife.fss.or.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            금융감독원 금융상품통합비교공시
          </a>
        </p>
      </div>

      <style jsx>{`
        .finlife-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .finlife-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 0px;
        }
        .finlife-scroll::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.25);
          border-radius: 0px;
        }
      `}</style>
    </div>
  )
}
