/** 시계열 포인트(시간 오름차순)에 대해, x는 인덱스 균등 배치와 동일하게 맞춤 */

export type TsPoint = { timestamp: number }

export type MonthlyXTick = { x: number; label: string }

function closestIndexByTime(sorted: TsPoint[], targetMs: number): number {
  let best = 0
  let bestDiff = Infinity
  for (let i = 0; i < sorted.length; i++) {
    const d = Math.abs(sorted[i].timestamp - targetMs)
    if (d < bestDiff) {
      bestDiff = d
      best = i
    }
  }
  return best
}

export function monthlyXAxisTicks(
  points: TsPoint[],
  plotLeft: number,
  plotRight: number,
): MonthlyXTick[] {
  const valid = points.filter((p) => p && Number.isFinite(p.timestamp)).sort((a, b) => a.timestamp - b.timestamp)
  if (valid.length < 2) return []

  const tMin = valid[0].timestamp
  const tMax = valid[valid.length - 1].timestamp
  const n = valid.length
  const plotW = plotRight - plotLeft
  const xAt = (i: number) => plotLeft + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)

  const start = new Date(tMin)
  let y = start.getFullYear()
  let mo = start.getMonth()
  const end = new Date(tMax)
  const endY = end.getFullYear()
  const endMo = end.getMonth()

  const raw: { x: number; label: string }[] = []
  while (y < endY || (y === endY && mo <= endMo)) {
    const monthStart = new Date(y, mo, 1).getTime()
    const i = closestIndexByTime(valid, monthStart)
    const label = new Date(y, mo, 1).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
    })
    raw.push({ x: xAt(i), label })
    mo++
    if (mo > 11) {
      mo = 0
      y++
    }
  }

  const out: MonthlyXTick[] = []
  for (const r of raw) {
    if (out.length && Math.abs(out[out.length - 1].x - r.x) < 2) continue
    out.push({ x: r.x, label: r.label })
  }
  return out
}
