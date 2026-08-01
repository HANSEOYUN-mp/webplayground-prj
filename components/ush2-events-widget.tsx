"use client"

import { useState, useEffect } from "react"
import { Calendar, RefreshCw, Sparkles } from "lucide-react"

interface EventItem {
  id: string
  day: number | null // null for "일자 미정"
  dayDisplay: string
  title: string
  subtitle?: string
}

interface MonthlyEvents {
  month: number // 0-based: 6 = July, 11 = December
  monthName: string
  events: EventItem[]
  unscheduledEvents?: string[] // "일자 미정" 일정들
}

const MONTHLY_DATA: MonthlyEvents[] = [
  {
    month: 6, // July
    monthName: "7월",
    events: [
      { id: "1", day: 7, dayDisplay: "7일", title: "나스닥100 스페이스X 편입" },
      { id: "2", day: 16, dayDisplay: "16일", title: "TSMC 2Q 실적발표" },
      { id: "3", day: 27, dayDisplay: "27일", title: "빅테크 슈퍼위크" },
      { id: "4", day: 29, dayDisplay: "29일", title: "FOMC 금리결정" }
    ]
  },
  {
    month: 7, // August
    monthName: "8월",
    events: [
      { id: "5", day: 21, dayDisplay: "21일", title: "제네시스 AI 첫 실증" },
      { id: "6", day: 26, dayDisplay: "26일", title: "엔비디아 3Q 실적발표" },
      { id: "7", day: 27, dayDisplay: "27일", title: "잭슨홀 케빈 워시 연설" }
    ]
  },
  {
    month: 8, // September
    monthName: "9월",
    events: [
      { id: "8", day: 10, dayDisplay: "10일", title: "리밸런싱 (S&P + 나스닥)" },
      { id: "9", day: 16, dayDisplay: "16일", title: "FOMC 금리결정" },
      { id: "10", day: 18, dayDisplay: "18일", title: "네마녀의날 (선물옵션만기)" }
    ]
  },
  {
    month: 9, // October
    monthName: "10월",
    events: [
      { id: "12", day: 20, dayDisplay: "20일", title: "엔비디아 GTC Berlin" },
      { id: "13", day: 26, dayDisplay: "26일", title: "빅테크 슈퍼위크" },
      { id: "14", day: 28, dayDisplay: "28일", title: "FOMC 금리결정" }
    ],
    unscheduledEvents: ["애플 신제품 발표 (일자 미정)"]
  },
  {
    month: 10, // November
    monthName: "11월",
    events: [
      { id: "15", day: 3, dayDisplay: "3일", title: "중간선거 (트럼프)" },
      { id: "16", day: 25, dayDisplay: "25일", title: "엔비디아 4Q 실적발표" },
      { id: "17", day: 27, dayDisplay: "27일", title: "블랙프라이데이/사이버" }
    ]
  },
  {
    month: 11, // December
    monthName: "12월",
    events: [
      { id: "18", day: 9, dayDisplay: "9일", title: "FOMC 금리결정" },
      { id: "19", day: 11, dayDisplay: "11일", title: "리밸런싱 (S&P + 나스닥)" },
      { id: "20", day: 18, dayDisplay: "18일", title: "네마녀의날 (선물옵션만기)" }
    ],
    unscheduledEvents: ["2027년 가이던스 발표 (일자 미정)"]
  }
]

// 2026년 기준 월별 달력 날짜 목록 생성
function getCalendarDays(year: number, month: number) {
  const startDay = new Date(year, month, 1).getDay() // 0 = Sun, 1 = Mon, ...
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const days: (number | null)[] = []
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }
  return days
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

const VIEW_PAIRS = [
  { label: "7월", months: [6] },
  { label: "8월", months: [7] },
  { label: "9월", months: [8] },
  { label: "10월", months: [9] },
  { label: "11월", months: [10] },
  { label: "12월", months: [11] }
]

