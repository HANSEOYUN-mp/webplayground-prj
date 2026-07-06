"use client"

import { useState, useEffect } from "react"
import { TrendingUp, RefreshCw, AlertCircle, HelpCircle } from "lucide-react"
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface EtfData {
  ytdYield: number
  oneMonthYield: number
  latestPrice: number
}

interface ApiResponse {
  latestDate: string
  baseDateYtd: string
  baseDateOneMonth: string
  dia: EtfData
  voo: EtfData
  qqq: EtfData
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
}

interface ChartDataPoint {
  name: string
  value: number
}

// 막대 위에 값을 그리는 커스텀 라벨 컴포넌트
function CustomLabel(props: any) {
  const { x, y, width, value } = props;
  const isPositive = value >= 0;
  return (
    <text
      x={x + width / 2}
      y={isPositive ? y - 6 : y + 14}
      fill="var(--foreground)"
      textAnchor="middle"
      fontSize="10.5px"
      fontWeight="900"
      className="font-mono"
    >
      {isPositive ? "+" : ""}{value.toFixed(1)}%
    </text>
  );
}

// 막대차트 서브 컴포넌트 (Y축 0 지점에 실선 렌더링)
function EtfBarChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <div className="w-full h-40 select-none relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 22, right: 15, left: 15, bottom: 5 }}
        >
          {/* X축 라벨은 표시하되 축선은 숨김 */}
          <XAxis 
            dataKey="name" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fill: 'var(--foreground)', fontWeight: 'bold', fontFamily: 'monospace' }}
          />
          {/* Y축은 숨김처리하되, 최저 수치(0 이하 포함)와 최고 수치 위에 패딩을 부여하여 찌그러짐 방지 */}
          <YAxis 
            hide 
            domain={[
              (dataMin: number) => (isNaN(dataMin) ? -2 : Math.min(0, dataMin) - 2),
              (dataMax: number) => (isNaN(dataMax) ? 10 : Math.max(0, dataMax) + 3)
            ]} 
          />
          
          {/* Y축 0 지점에 기준선(가상 Y축의 0에 위치하는 X축 실선) 추가 */}
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
          
          <Tooltip
            contentStyle={{
              fontSize: "10px",
              background: "rgba(255, 255, 255, 0.98)",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              padding: "4px 8px",
              color: "#111"
            }}
            formatter={(value: any) => [`${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}%`, '수익률']}
          />
          <Bar dataKey="value" barSize={38} radius={[4, 4, 0, 0]} label={<CustomLabel />}>
            {data.map((entry, index) => {
              // 플러스는 빨간색(#ef4444), 마이너스는 파란색(#3b82f6)
              const barColor = entry.value >= 0 ? "#ef4444" : "#3b82f6";
              return <Cell key={`cell-${index}`} fill={barColor} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EtfPerformanceWidget() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stocks/compare-etf")
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "ETF 비교 데이터를 불러오지 못했습니다."
        )
      }
      if (json.error) throw new Error(String(json.error))
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const etfMeta = [
    {
      ticker: "DIA",
      name: "다우존스 30 ETF",
      type: "우량 블루칩 & 가치주",
      desc: "미국 산업을 대표하는 30개 초우량 기업의 주가를 가격가중방식으로 추종합니다."
    },
    {
      ticker: "VOO",
      name: "S&P 500 ETF",
      type: "대형주 & 시장 전체",
      desc: "미국 500대 대형 기업의 시가총액 가중 지수로, 전체 시장의 척도로 쓰입니다."
    },
    {
      ticker: "QQQ",
      name: "나스닥 100 ETF",
      type: "기술주 & 성장주",
      desc: "나스닥에 상장된 비금융 대형 기업 100개로 구성되어 기술 및 혁신 성장을 대표합니다."
    }
  ]

  // 데이터 구성
  const ytdChartData = data ? [
    { name: "DIA", value: data.dia.ytdYield },
    { name: "VOO", value: data.voo.ytdYield },
    { name: "QQQ", value: data.qqq.ytdYield }
  ] : []

  const oneMonthChartData = data ? [
    { name: "DIA", value: data.dia.oneMonthYield },
    { name: "VOO", value: data.voo.oneMonthYield },
    { name: "QQQ", value: data.qqq.oneMonthYield }
  ] : []

  return (
    <div className="w-full flex flex-col h-auto bg-card border border-border overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1.5 select-none">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> 미국 3대 대표 ETF 성과 및 시장 흐름
        </span>
        <button onClick={fetchData} disabled={loading} className="p-1 hover:bg-secondary rounded transition-colors" title="새로고침">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/80 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 p-5 relative">
        {!mounted || (loading && !data) ? (
          <div className="flex flex-col items-center justify-center min-h-[350px]">
             <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin mb-3"></div>
             <span className="text-muted-foreground text-[10px] font-mono">ETF 역사적 단기/장기 수익률 연산 중...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[350px] text-center">
            <AlertCircle className="w-6 h-6 text-primary mb-2" />
            <span className="text-[11px] text-primary">{error}</span>
            <button onClick={fetchData} className="mt-3 text-[10px] font-bold bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5">다시 시도</button>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center min-h-[350px] text-muted-foreground text-[11px] font-mono">데이터가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* 상단: 지수별 성과 차트 (YTD vs 1달) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-border/10 pb-6">
              
              {/* 왼쪽: YTD 차트 */}
              <div className="flex flex-col items-center gap-4 bg-secondary/5 border border-border/30 p-5 rounded-sm">
                <div className="flex flex-col items-center text-center">
                  <h4 className="text-[12px] font-bold text-foreground">올해 누적 수익률 (YTD)</h4>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    기준일: {formatDate(data.baseDateYtd)} ~ {formatDate(data.latestDate)}
                  </span>
                </div>
                <div className="w-full max-w-[320px] pt-2">
                  <EtfBarChart data={ytdChartData} />
                </div>
              </div>

              {/* 오른쪽: 최근 1달 차트 */}
              <div className="flex flex-col items-center gap-4 bg-secondary/5 border border-border/30 p-5 rounded-sm">
                <div className="flex flex-col items-center text-center">
                  <h4 className="text-[12px] font-bold text-foreground">최근 1달 수익률 (1-Month)</h4>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    기준일: {formatDate(data.baseDateOneMonth)} ~ {formatDate(data.latestDate)}
                  </span>
                </div>
                <div className="w-full max-w-[320px] pt-2">
                  <EtfBarChart data={oneMonthChartData} />
                </div>
              </div>

            </div>

            {/* 하단: ETF별 간단 설명 및 대표 포함 기업 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {etfMeta.map((etf) => {
                const isDia = etf.ticker === "DIA"
                const isVoo = etf.ticker === "VOO"
                const yieldVal = isDia 
                  ? data.dia.ytdYield 
                  : isVoo 
                    ? data.voo.ytdYield 
                    : data.qqq.ytdYield

                return (
                  <div key={etf.ticker} className="flex flex-col gap-3 p-4 bg-secondary/15 rounded-sm border border-border/20 hover:bg-secondary/25 transition-all">
                    
                    {/* ETF 헤더 및 수익률 */}
                    <div className="flex justify-between items-start border-b border-border/10 pb-2.5">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-foreground font-mono">{etf.ticker}</span>
                        <span className="text-[9.5px] font-bold text-primary mt-0.5">{etf.type}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-black text-foreground font-mono">
                          {yieldVal >= 0 ? "+" : ""}{yieldVal.toFixed(2)}%
                        </span>
                        <span className="text-[8px] text-muted-foreground uppercase font-semibold">올해 YTD</span>
                      </div>
                    </div>

                    {/* 설명 */}
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {etf.desc}
                    </p>



                  </div>
                )
              })}
            </div>

            {/* 가이드 라인 */}
            <div className="flex flex-col gap-1 p-3 bg-secondary/10 rounded-sm border border-border/10 text-[9px] leading-relaxed text-muted-foreground">
              <div className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                <strong>미국 3대 ETF 비교 인사이트 분석 가이드</strong>
              </div>
              <p className="pl-4.5 mt-0.5">
                • 기술 및 혁신 성장을 대변하는 **QQQ**, 전반적인 시장 규모를 반영하는 **VOO**, 성숙한 우량주 중심의 **DIA** 수익률을 한 눈에 대조할 수 있습니다.
              </p>
              <p className="pl-4.5">
                • 1월 1일 이후 장기적인 추세(YTD)와 최근 1달간의 단기 추세(1-Month) 간의 성과 변화율을 비교함으로써 시장 주도 업종의 **순환매 및 성장 탄력성**을 포착할 수 있습니다.
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
