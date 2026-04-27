const fs = require('fs');
const file = 'components/galaxy-hero.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add new interfaces and state for Carousel
const interfacesCode = `interface PolymarketRow {
  id: string
  slug: string
  title: string
  description?: string
  image?: string
  volume: number
  markets: Array<{ id: string, title: string, yesPrice: number | null }>
}

interface PolymarketFinanceRow {
  id: string
  slug: string
  title: string
  volume: number
  endDate: string | null
  yesPrice: number | null
}`;

content = content.replace(/interface PolymarketRow {[\s\S]*?yesPrice: number \| null\n}/, interfacesCode);

// Add ChevronLeft, ChevronRight to lucide-react imports if not present
if (!content.includes('ChevronLeft')) {
  content = content.replace('TrendingUp, BarChart3', 'TrendingUp, BarChart3, ChevronLeft, ChevronRight, Calendar');
}

// 2. Add state for fedPolys, activeCarouselIndex
const stateCode = `const [polys, setPolys] = useState<PolymarketRow[]>([])
  const [fedPolys, setFedPolys] = useState<PolymarketFinanceRow[]>([])
  const [polyIndex, setPolyIndex] = useState(0)`;

content = content.replace(/const \[polys, setPolys\] = useState<PolymarketRow\[\]>\(\[\]\)/, stateCode);

// 3. Update fetchData to fetch both Polymarket endpoints
const fetchPolyCode = `        // 2. Polymarket Featured
        fetch('/api/polymarket/top').then(res => res.json()).then(data => setPolys(data.items || [])).catch(() => {}),
        // 2.1 Polymarket Finance
        fetch('/api/polymarket/finance').then(res => res.json()).then(data => setFedPolys(data.items || [])).catch(() => {}),`;

content = content.replace(/fetch\('\/api\/polymarket\/top'\)[\s\S]*?catch\(\(\) => {}\),/, fetchPolyCode);

