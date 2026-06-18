"use client"

import { useState, useEffect } from "react"
import { Activity } from "lucide-react"

interface Indicator {
  name: string;
  summary: string;
  rating: string;
  key: string;
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

export function MinskyWidget() {
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
      case 'extreme fear': return '#b91c1c'; // Vermilion Red
      case 'fear': return '#c2410c'; // Dark Orange
      case 'neutral': return '#4b5563'; // Gray
      case 'greed': return '#047857'; // Green
      case 'extreme greed': return '#065f46'; // Emerald
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

  // Helper to draw arc
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
      const angleRad = (angleDeg - 90) * Math.PI / 180.0;
      return { x: cx + (r * Math.cos(angleRad)), y: cy + (r * Math.sin(angleRad)) };
    };
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };

  const scoreMapToRating = (sc: number) => {
      if(sc <= 25) return "EXTREME FEAR";
      if(sc <= 45) return "FEAR";
      if(sc <= 55) return "NEUTRAL";
      if(sc <= 75) return "GREED";
      return "EXTREME GREED";
  }

  return (
    <div className="w-full h-[360px] bg-card border border-border flex flex-col overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 relative">
      
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
         <div className="flex-1 p-4 overflow-y-auto min-h-0 relative z-10 custom-scrollbar">
          
          <div className="flex flex-col mb-4 mt-2 items-center">
            
            {/* Gauge Chart */}
            <div className="relative w-full max-w-[200px] aspect-[2/1] mx-auto scale-[1.0] origin-bottom mb-2">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                {/* 0-25 Extreme Fear */}
                <path d={describeArc(50, 48, 40, -90, -45)} fill="none" stroke={getRatingColorCSS('extreme fear')} strokeWidth="12" />
                {/* 25-45 Fear */}
                <path d={describeArc(50, 48, 40, -45, -9)} fill="none" stroke={getRatingColorCSS('fear')} strokeWidth="12" />
                {/* 45-55 Neutral */}
                <path d={describeArc(50, 48, 40, -9, 9)} fill="none" stroke={getRatingColorCSS('neutral')} strokeWidth="12" />
                {/* 55-75 Greed */}
                <path d={describeArc(50, 48, 40, 9, 45)} fill="none" stroke={getRatingColorCSS('greed')} strokeWidth="12" />
                {/* 75-100 Extreme Greed */}
                <path d={describeArc(50, 48, 40, 45, 90)} fill="none" stroke={getRatingColorCSS('extreme greed')} strokeWidth="12" />
 
                {/* Gauge Tick Labels */}
                <text x="3" y="47" fontSize="4.5" fill="rgba(0,0,0,0.5)" fontWeight="bold" textAnchor="start">0</text>
                <text x="14" y="22" fontSize="4.5" fill="rgba(0,0,0,0.5)" fontWeight="bold" textAnchor="middle">25</text>
                <text x="50" y="4" fontSize="4.5" fill="rgba(0,0,0,0.5)" fontWeight="bold" textAnchor="middle">50</text>
                <text x="86" y="22" fontSize="4.5" fill="rgba(0,0,0,0.5)" fontWeight="bold" textAnchor="middle">75</text>
                <text x="97" y="47" fontSize="4.5" fill="rgba(0,0,0,0.5)" fontWeight="bold" textAnchor="end">100</text>
 
                {/* Needle Calculation */}
                {(() => {
                  const needleAngleRad = ((data.score / 100) * 180 - 90 - 90) * Math.PI / 180.0;
                  const nx = 50 + 38 * Math.cos(needleAngleRad);
                  const ny = 48 + 38 * Math.sin(needleAngleRad);
                  return (
                    <g className="transition-all duration-1000 ease-in-out" style={{ transformOrigin: '50px 48px', transform: 'rotate(0deg)' }}>
                      <line x1="50" y1="48" x2={nx} y2={ny} stroke="rgba(17,17,17,0.95)" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="50" cy="48" r="3.5" fill="#ffffff" stroke="rgba(17,17,17,0.95)" strokeWidth="1.2" />
                    </g>
                  );
                })()}
              </svg>
 
              {/* Current Score Digit */}
              <div className="absolute -bottom-2 w-full text-center flex flex-col items-center select-none">
                  <span className="text-3xl font-black text-foreground leading-none font-mono">{data.score}</span>
                  <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-sm tracking-wider mt-1 ${getRatingClasses(data.rating)}`}>
                    {data.rating.toUpperCase()}
                  </span>
              </div>
            </div>
            
          </div>
 
          {/* Historical Timeline */}
          <div className="flex gap-2 w-full justify-between mt-4 select-none">
             {[
               { label: "1 WEEK", sc: data.history.oneWeekAgo.score },
               { label: "1 MONTH", sc: data.history.oneMonthAgo.score },
               { label: "1 YEAR", sc: data.history.oneYearAgo.score },
             ].map((h, i) => (
               <div key={i} className="flex-1 flex flex-col items-center bg-secondary/20 border border-border/10 rounded-sm py-1.5 px-1">
                 <span className="text-[8px] text-muted-foreground font-bold mb-0.5 tracking-wider">{h.label}</span>
                 <span className="text-xs font-black text-foreground font-mono">{h.sc}</span>
                 <span className={`text-[7px] font-bold tracking-wider mt-0.5 border px-1 rounded-sm ${getRatingClasses(scoreMapToRating(h.sc)).split(' ')[0]} ${getRatingClasses(scoreMapToRating(h.sc)).split(' ')[1]} ${getRatingClasses(scoreMapToRating(h.sc)).split(' ')[2]}`}>
                    {scoreMapToRating(h.sc)}
                 </span>
               </div>
             ))}
          </div>
 
          <div className="w-full h-px bg-border/10 my-4"></div>
 
          {/* 7 Indicators List */}
          <div className="flex flex-col gap-1.5 w-full mt-2">
             <h3 className="text-[9px] font-bold text-muted-foreground tracking-widest mb-1 select-none">7 MARKET INDICATORS</h3>
             {data.indicators.map((ind) => (
                <a 
                  key={ind.key} 
                  href="https://edition.cnn.com/markets/fear-and-greed" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex flex-col py-1.5 border-b border-border/5 last:border-0 hover:bg-secondary/40 px-2 -mx-2 transition-colors group/item"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-foreground/90 font-bold tracking-wide group-hover/item:text-primary transition-colors font-sans">{ind.name}</span>
                    <div className={`px-2 py-0.5 rounded-sm border text-[8px] font-bold tracking-wider shrink-0 font-mono ${getRatingClasses(ind.rating)}`}>
                      {ind.rating.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-snug break-keep pr-4 font-sans">{ind.summary}</span>
                </a>
             ))}
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
