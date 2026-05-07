"use client"

import { useEffect, useState } from "react"
import { Building2, ArrowDownUp, RefreshCw } from "lucide-react"

// 이 인터페이스는 향후 Supabase에서 가져올 데이터 구조를 예상한 것입니다.
interface EthFlowData {
  date: string
  blackrock: number | null
  fidelity: number | null
  grayscale: number | null
  total: number
}

export function FarsideEthWidget() {
  const [data, setData] = useState<EthFlowData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 임시 더미 데이터 (향후 Supabase 연결)
    const timer = setTimeout(() => {
      setData([
        { date: "May 06", blackrock: 12.5, fidelity: 5.2, grayscale: -15.3, total: 2.4 },
        { date: "May 05", blackrock: 8.1, fidelity: 3.0, grayscale: -20.1, total: -9.0 },
        { date: "May 04", blackrock: 25.4, fidelity: 10.5, grayscale: -5.2, total: 30.7 },
        { date: "May 03", blackrock: 15.0, fidelity: 8.2, grayscale: -12.0, total: 11.2 },
        { date: "May 02", blackrock: 0, fidelity: 0, grayscale: -8.5, total: -8.5 },
      ])
      setLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-full flex flex-col h-[360px] bg-blue-950/40 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-colors duration-300 hover:bg-blue-900/50 hover:border-blue-500/60">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" />
          <div className="flex flex-col">
            <h2 className="text-base font-black text-white tracking-widest leading-none mt-1">ETH ETF FLOWS</h2>
            <span className="text-[10px] text-blue-400/80 mt-1">이더리움 기관 현물 ETF 순유입 ($M)</span>
          </div>
        </div>
        <a
          href="https://farside.co.uk/eth/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-blue-500 hover:text-blue-300 transition-colors font-medium flex items-center gap-1"
        >
          Farside ↗
        </a>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-blue relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mb-3" />
            <span className="text-xs text-blue-200/50">데이터 준비 중 (Supabase 연동 필요)...</span>
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-blue-500/30">
              <tr>
                <th className="py-2 font-semibold text-blue-200">Date</th>
                <th className="py-2 font-semibold text-blue-200 text-right">IBIT</th>
                <th className="py-2 font-semibold text-blue-200 text-right">FETH</th>
                <th className="py-2 font-semibold text-blue-200 text-right">ETHE</th>
                <th className="py-2 font-semibold text-blue-200 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-blue-500/10 hover:bg-blue-900/20 transition-colors">
                  <td className="py-2.5 font-medium text-slate-300">{row.date}</td>
                  <td className={`py-2.5 text-right font-bold ${row.blackrock === null ? 'text-slate-500' : row.blackrock > 0 ? 'text-emerald-400' : row.blackrock < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {row.blackrock === null ? '-' : row.blackrock > 0 ? `+${row.blackrock}` : row.blackrock}
                  </td>
                  <td className={`py-2.5 text-right font-bold ${row.fidelity === null ? 'text-slate-500' : row.fidelity > 0 ? 'text-emerald-400' : row.fidelity < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {row.fidelity === null ? '-' : row.fidelity > 0 ? `+${row.fidelity}` : row.fidelity}
                  </td>
                  <td className={`py-2.5 text-right font-bold ${row.grayscale === null ? 'text-slate-500' : row.grayscale > 0 ? 'text-emerald-400' : row.grayscale < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {row.grayscale === null ? '-' : row.grayscale > 0 ? `+${row.grayscale}` : row.grayscale}
                  </td>
                  <td className={`py-2.5 text-right font-extrabold ${row.total > 0 ? 'text-emerald-400' : row.total < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {row.total > 0 ? `+${row.total}` : row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar-blue::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-blue::-webkit-scrollbar-track { background: rgba(59, 130, 246, 0.05); border-radius: 4px; }
        .custom-scrollbar-blue::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 4px; }
        .custom-scrollbar-blue::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.6); }
      `}</style>
    </div>
  )
}
