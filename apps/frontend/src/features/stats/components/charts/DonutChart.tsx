type DonutChartProps = {
  /** 발견 수(분자). */
  value: number
  /** 전체 수(분모). 0 이면 0% 로 그린다. */
  max: number
  /** 도넛 아래 라벨 (예: "결말 수집"). */
  label: string
}

const SIZE = 120
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** 발견/전체 수집률용 도넛 차트(손수 SVG, 의존성 없음). 중앙에 N/M + %. */
export function DonutChart({ value, max, label }: DonutChartProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0
  const dash = (pct / 100) * CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`${label} ${value}/${max} (${pct}%)`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="text-slate-800"
            stroke="currentColor"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            className="text-emerald-400 transition-[stroke-dasharray]"
            stroke="currentColor"
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-sos-strong">
            {value}/{max}
          </span>
          <span className="text-xs tabular-nums text-emerald-200">{pct}%</span>
        </span>
      </div>
      <span className="text-[13px] font-medium text-sos-muted">{label}</span>
    </div>
  )
}