// 4. Update the render block for prediction
const polyRegex = /{activeTab === 'prediction' && \([\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<EmptySlot index={2} \/>[\s\S]*?<EmptySlot index={6} \/>[\s\S]*?<\/>[\s\S]*?\)}/g;

const newPredictionRender = `{activeTab === 'prediction' && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Slot 1: Featured Carousel */}
              <div className="w-full flex flex-col h-[360px] bg-fuchsia-950/40 backdrop-blur-xl border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(255,0,255,0.15)] relative overflow-hidden group">
                 <div className="flex items-center gap-2 mb-3 pb-2 border-b border-fuchsia-500/30 shrink-0 z-10 relative">
                    <BarChart3 className="w-5 h-5 text-fuchsia-400" />
                    <div className="flex flex-col">
                      <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">HOT ISSUES</h2>
                      <span className="text-[10px] text-fuchsia-400/80 mt-1">폴리마켓 주요 트렌딩 토픽</span>
                    </div>
                 </div>
                 
                 {polys.length > 0 ? (
                   <div className="flex-1 flex flex-col justify-between relative z-10">
                     <div className="flex items-start gap-4 h-full">
                       {polys[polyIndex]?.image && (
                         <img src={polys[polyIndex].image} className="w-16 h-16 rounded-xl object-cover border border-fuchsia-500/30 hidden sm:block" alt="event" />
                       )}
                       <div className="flex-1 min-w-0">
                         <a href={\`https://polymarket.com/event/\${polys[polyIndex]?.slug}\`} target="_blank" rel="noopener noreferrer" className="block mb-3 hover:opacity-80">
                           <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">{polys[polyIndex]?.title}</h3>
                         </a>
                         
                         <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
                           {polys[polyIndex]?.markets?.map((m, idx) => (
                             <div key={idx} className="flex justify-between items-center bg-fuchsia-900/20 px-3 py-1.5 rounded-lg border border-fuchsia-800/50">
                               <span className="text-xs text-fuchsia-100 font-medium truncate pr-2">{m.title}</span>
                               <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/80 px-2 py-0.5 rounded shadow-inner whitespace-nowrap">
                                 {m.yesPrice !== null ? \`YES \${(m.yesPrice * 100).toFixed(0)}%\` : '-'}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center mt-3 pt-3 border-t border-fuchsia-500/20">
                       <span className="text-xs font-medium text-fuchsia-200/60">Vol: {formatMarketCap(polys[polyIndex]?.volume?.toString() || '0')}</span>
                       <div className="flex gap-1.5">
                         {polys.map((_, idx) => (
                           <div key={idx} onClick={() => setPolyIndex(idx)} className={\`w-2 h-2 rounded-full cursor-pointer transition-all \${idx === polyIndex ? 'bg-fuchsia-400 w-4' : 'bg-fuchsia-900/50 hover:bg-fuchsia-400/50'}\`} />
                         ))}
                       </div>
                     </div>
                     
                     {/* Arrows */}
                     <button onClick={() => setPolyIndex(i => (i === 0 ? polys.length - 1 : i - 1))} className="absolute top-1/2 -left-3 -translate-y-1/2 p-1 bg-fuchsia-950/80 rounded-full text-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity border border-fuchsia-500/30">
                       <ChevronLeft className="w-5 h-5" />
                     </button>
                     <button onClick={() => setPolyIndex(i => (i === polys.length - 1 ? 0 : i + 1))} className="absolute top-1/2 -right-3 -translate-y-1/2 p-1 bg-fuchsia-950/80 rounded-full text-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity border border-fuchsia-500/30">
                       <ChevronRight className="w-5 h-5" />
                     </button>
                   </div>
                 ) : (
                   <div className="flex-1 flex items-center justify-center text-xs text-fuchsia-300/50">데이터를 불러오는 중...</div>
                 )}
              </div>

              {/* Slot 2: Fed & Finance */}
              <div className="w-full flex flex-col h-[360px] bg-amber-950/40 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-colors duration-300 hover:bg-amber-900/50 hover:border-amber-500/60">
                 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-500/30 shrink-0">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <div className="flex flex-col">
                      <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">FED & FINANCE</h2>
                      <span className="text-[10px] text-amber-400/80 mt-1">경제 지표 및 연준 금리 예측</span>
                    </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-amber">
                   <div className="flex flex-col gap-2.5">
                     {fedPolys.length > 0 ? fedPolys.map((poly, i) => (
                       <a 
                         key={i} 
                         href={\`https://polymarket.com/event/\${poly.slug}\`} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="flex flex-col gap-1 shrink-0 group cursor-pointer bg-amber-900/10 hover:bg-amber-900/20 px-3 py-2.5 rounded-lg transition-colors border border-amber-900/30"
                       >
                         <h3 className="text-[12px] font-bold text-amber-50 line-clamp-2 leading-tight group-hover:text-amber-300 transition-colors">
                           {poly.title}
                         </h3>
                         <div className="flex items-center justify-between mt-1">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-amber-900 bg-amber-400 px-1.5 py-0.5 rounded flex-shrink-0">
                               {poly.endDate ? new Date(poly.endDate).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : 'N/A'}
                             </span>
                             <span className="text-[10px] text-amber-200/50 hidden sm:inline">Vol: {formatMarketCap(poly.volume?.toString() || '0')}</span>
                           </div>
                           <span className="font-extrabold text-[11px] text-amber-300 bg-amber-950/80 shadow-inner px-2 py-0.5 rounded">
                             YES {poly.yesPrice !== null ? (poly.yesPrice * 100).toFixed(0) : '-'}%
                           </span>
                         </div>
                       </a>
                     )) : (
                       <div className="flex items-center justify-center h-full text-amber-200/50 text-[11px] text-center p-4">데이터 로딩 중...</div>
                     )}
                   </div>
                 </div>
              </div>

              {/* Fill remaining slots if 2x3 is maintained globally, but prediction is isolated here */}
              {/* Wait, the container grid is already defined outside! 
                  The prediction block itself only renders its own fragments.
                  I should render the remaining empty slots to match the global layout.
                  Wait, lg:col-span-3 spans the entire row. But we can just use EmptySlot for the rest.
              */}
              <div className="hidden lg:block lg:col-span-1">
                <EmptySlot index={3} />
              </div>
              <EmptySlot index={4} />
              <EmptySlot index={5} />
              <EmptySlot index={6} />
            </div>
          )}`;

// Replace prediction block. The outer regex must match accurately.
// Let's find the exact prediction block string.
const splitContent = content.split("{activeTab === 'prediction' && (");
if (splitContent.length === 2) {
  const afterPred = splitContent[1];
  const nextTabSplit = afterPred.split("{activeTab === 'news' && (");
  if(nextTabSplit.length === 2) {
    const beforeNews = nextTabSplit[0];
    content = splitContent[0] + newPredictionRender + '\n          {activeTab === \'news\' && (' + nextTabSplit[1];
  }
} else {
    // If quote is double quotes
    const splitContent2 = content.split('{activeTab === "prediction" && (');
    if (splitContent2.length === 2) {
      const afterPred2 = splitContent2[1];
      const nextTabSplit2 = afterPred2.split('{activeTab === "news" && (');
      if(nextTabSplit2.length === 2) {
        content = splitContent2[0] + newPredictionRender + '\n          {activeTab === "news" && (' + nextTabSplit2[1];
      }
    }
}

// Ensure the outer grid is correctly handled or just inject the CSS for custom-scrollbar-amber
const scrollbarAmberCss = `
        .custom-scrollbar-amber::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-amber::-webkit-scrollbar-track { background: rgba(245, 158, 11, 0.05); border-radius: 4px; }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.3); border-radius: 4px; }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.6); }
`;
content = content.replace('</style>', scrollbarAmberCss + '</style>');

fs.writeFileSync(file, content);
console.log('Successfully updated components/galaxy-hero.tsx');
