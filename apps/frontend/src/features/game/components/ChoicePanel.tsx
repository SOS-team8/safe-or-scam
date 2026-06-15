import { useEffect } from 'react'

import type { Choice } from '../types'

type ChoicePanelProps = {
  choices: Choice[]
  onChoose: (choiceId: string) => void
  disabled?: boolean
}

export function ChoicePanel({ choices, onChoose, disabled = false }: ChoicePanelProps) {
  useEffect(() => {
    if (disabled || choices.length === 0) return
    const handler = (event: KeyboardEvent) => {
      const digit = Number.parseInt(event.key, 10)
      if (!Number.isFinite(digit)) return
      const idx = digit - 1
      if (idx < 0 || idx >= choices.length) return
      const choice = choices[idx]
      if (choice) onChoose(choice.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [choices, disabled, onChoose])

  if (choices.length === 0) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="선택지"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {choices.map((choice, idx) => (
        <button
          key={choice.id}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(choice.id)}
          className="min-h-16 rounded-lg border border-white/8 bg-sos-inset px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-500"
        >
          <span className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-300"
            >
              {idx + 1}
            </span>
            <span className="leading-6">{choice.text}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
