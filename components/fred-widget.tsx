"use client"

import { useState, useEffect } from "react"
import { LineChart, RefreshCw, AlertCircle } from "lucide-react"
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip } from "recharts"

interface FredItem {
  id: string
  title: string
  format: "percent" | "index"
  latest: {
    date: string
    value: number
  }
  previous: {
    date: string
    value: number
  }
  history: {
    date: string
    value: number
  }[]
}

const INDICATOR_GUIDE: Record<
  string,
  {
    desc: string
    high: string
    low: string
  }
> = {
  DGS10: {
    desc: "미국 정부가 발행한 10년 만기 채권의 수익률로, 글로벌 장기 시장 금리의 기준점(벤치마크) 역할을 합니다.",
    high: "경기 확장 및 기대 인플레이션 상승을 나타냅니다. 단, 기업과 가계의 대출 이자 부담이 가중되어 주식 등 위험 자산에는 악재로 작용할 수 있습니다.",
    low: "경기 둔화 우려 또는 금융 시장 불안에 따른 안전 자산(국채) 선호 심리가 강해짐을 뜻합니다."
  },
  DGS2: {
    desc: "2년 만기 미국 국채 수익률로, 연방준비제도(Fed)의 단기 기준금리 방향성을 가장 빠르게 반영합니다.",
    high: "연준의 금리 인상 가능성 및 통화 긴축 기조가 강화되고 있음을 시사합니다.",
    low: "연준의 금리 인하 전망 또는 통화 완화 정책에 대한 기대감을 시사합니다."
  },
  T10Y2Y: {
    desc: "10년물 장기 금리에서 2년물 단기 금리를 뺀 값으로, 채권 시장이 평가하는 경기 전망을 보여줍니다.",
    high: "정상적인 우상향 금리 곡선으로 경기 회복 및 성장에 대한 긍정적인 신호입니다.",
    low: "금리차가 0 이하로 떨어지는 '역전 현상'은 역사적으로 약 1~2년 뒤 경기 침체(Recession)를 경고하는 가장 신뢰도 높은 선행 지표입니다."
  },
  CPIAUCSL: {
    desc: "소비자가 구매하는 상품 및 서비스의 가격 변동을 측정한 대표적인 인플레이션 지표입니다.",
    high: "고인플레이션을 의미하며, 소비 여력 감소 및 연준의 추가 금리 인상 압박(긴축)을 유발합니다.",
    low: "물가가 안정되거나 내수 침체로 인한 디플레이션(경기 침체) 우려를 시사합니다."
  },
  PPIFIS: {
    desc: "국내 생산자가 제조 및 서비스를 제공할 때 지불하는 가격 변동으로, 소비자물가(CPI)의 선행 지표 역할을 합니다.",
    high: "제조업 및 원자재 비용 상승을 뜻하며, 결국 소비자물가(CPI)로 전가되어 인플레이션이 가속화될 수 있습니다.",
    low: "생산 비용이 안정되거나 감소하고 있어 향후 인플레이션 압력이 낮아짐을 뜻합니다."
  },
  UNRATE: {
    desc: "일하고 싶지만 일자리가 없는 실업자의 비율을 보여주는 미국 고용 시장의 핵심 지표입니다.",
    high: "고용 시장 악화 및 경기 둔화/침체를 나타내며, 대중의 소비력 약화를 뜻합니다.",
    low: "일자리가 풍부하고 경제가 활성화되어 있음을 뜻하지만, 지나치게 낮으면 임금발 인플레이션을 촉발할 수 있습니다."
  },
  A191RL1Q225SBEA: {
    desc: "물가 요인을 제외한 미국 경제 전체의 생산 규모(GDP)의 성장 속도를 측정한 분기별 지표입니다.",
    high: "기업의 투자와 민간 소비가 증가하는 경제 성장 및 활발한 경기 확장을 뜻합니다.",
    low: "경제 성장이 둔화되거나 위축됨을 뜻하며, 2분기 연속 마이너스 시 기술적 경기 침체로 진입합니다."
  }
}

function formatDate(dateStr: string) {
  // 2024-04-26 -> 24.04.26
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
}

function formatChartDate(dateStr: string) {
  // 2024-04-01 -> 24.04
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length >= 2) {
    return `${parts[0].slice(2)}.${parts[1]}`;
  }
  return dateStr;
}

