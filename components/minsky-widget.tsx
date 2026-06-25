"use client"

import { useState, useEffect } from "react"
import { Activity, Flame, BarChart3, ChevronRight } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"

interface Indicator {
  name: string;
  summary: string;
  rating: string;
  key: string;
  score?: number;
  data?: any[];
  data125?: any[];
  data50?: any[];
}

interface FgData {
  score: number;
  rating: string;
  history: {
    previousClose: { score: number };
    oneWeekAgo: { score: number };
    oneMonthAgo: { score: number };
    oneYearAgo: { score: number };
  };
  indicators: Indicator[];
}

const INDICATOR_EXPLANATIONS: Record<string, { desc: string; insight: string }> = {
  market_momentum: {
    desc: "S&P 500 지수가 125일 이동평균선 위에 있는지 분석하여 전반적인 시장 추세를 측정합니다.",
    insight: "지수가 125일선보다 높을수록 시장의 상승세가 강하며(탐욕), 밑돌수록 하락장(공포)을 의미합니다."
  },
  stock_price_strength: {
    desc: "뉴욕증권거래소(NYSE)에서 52주 신고가를 기록한 종목 수와 신저가를 기록한 종목 수의 비율을 비교합니다.",
    insight: "신고가 종목이 신저가 종목보다 훨씬 많으면 시장의 상승 동력이 넓게 확산되어 있음(탐욕)을 나타냅니다."
  },
  stock_price_breadth: {
    desc: "상승한 종목의 거래량과 하락한 종목의 거래량을 비교하는 누적 거래량 지수(McClellan Volume Summation Index)를 측정합니다.",
    insight: "상승 종목의 거래량 비율이 높을수록 시장 내 자금 유입이 긍정적이고 광범위함(탐욕)을 뜻합니다."
  },
  put_call_options: {
    desc: "약세장에 베팅하는 풋옵션과 강세장에 베팅하는 콜옵션의 거래량 비율(Put/Call Ratio)을 비교합니다.",
    insight: "비율이 낮을수록(콜옵션 선호) 시장이 낙관적(탐욕)이며, 1에 가까워지거나 넘으면 극도의 불안(공포)을 의미합니다."
  },
  market_volatility: {
    desc: "CBOE 변동성 지수(VIX)와 50일 이동평균선을 비교하여 시장의 불안 수준을 측정합니다.",
    insight: "VIX 지수가 낮을수록 시장이 안정적이고 지나치게 낙관적(탐욕)이며, VIX가 급등하면 패닉 셀(공포) 상태입니다."
  },
  safe_haven_demand: {
    desc: "주식 수익률과 안전 자산인 국채 수익률 간의 차이를 비교하여 위험 자산 선호도를 분석합니다.",
    insight: "주식 선호도가 국채보다 높을수록 투자자들이 위험을 감수하는 성향(탐욕)이 강함을 의미합니다."
  },
  junk_bond_demand: {
    desc: "투자적격 채권과 부도 위험이 높은 정크본드(투자부적격) 간의 금리 스프레드를 비교합니다.",
    insight: "스프레드가 좁을수록(정크본드 이자율이 낮음) 고위험 자산에 대한 수요가 강하고 낙관적(탐욕)임을 나타냅니다."
  }
};