export function Ush2EventsWidget() {
  const [activePairIdx, setActivePairIdx] = useState(0)
  const [today, setToday] = useState<Date | null>(null)
  
  useEffect(() => {
    // 연도만 2026년으로 고정하고, 월과 일은 현재 시스템 시간의 값을 사용하여 연도와 무관하게 동적 페이징이 작동하도록 합니다.
    const d = new Date()
    const targetDate = new Date(2026, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())
    setToday(targetDate)
    
    // 오늘 날짜의 월에 따라 기본 페어 인덱스 설정 (7~8월 / 9~10월 / 11~12월)
    const currentMonth = targetDate.getMonth() // 0-based
    // 7월(6)→0, 8월(7)→1, 9월(8)→2, 10월(9)→3, 11월(10)→4, 12월(11)→5
    const monthToIdx: Record<number, number> = { 6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5 }
    setActivePairIdx(monthToIdx[currentMonth] ?? 0)
  }, [])

  if (!today) return null

  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() // 0-based
  const todayDate = today.getDate()
  const todayTime = today.getTime()

  const currentPair = VIEW_PAIRS[activePairIdx]
  const renderedMonths = MONTHLY_DATA.filter(m => currentPair.months.includes(m.month))

  return (
    <div className="w-full flex flex-col h-auto md:h-[360px] bg-card border border-border rounded-none overflow-hidden transition-colors duration-300 hover:bg-neutral-50/50 relative">
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border shrink-0">
        <span className="text-[11px] font-bold text-black dark:text-white tracking-wider flex items-center gap-1.5 font-sans">
          <Calendar className="w-3.5 h-3.5 text-black dark:text-white" /> 2026년 하반기 미국주식 주요 일정
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className="stamp-red text-[8px] font-extrabold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 animate-pulse text-primary" />
            오늘: {today.getFullYear()}.{String(today.getMonth() + 1).padStart(2, '0')}.{String(today.getDate()).padStart(2, '0')}
          </span>

          {/* 하반기 탭 이동 필터 */}
          <div className="flex flex-wrap items-center border border-border bg-card p-0.5">
            {VIEW_PAIRS.map((pair, idx) => (
              <button
                key={pair.label}
                onClick={() => setActivePairIdx(idx)}
                className={`px-2.5 py-0.5 text-[9px] font-bold font-mono transition-colors uppercase ${
                  activePairIdx === idx
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pair.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 달력 컨텐츠 영역 */}
      <div className="flex-1 p-2 grid grid-cols-1 gap-2 bg-background overflow-y-auto">
        {renderedMonths.map((item) => {
          const days = getCalendarDays(2026, item.month)
          
          return (
            <div 
              key={item.monthName}
              className="flex flex-col bg-secondary/5 border border-border/10 rounded-sm p-2 md:p-3 h-full"
            >
              {/* 월 타이틀 및 미정 일정 배너 */}
              <div className="flex justify-between items-center mb-2 border-b border-border/10 pb-1 shrink-0">
                <span className="text-[12px] font-black text-foreground">
                  2026년 {item.monthName}
                </span>
                {item.unscheduledEvents && item.unscheduledEvents.length > 0 && (
                  <span className="text-[8.5px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-sm">
                    {item.unscheduledEvents[0]}
                  </span>
                )}
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-0 text-center mb-1 text-muted-foreground/60 text-[9px] font-bold shrink-0 select-none">
                {WEEKDAYS.map((w, idx) => (
                  <span key={idx} className={idx === 0 ? "text-rose-500/80" : idx === 6 ? "text-blue-500/80" : ""}>
                    {w}
                  </span>
                ))}
              </div>

              {/* 큰 달력 그리드 (날짜별 칸) */}
              <div className="flex-1 grid grid-cols-7 border-t border-l border-border/10">
                {days.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="border-r border-b border-border/10 bg-secondary/5" />
                  }

                  const cellDate = new Date(2026, item.month, day)
                  const cellTime = cellDate.getTime()
                  const isToday = 2026 === todayYear && item.month === todayMonth && day === todayDate
                  const dayOfWeek = idx % 7
                  
                  // 해당 날짜의 이벤트 매칭
                  const dayEvent = item.events.find(e => e.day === day)
                  const isPast = cellTime < todayTime && !isToday

                    return (
                      <div 
                        key={`day-${day}`}
                        className={`border-r border-b border-border/10 flex flex-col p-0.5 relative justify-between min-h-[34px] select-none ${
                          isToday ? "bg-cyan-500/5 ring-1 ring-cyan-500/20" : ""
                        }`}
                      >
                        {/* 날짜 숫자 표시 */}
                        <div className="flex justify-between items-center w-full">
                          {isToday ? (
                            // 오늘 날짜: 파란색 계열 광자(photon) 스타일의 은은한 마커
                            <div className="relative h-4.5 w-4.5 bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 text-white rounded-full flex items-center justify-center font-black text-[9px] shadow-[0_0_12px_rgba(6,182,212,0.95)] border border-cyan-200/50">
                              {day}
                              <span className="absolute inset-0 rounded-full bg-cyan-400/40 animate-ping border border-cyan-300/30" />
                            </div>
                          ) : (
                            <span 
                              className={`text-[9.5px] font-black leading-none p-0.5 ${
                                dayOfWeek === 0 ? "text-rose-500/80" : dayOfWeek === 6 ? "text-blue-500/80" : "text-muted-foreground/80"
                              }`}
                            >
                              {day}
                            </span>
                          )}
                        </div>

                        {/* 이벤트 내용 (날짜 칸 안에 직접 표기) */}
                        {dayEvent && (
                          <div 
                            className={`text-[8.5px] font-bold p-0.5 mt-0.5 rounded-[2px] leading-tight select-text overflow-hidden ${
                              isPast 
                                ? "bg-neutral-200/50 dark:bg-neutral-800/40 text-muted-foreground/75 line-through decoration-muted-foreground/60 border border-neutral-300/20" 
                                : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-border/60"
                            }`}
                            title={`${dayEvent.title}`}
                          >
                            {dayEvent.title}
                          </div>
                        )}
                      </div>
                    )
                })}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
