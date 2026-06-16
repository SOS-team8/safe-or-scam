type RadialGaugeProps = {
  /** 0–100 사이 진행 값. 범위를 벗어나면 clamp 된다. */
  value: number
  /** 게이지 중앙에 크게 표시할 텍스트 (예: "83%"). */
  valueText: string
  /** 게이지 아래 라벨 (예: "완주율"). */
  label: string
}

const SIZE = 104
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** 완주율 등 0–100% 지표용 원형 게이지(손수 SVG, 의존성 없음). */
export function RadialGauge({ value, valueText, label }: RadialGaugeProps) {
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`${label} ${valueText}`}
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
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums text-sos-strong">
          {valueText}
        </span>
      </div>
      <span className="text-[13px] font-medium text-sos-muted">{label}</span>
    </div>
  )
}