function IndicatorChart({ data, dataSecondary }: { data: any[]; dataSecondary?: any[] }) {
  if (!data || data.length === 0) return null;

  // Combine primary and secondary data by matching timestamps
  const chartData = data.map((d, index) => {
    const item: any = {
      date: new Date(d.x).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
      value: d.y,
    };
    if (dataSecondary && dataSecondary[index]) {
      item.valueSec = dataSecondary[index].y;
    }
    return item;
  });

  return (
    <div className="w-full h-44 mt-2 select-none bg-neutral-50/50 border border-border/10 p-2 relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 8 }} 
            stroke="#9ca3af"
            tickLine={false} 
            axisLine={false}
            interval={50}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{ fontSize: 8 }} 
            stroke="#9ca3af"
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ fontSize: '10px', background: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb' }} 
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="var(--primary)" 
            strokeWidth={1.5} 
            dot={false} 
            name="지표 값"
          />
          {dataSecondary && (
            <Line 
              type="monotone" 
              dataKey="valueSec" 
              stroke="#6b7280" 
              strokeWidth={1.2} 
              strokeDasharray="3 3"
              dot={false} 
              name="이동평균선"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function getArcPath(cx: number, cy: number, rInner: number, rOuter: number, startAngleDeg: number, endAngleDeg: number) {
  const toRad = Math.PI / 180;
  const sRad = startAngleDeg * toRad;
  const eRad = endAngleDeg * toRad;
  
  const x1_out = cx + rOuter * Math.cos(sRad);
  const y1_out = cy - rOuter * Math.sin(sRad);
  
  const x2_out = cx + rOuter * Math.cos(eRad);
  const y2_out = cy - rOuter * Math.sin(eRad);
  
  const x1_in = cx + rInner * Math.cos(sRad);
  const y1_in = cy - rInner * Math.sin(sRad);
  
  const x2_in = cx + rInner * Math.cos(eRad);
  const y2_in = cy - rInner * Math.sin(eRad);
  
  return `M ${x1_out} ${y1_out} A ${rOuter} ${rOuter} 0 0 1 ${x2_out} ${y2_out} L ${x2_in} ${y2_in} A ${rInner} ${rInner} 0 0 0 ${x1_in} ${y1_in} Z`;
}

function getCircleClasses(rating: string) {
  switch (rating.toLowerCase()) {
    case 'extreme fear': return 'bg-red-50 text-red-700 border-red-200';
    case 'fear': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'neutral': return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'greed': return 'bg-green-50 text-green-700 border-green-200';
    case 'extreme greed': return 'bg-emerald-50 text-emerald-800 border-emerald-250';
    default: return 'bg-secondary/40 text-foreground border-border/10';
  }
}

export function MinskyWidget({ className }: { className?: string }) {
  const [data, setData] = useState<FgData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/minsky")
      .then(res => res.json())
      .then((json: FgData) => {
        if (!('error' in json)) setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false))
  }, [])

  const getRatingColorCSS = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'extreme fear': return '#b91c1c';
      case 'fear': return '#c2410c';
      case 'neutral': return '#4b5563';
      case 'greed': return '#047857';
      case 'extreme greed': return '#065f46';
      default: return '#111111';
    }
  }

  const getRatingClasses = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'extreme fear': return 'text-red-700 border-red-200 bg-red-50';
      case 'fear': return 'text-orange-700 border-orange-200 bg-orange-50';
      case 'neutral': return 'text-gray-700 border-gray-200 bg-gray-50';
      case 'greed': return 'text-green-700 border-green-200 bg-green-50';
      case 'extreme greed': return 'text-emerald-700 border-emerald-200 bg-emerald-50';
      default: return 'text-foreground border-border/10 bg-secondary/55';
    }
  }

  const scoreMapToRating = (sc: number) => {
      if(sc <= 25) return "EXTREME FEAR";
      if(sc <= 45) return "FEAR";
      if(sc <= 55) return "NEUTRAL";
      if(sc <= 75) return "GREED";
      return "EXTREME GREED";
  }

  return (
    <div className={`w-full bg-card border border-border flex flex-col overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 relative ${className || 'h-[360px]'}`}>
      
      {/* IDE Window Header */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider flex items-center gap-1">
          <Activity className="w-3.5 h-3.5" /> 공포 탐욕 지수
        </span>
        <span className="stamp-red text-[9px] font-bold rounded-sm border-primary/30 text-primary bg-primary/5 px-1.5 py-0.5">
          시장 심리 지표
        </span>
      </div>

      {loading ? (
         <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-5">
            <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin mb-3"></div>
            <span className="text-muted-foreground text-[11px] font-mono">지표 분석 중...</span>
         </div>
      ) : data ? (
         <div className={`flex-1 p-4 relative z-10 custom-scrollbar ${className?.includes('h-auto') ? '' : 'overflow-y-auto min-h-0'}`}>
           
           {/* 데이터 출처 및 인사이트 설명 */}
           <div className="bg-secondary/40 border-b border-border p-4.5 -mx-4 -mt-4 mb-6">
             <h4 className="text-[13px] font-bold text-foreground mb-1.5 flex items-center gap-1.5 font-sans">
               💡 데이터 출처 및 분석 인사이트
             </h4>
             <p className="text-[12.5px] text-muted-foreground leading-relaxed font-sans">
               이 지표는 실시간 데이터를 기반으로 합니다. 
               시장 모멘텀, 주가 강도/폭, 풋/콜 옵션 비율, VIX 변동성 지수, 안전 자산 및 정크본드 수요 등 7가지 핵심 시장 지표를 종합 분석하여 시장의 과열 여부를 나타냅니다.
             </p>
           </div>
            
            {/* CNN Business Style Thermometer and History Timeline */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-3xl mx-auto my-6 px-4">
              
              {/* Left: Flat Vertical Scale Bar + Large Rating Panel */}
              <div className="flex items-center justify-center gap-8 w-full md:w-[50%] shrink-0">
                {/* SVG Vertical Scale Bar */}
                <svg viewBox="0 0 60 180" className="w-[60px] h-[160px] overflow-visible select-none">
                  {/* Background segments for regions in gray tones */}
                  <rect x="25" y="125" width="10" height="35" fill="#e5e7eb" /> {/* 0-25 */}
                  <rect x="25" y="97" width="10" height="28" fill="#d1d5db" />  {/* 25-45 */}
                  <rect x="25" y="83" width="10" height="14" fill="#9ca3af" />  {/* 45-55 */}
                  <rect x="25" y="55" width="10" height="28" fill="#6b7280" />  {/* 55-75 */}
                  <rect x="25" y="20" width="10" height="35" fill="#4b5563" />  {/* 75-100 */}
                  
                  {/* Outer border for the track */}
                  <rect x="25" y="20" width="10" height="140" fill="none" stroke="#9ca3af" strokeWidth="0.8" />

                  {/* Grid scale lines and text */}
                  <line x1="18" y1="20" x2="23" y2="20" stroke="#9ca3af" strokeWidth="0.8" />
                  <text x="14" y="22.5" fontSize="7" fill="#6b7280" fontWeight="bold" textAnchor="end" className="font-mono">100</text>
                  
                  <line x1="18" y1="55" x2="23" y2="55" stroke="#9ca3af" strokeWidth="0.8" />
                  <text x="14" y="57.5" fontSize="7" fill="#6b7280" fontWeight="bold" textAnchor="end" className="font-mono">75</text>
                  
                  <line x1="18" y1="90" x2="23" y2="90" stroke="#9ca3af" strokeWidth="0.8" />
                  <text x="14" y="92.5" fontSize="7" fill="#6b7280" fontWeight="bold" textAnchor="end" className="font-mono">50</text>
                  
                  <line x1="18" y1="125" x2="23" y2="125" stroke="#9ca3af" strokeWidth="0.8" />
                  <text x="14" y="127.5" fontSize="7" fill="#6b7280" fontWeight="bold" textAnchor="end" className="font-mono">25</text>
                  
                  <line x1="18" y1="160" x2="23" y2="160" stroke="#9ca3af" strokeWidth="0.8" />
                  <text x="14" y="162.5" fontSize="7" fill="#6b7280" fontWeight="bold" textAnchor="end" className="font-mono">0</text>

                  {/* Pointer/Needle (Horizontal slider marker) */}
                  {(() => {
                    const yPos = 160 - (data.score / 100) * 140;
                    return (
                      <g>
                        <polygon points={`42,${yPos} 48,${yPos - 3.5} 48,${yPos + 3.5}`} fill="#111827" />
                        <line x1="20" y1={yPos} x2="42" y2={yPos} stroke="#111827" strokeWidth="1.5" />
                        <circle cx="21" cy={yPos} r="2" fill="#ffffff" stroke="#111827" strokeWidth="1.2" />
                      </g>
                    );
                  })()}
                </svg>

                {/* Large rating labels next to the vertical scale */}
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground/80 tracking-wider">CURRENT SCORE</span>
                  <span className="text-5xl font-black text-foreground font-mono mt-1.5 leading-none">
                    {data.score}
                  </span>
                  <span className="text-[20px] font-black text-foreground mt-3 tracking-widest font-sans leading-none uppercase">
                    {data.rating}
                  </span>
                </div>
              </div>

              {/* Right: History rows in list style */}
              <div className="w-full md:w-[50%] flex flex-col justify-center gap-2 pl-0 md:pl-8 md:border-l border-border/10 font-sans">
                {[
                  { label: "Previous close", sc: data.history.previousClose?.score ?? data.score, rating: scoreMapToRating(data.history.previousClose?.score ?? data.score) },
                  { label: "1 week ago", sc: data.history.oneWeekAgo.score, rating: scoreMapToRating(data.history.oneWeekAgo.score) },
                  { label: "1 month ago", sc: data.history.oneMonthAgo.score, rating: scoreMapToRating(data.history.oneMonthAgo.score) },
                  { label: "1 year ago", sc: data.history.oneYearAgo.score, rating: scoreMapToRating(data.history.oneYearAgo.score) },
                ].map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-dashed border-border/10 last:border-0 w-full">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-semibold leading-none">{h.label}</span>
                      <span className="text-[13px] font-black text-foreground mt-1.5 leading-none tracking-tight">{h.rating}</span>
                    </div>
                    
                    <div className="flex-1 mx-4 border-b border-dotted border-border/20 hidden sm:block"></div>
                    
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] font-black font-mono border shadow-sm ${getCircleClasses(h.rating)}`}>
                      {h.sc}
                    </div>
                  </div>
                ))}
              </div>

            </div>
  
           <div className="w-full h-px bg-border/10 my-5"></div>
  
           {/* 7 Indicators List */}
           <div className="flex flex-col gap-5 w-full mt-2">
              <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest mb-2">7 MARKET INDICATORS</h3>
              {data.indicators.map((ind) => {
                const details = INDICATOR_EXPLANATIONS[ind.key] || { desc: "-", insight: "-" };
                return (
                  <div 
                    key={ind.key} 
                    className="flex flex-col md:flex-row gap-6 w-full items-stretch py-5 border-b border-border/10 last:border-0 hover:bg-secondary/10 px-4 -mx-4 transition-colors"
                  >
                    {/* Left: Chart only */}
                    <div className="w-full md:w-[35%] flex flex-col justify-center select-none">
                      <IndicatorChart 
                        data={ind.data || []} 
                        dataSecondary={ind.key === 'market_momentum' ? ind.data125 : (ind.key === 'market_volatility' ? ind.data50 : undefined)} 
                      />
                    </div>

                    {/* Right: Title, Rating, Summary, Explanations and Insights */}
                    <div className="w-full md:w-[65%] flex flex-col justify-between border-t md:border-t-0 md:border-l border-border/10 pt-4 md:pt-0 md:pl-6 gap-3">
                      <div>
                        {/* Title and Rating Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/10 pb-2 mb-2">
                          <a 
                            href="https://edition.cnn.com/markets/fear-and-greed" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[14.5px] text-foreground font-extrabold font-sans hover:text-primary hover:underline transition-colors"
                          >
                            {ind.name}
                          </a>
                          <div className={`px-4 py-1.5 border text-xs md:text-[13px] font-black tracking-widest shrink-0 font-mono uppercase ${getRatingClasses(ind.rating)}`}>
                            {ind.rating}
                          </div>
                        </div>
                        
                        {/* Summary value */}
                        <div className="text-[12px] text-muted-foreground font-mono leading-normal bg-secondary/35 p-2.5 border border-border/10 font-semibold">
                          현재 상태: <span className="font-bold text-foreground">{ind.summary}</span> {ind.score !== undefined && <span className="text-[11px] text-muted-foreground font-semibold"> (지표 점수: {ind.score})</span>}
                        </div>
                      </div>

                      {/* Explanations and Insights */}
                      <div className="text-[12.5px] leading-relaxed space-y-2.5 font-sans">
                        <div className="bg-secondary/20 p-3.5 border border-border/5">
                          <span className="font-extrabold text-foreground/90 block mb-1 text-[13px]">🔧 지표 설명</span>
                          <span className="text-muted-foreground block leading-relaxed">{details.desc}</span>
                        </div>
                        <div className="bg-primary/[0.02] p-3.5 border border-primary/5">
                          <span className="font-extrabold text-primary block mb-1 text-[13px]">💡 분석 인사이트</span>
                          <span className="text-muted-foreground block leading-relaxed">{details.insight}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
           </div>
  
         </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10 text-muted-foreground text-[11px] font-mono">데이터를 불러오지 못했습니다.</div>
      )}
      
      {/* Scrollbar CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.25);
          border-radius: 0px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.5);
        }
      `}} />
    </div>
  )
}