export function FredWidget() {
  const [data, setData] = useState<FredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchFred = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/fred")
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "FRED 데이터를 불러오지 못했습니다."
        )
      }
      if (json.error) throw new Error(String(json.error))
      setData(json.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchFred()
  }, [])

  return (
    <div className="w-full flex flex-col h-auto bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50">
      {/* IDE Window Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
          <LineChart className="w-3.5 h-3.5" /> 거시 경제 지표 해설 대시보드
        </span>
        <button onClick={fetchFred} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 p-4 relative">
        {!mounted || (loading && data.length === 0) ? (
          <div className="absolute inset-0 flex items-center justify-center min-h-[300px]">
             <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <AlertCircle className="w-6 h-6 text-primary mb-2" />
            <span className="text-[11px] text-primary">{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-[11px] font-mono">데이터가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-5">
            {data.map((item) => {
              const diff = item.latest.value - item.previous.value;
              const isUp = diff > 0;
              const isDown = diff < 0;
              
              let changeText = "";
              if (item.format === "percent") {
                changeText = `${isUp ? "+" : ""}${diff.toFixed(2)}%p`;
              } else {
                const pct = (diff / item.previous.value) * 100;
                changeText = `${isUp ? "+" : ""}${pct.toFixed(2)}%`;
              }

              const colorClass = isUp 
                ? "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900/50" 
                : isDown 
                  ? "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/50" 
                  : "text-foreground bg-secondary/55 border-border/10";

              const lineStrokeColor = isUp ? "#ef4444" : isDown ? "#3b82f6" : "#6b7280";
              const isGDP = item.id === "A191RL1Q225SBEA";
              const periodText = isGDP ? "최근 4분기" : "최근 12개월";
              const guide = INDICATOR_GUIDE[item.id] || { desc: "지표 정보가 존재하지 않습니다.", high: "", low: "" };

              return (
                <div key={item.id} className="flex flex-col md:flex-row gap-5 p-4.5 bg-secondary/15 hover:bg-secondary/35 rounded-sm border border-border/40 transition-all duration-200 shadow-sm hover:shadow-md">
                  
                  {/* Left Column: Descriptions & Interpretations (w-full md:w-[48%]) */}
                  <div className="w-full md:w-[48%] flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      {/* Title & Real-time Value Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-[14px] font-sans break-keep leading-tight">{item.title}</span>
                          <span className="text-[9px] text-muted-foreground mt-1">
                            최신 집계일: {formatDate(item.latest.date)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end shrink-0 select-none">
                          <span className="text-[15px] font-black text-foreground font-mono leading-none">
                            {item.latest.value}{item.format === "percent" ? "%" : ""}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border font-mono mt-1.5 leading-none ${colorClass}`}>
                            {isUp ? "▲" : isDown ? "▼" : "-"} {changeText}
                          </span>
                        </div>
                      </div>

                      {/* FRED API / FED Description */}
                      <p className="text-[10px] text-muted-foreground leading-relaxed border-l-2 border-primary/50 pl-2.5 font-sans my-1 bg-secondary/10 py-1 pr-1.5">
                        {guide.desc}
                      </p>
                    </div>

                    {/* How to Interpret High vs Low */}
                    <div className="flex flex-col gap-2 bg-background/50 border border-border/20 p-2.5 rounded-sm select-none">
                      <div className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-foreground/90">
                        <span className="shrink-0 text-[10px]">🔴</span>
                        <div>
                          <strong className="text-red-600 dark:text-red-400">수치가 높은 경우:</strong>{" "}
                          <span className="font-sans text-muted-foreground">{guide.high}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-foreground/90 border-t border-border/5 pt-1.5">
                        <span className="shrink-0 text-[10px]">🔵</span>
                        <div>
                          <strong className="text-blue-600 dark:text-blue-400">수치가 낮은 경우:</strong>{" "}
                          <span className="font-sans text-muted-foreground">{guide.low}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sparkline Line Chart & Comparative Metrics (w-full md:w-[52%]) */}
                  <div className="w-full md:w-[52%] flex flex-col justify-between gap-3 border-t md:border-t-0 md:border-l border-border/20 pt-4 md:pt-0 md:pl-5">
                    
                    {/* Sparkline Line Chart */}
                    <div className="w-full h-[120px] select-none relative bg-neutral-900/5 dark:bg-black/20 border border-border/10 p-2 rounded-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                          data={item.history}
                          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatChartDate}
                            tick={{ fontSize: 8, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={["auto", "auto"]}
                            tick={{ fontSize: 8, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${val}${item.format === "percent" ? "%" : ""}`}
                          />
                          <ChartTooltip
                            contentStyle={{
                              fontSize: "9px",
                              background: "rgba(255, 255, 255, 0.98)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              color: "#111",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                            }}
                            labelFormatter={(label) => `날짜: ${formatDate(label)}`}
                            formatter={(value: any) => [`${value}${item.format === "percent" ? "%" : ""}`, "수치"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={lineStrokeColor}
                            strokeWidth={1.5}
                            dot={{ r: 1.5, strokeWidth: 1 }}
                            activeDot={{ r: 3 }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Compare with history */}
                    <div className="grid grid-cols-2 gap-2 select-none font-mono text-[9px] leading-normal">
                      <div className="flex flex-col p-1.5 bg-secondary/30 rounded-sm">
                        <span className="text-muted-foreground mb-0.5">이전 집계치 ({formatDate(item.previous.date)})</span>
                        <span className="font-semibold text-foreground/80">
                          {item.previous.value}{item.format === "percent" ? "%" : ""}
                        </span>
                      </div>
                      <div className="flex flex-col p-1.5 bg-secondary/40 rounded-sm border border-border/10">
                        <span className="text-muted-foreground mb-0.5">{periodText} 전 시작점 ({formatDate(item.history[0]?.date)})</span>
                        <span className="font-bold text-foreground">
                          {item.history[0]?.value}{item.format === "percent" ? "%" : ""}
                        </span>
                      </div>
                    </div>

                  </div>
                  
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}



