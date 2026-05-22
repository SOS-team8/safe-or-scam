import { useEffect, useMemo, useState } from 'react'

import type { Resources } from '../types'

type ResourceBarProps = {
  resources: Resources
  previousResources?: Resources | null
}

type ResourceKey = keyof Resources

type ResourceMeta = {
  key: ResourceKey
  label: string
  ariaLabel: string
  baseColor: string
}

const RESOURCE_META: ResourceMeta[] = [
  { key: 'trust', label: '신뢰', ariaLabel: '신뢰', baseColor: 'bg-cyan-400' },
  { key: 'money', label: '자산', ariaLabel: '자산', baseColor: 'bg-emerald-400' },
  { key: 'awareness', label: '경계심', ariaLabel: '경계심', baseColor: 'bg-amber-400' },
]

const MAX = 5
const FLASH_MS = 600

type FlashTone = 'up' | 'down' | null

const computeFlash = (
  current: number,
  previous: number | undefined,
): FlashTone => {
  if (previous === undefined || previous === current) return null
  return current > previous ? 'up' : 'down'
}

const emptyFlash: Record<ResourceKey, FlashTone> = {
  trust: null,
  money: null,
  awareness: null,
}

const buildFlashSnapshot = (
  resources: Resources,
  previousResources: Resources | null | undefined,
): Record<ResourceKey, FlashTone> => {
  if (!previousResources) return emptyFlash
  return {
    trust: computeFlash(resources.trust, previousResources.trust),
    money: computeFlash(resources.money, previousResources.money),
    awareness: computeFlash(resources.awareness, previousResources.awareness),
  }
}

const flashKey = (resources: Resources) =>
  `${resources.trust}.${resources.money}.${resources.awareness}`

export function ResourceBar({ resources, previousResources }: ResourceBarProps) {
  // Derive an identity for the current resource snapshot. When the timer fires
  // and we record this identity as "cleared", we suppress the flash without
  // racing the next render.
  const currentKey = flashKey(resources)
  const [clearedKey, setClearedKey] = useState<string | null>(null)

  const flash = useMemo(() => {
    if (clearedKey === currentKey) return emptyFlash
    return buildFlashSnapshot(resources, previousResources)
  }, [clearedKey, currentKey, resources, previousResources])

  useEffect(() => {
    if (!previousResources) return
    const snapshot = buildFlashSnapshot(resources, previousResources)
    if (!Object.values(snapshot).some((tone) => tone !== null)) return
    const timer = window.setTimeout(() => setClearedKey(currentKey), FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [resources, previousResources, currentKey])

  return (
    <div
      role="group"
      aria-label="자원 현황"
      className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-3"
    >
      {RESOURCE_META.map(({ key, label, ariaLabel, baseColor }) => {
        const value = resources[key]
        const percent = Math.round((value / MAX) * 100)
        const tone = flash[key]
        const flashClass =
          tone === 'up'
            ? 'ring-2 ring-emerald-300/60'
            : tone === 'down'
              ? 'ring-2 ring-red-400/60'
              : ''
        return (
          <div key={key} aria-label={ariaLabel} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">{label}</span>
              <span
                aria-label={`${label} 수치`}
                className="font-semibold text-slate-100 tabular-nums"
              >
                {value} / {MAX}
              </span>
            </div>
            <div
              className={`h-2 overflow-hidden rounded-full bg-slate-800 transition ${flashClass}`}
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full ${baseColor} transition-all`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
