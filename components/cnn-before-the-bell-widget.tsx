"use client"

import { useState, useEffect } from "react"
import { Newspaper, RefreshCw, AlertCircle } from "lucide-react"

interface BriefItem {
  title: string
  link: string
  description: string
  pubDate: string
}

export function CnnBeforeTheBellWidget() {
  const [items, setItems] = useState<BriefItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBriefings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/news/before-the-bell")
      if (!res.ok) throw new Error("개장 전 브리핑을 불러오는데 실패했습니다.")
      const json = await res.json()
      setItems(json.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefings()
  }, [])

  return (
    <div className="w-full flex flex-col h-[520px] bg-card border border-border rounded-none overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 relative">
      {/* Widget Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
          <Newspaper className="w-3.5 h-3.5 text-primary" /> CNN Before the Bell
        </span>
        <div className="flex items-center gap-2">
          <span className="stamp-red text-[9px] font-bold rounded-sm border-primary/30 text-primary bg-primary/5 px-1.5 py-0.5 select-none">
            Morning Briefing
          </span>
          <button 
            onClick={fetchBriefings} 
            disabled={loading}
            className="p-1 hover:bg-secondary rounded-sm transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Widget Body */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          <div className="w-5 h-5 border-2 border-primary/45 border-t-primary rounded-full animate-spin mb-3"></div>
          <span className="text-muted-foreground text-[10px] font-mono">아침 브리핑 수신 중...</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
          <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
          <span className="text-[11px] text-muted-foreground font-medium mb-3">{error}</span>
          <button 
            onClick={fetchBriefings} 
            className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-5 text-muted-foreground text-[11px] font-mono">
          현재 표시할 브리핑이 없습니다.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar custom-scrollbar-beforethebell">
          <div className="flex flex-col">
            {items.map((news, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 py-3.5 border-b border-border/10 last:border-0 hover:bg-secondary/20 px-3 -mx-3 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-[10px] text-primary font-extrabold font-mono shrink-0 pt-0.5 select-none bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={news.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-bold text-foreground leading-snug hover:text-primary hover:underline transition-colors font-sans block"
                    >
                      {news.title}
                    </a>
                    {news.description && (
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed font-sans mt-2 select-text whitespace-normal break-words">
                        {news.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] font-mono text-muted-foreground/50">{news.pubDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-beforethebell::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-beforethebell::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-beforethebell::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.2);
          border-radius: 0px;
        }
        .custom-scrollbar-beforethebell:hover::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.45);
          border-radius: 0px;
        }
      `}} />
    </div>
  )
}
