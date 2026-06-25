"use client"

import { useState, useEffect } from "react"
import { Newspaper, RefreshCw, AlertCircle } from "lucide-react"

interface NewsItem {
  title: string
  link: string
}

export function CnnTechNewsWidget() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/news/cnn-tech")
      if (!res.ok) throw new Error("뉴스를 불러오는데 실패했습니다.")
      const json = await res.json()
      setItems(json.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  return (
    <div className="w-full flex flex-col h-[360px] bg-card border border-border rounded-none overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 relative">
      {/* Widget Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
          <Newspaper className="w-3.5 h-3.5 text-muted-foreground" /> CNN Tech News
        </span>
        <button 
          onClick={fetchNews} 
          disabled={loading}
          className="p-1 hover:bg-secondary rounded-sm transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Widget Body */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          <div className="w-5 h-5 border-2 border-primary/45 border-t-primary rounded-full animate-spin mb-3"></div>
          <span className="text-muted-foreground text-[10px] font-mono">뉴스 수신 중...</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
          <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
          <span className="text-[11px] text-muted-foreground font-medium mb-3">{error}</span>
          <button 
            onClick={fetchNews} 
            className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-5 text-muted-foreground text-[11px] font-mono">
          표시할 뉴스가 없습니다.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar custom-scrollbar-tech">
          <div className="flex flex-col">
            {items.map((news, i) => (
              <a
                key={i}
                href={news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 py-2.5 border-b border-border/5 last:border-0 hover:bg-secondary/35 px-2 -mx-2 transition-colors group cursor-pointer"
              >
                <span className="text-[10px] text-muted-foreground font-bold font-mono shrink-0 pt-0.5 select-none">
                  {String(i + 1).padStart(2, '0')}.
                </span>
                <h4 className="text-[12px] font-bold text-foreground leading-snug group-hover:text-primary group-hover:underline transition-colors font-sans">
                  {news.title}
                </h4>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Internal Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-tech::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-tech::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-tech::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.2);
          border-radius: 0px;
        }
        .custom-scrollbar-tech:hover::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.45);
        }
      `}} />
    </div>
  )
}
