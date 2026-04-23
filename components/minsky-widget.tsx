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
      case 'extreme fear': return '#f43f5e'; // rose-500
      case 'fear': return '#fb923c'; // orange-400
      case 'neutral': return '#9ca3af'; // gray-400
      case 'greed': return '#34d399'; // emerald-400
      case 'extreme greed': return '#22c55e'; // green-500
      default: return '#818cf8'; // indigo-400
    }
  }

  const getRatingClasses = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'extreme fear': return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
      case 'fear': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      case 'neutral': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
      case 'greed': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'extreme greed': return 'text-green-500 border-green-500/30 bg-green-500/10';
      default: return 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10';
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
    <div className="w-full h-[320px] bg-indigo-950/40 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col overflow-hidden group transition-colors duration-300 hover:bg-indigo-900/50 hover:border-indigo-500/60 relative">
      
      {/* Header - Fixed At Top */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-indigo-500/30 shrink-0 bg-indigo-950/20 z-10">
        <Activity className="w-5 h-5 text-indigo-400" />
        <div className="flex flex-col">
          <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">FEAR & GREED INDEX</h2>
          <span className="text-[10px] text-indigo-400/80 mt-1">Multi-factor Market Sentiment Tracker</span>
        </div>
      </div>

      {loading ? (
         <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-5">
            <div className="w-6 h-6 border-2 border-indigo-500/50 border-t-indigo-300 rounded-full animate-spin mb-3"></div>
            <span className="text-indigo-200/50 text-[11px]">지표 파싱 중...</span>
         </div>
      ) : data ? (
        <div className="flex-1 p-5 overflow-y-auto min-h-0 relative z-10 custom-scrollbar">
          
          <div className="flex flex-col mb-8 mt-2 items-center">
            
            {/* Gauge Chart */}
            <div className="relative w-full max-w-[200px] aspect-[2/1] mx-auto scale-[1.1] origin-bottom mb-2">
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
                <text x="3" y="47" fontSize="4" fill="rgba(255,255,255,0.4)" textAnchor="start">0</text>
                <text x="14" y="22" fontSize="4" fill="rgba(255,255,255,0.4)" textAnchor="middle">25</text>
                <text x="50" y="4" fontSize="4" fill="rgba(255,255,255,0.4)" textAnchor="middle">50</text>
                <text x="86" y="22" fontSize="4" fill="rgba(255,255,255,0.4)" textAnchor="middle">75</text>
                <text x="97" y="47" fontSize="4" fill="rgba(255,255,255,0.4)" textAnchor="end">100</text>

                {/* Needle Calculation */}
                {(() => {
                  const needleAngleRad = ((data.score / 100) * 180 - 90 - 90) * Math.PI / 180.0;
                  const nx = 50 + 38 * Math.cos(needleAngleRad);
                  const ny = 48 + 38 * Math.sin(needleAngleRad);
                  return (
                    <g className="transition-all duration-1000 ease-in-out" style={{ transformOrigin: '50px 48px', transform: 'rotate(0deg)' }}>
                      <line x1="50" y1="48" x2={nx} y2={ny} stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="50" cy="48" r="3.5" fill="#1e1b4b" stroke="rgba(255,255,255,0.9)" strokeWidth="1" />
                    </g>
                  );
                })()}
              </svg>

              {/* Current Score Digit */}
              <div className="absolute -bottom-2 w-full text-center flex flex-col items-center">
                  <span className="text-3xl font-black text-white leading-none drop-shadow-md">{data.score}</span>
                  <span className={`text-[9px] font-bold tracking-widest mt-0.5 ${getRatingClasses(data.rating).split(' ')[0]}`}>
                    {data.rating.toUpperCase()}
                  </span>
              </div>
            </div>
            
          </div>

          {/* Historical Timeline */}
          <div className="flex gap-2 w-full justify-between mt-4">
             {[
               { label: "1 WEEK", sc: data.history.oneWeekAgo.score },
               { label: "1 MONTH", sc: data.history.oneMonthAgo.score },
               { label: "1 YEAR", sc: data.history.oneYearAgo.score },
             ].map((h, i) => (
               <div key={i} className="flex-1 flex flex-col items-center bg-indigo-900/30 border border-indigo-500/20 rounded-lg py-2 px-1">
                 <span className="text-[8px] text-indigo-300/60 font-bold mb-1 tracking-wider">{h.label}</span>
                 <span className="text-xs font-black text-white">{h.sc}</span>
                 <span className={`text-[7px] font-bold tracking-wider mt-0.5 ${getRatingClasses(scoreMapToRating(h.sc)).split(' ')[0]}`}>
                    {scoreMapToRating(h.sc)}
                 </span>
               </div>
             ))}
          </div>

          <div className="w-full h-px bg-indigo-500/20 my-5"></div>

          {/* 7 Indicators List */}
          <div className="flex flex-col gap-2 w-full mt-4">
             <h3 className="text-[10px] font-black text-indigo-300 tracking-widest mb-1 opacity-70">7 MARKET INDICATORS</h3>
             {data.indicators.map((ind) => (
                <a 
                  key={ind.key} 
                  href="https://edition.cnn.com/markets/fear-and-greed" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex flex-col py-2 border-b border-indigo-500/10 last:border-0 hover:bg-indigo-500/10 px-2 -mx-2 rounded transition-colors group/item"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-indigo-100/90 font-bold tracking-wide group-hover/item:text-white transition-colors">{ind.name}</span>
                    <div className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider shrink-0 ${getRatingClasses(ind.rating)}`}>
                      {ind.rating.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-300/60 leading-snug break-keep pr-4">{ind.summary}</span>
                </a>
             ))}
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10 text-indigo-200/50 text-[11px]">데이터를 불러오지 못했습니다.</div>
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
          background: rgba(99, 102, 241, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
        }
      `}} />
    </div>
  )
}
