/**
 * Pinpoint regression: React 19 StrictMode dev 환경에서 useEffect cleanup이
 * mount 직후 1회 실행되어 store snapshot을 null로 만든다는 것을 증명하는 테스트.
 *
 * 이 동작 때문에 GameContainer가 이전에 두었던
 *   `useEffect(() => () => resetStore(), [resetStore])`
 * 패턴이 prologue snapshot을 mount 직후 즉시 wipe하여 PrologueScreen이
 * 표시되지 못하는 회귀를 일으켰다.
 *
 * 현재 GameContainer는 해당 패턴을 사용하지 않으나, 이 테스트는 React 19 +
 * StrictMode의 setup→cleanup→setup 동작 자체를 회귀 방지로 잠가둔다.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { useGameStore } from '../store'
import type { ScenarioNode, GameSessionResponse } from '../types'

const rootNode: ScenarioNode = {
  id: 'n0',
  type: 'narrative',
  text: 't',
  choices: [],
  educational_content: null,
  image_url: null,
  image_prompt: null,
  depth: 0,
  parent_node_id: null,
  parent_choice_id: null,
  ending_category: null,
}

const session: GameSessionResponse = {
  session_id: 'sess1',
  scenario_id: 'scn1',
  user_id: 1,
  current_node_id: 'n0',
  current_node: rootNode,
  resources: { trust: 3, money: 3, awareness: 1 },
  status: 'playing',
  dangerous_count: 0,
  choices_history: [],
  started_at: '2026-05-18T00:00:00Z',
  completed_at: null,
}

// GameContainer의 cleanup useEffect만 분리해서 정확히 검증
function ResetOnUnmount() {
  const resetStore = useGameStore((s) => s.reset)
  useEffect(() => () => resetStore(), [resetStore])
  return null
}

describe('useEffect(() => () => resetStore(), []) under StrictMode', () => {
  it('StrictMode dev double-effect calls cleanup ONCE → snapshot becomes null', () => {
    useGameStore.getState().hydrateFromSession(session, {
      prologue: '프롤로그 텍스트가 있습니다.',
    })
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')

    render(
      <StrictMode>
        <ResetOnUnmount />
      </StrictMode>,
    )

    // StrictMode가 effect setup → cleanup → setup을 실행하면 snapshot이 null이 됨
    const after = useGameStore.getState().snapshot
    console.log('[debug] snapshot after StrictMode mount:', after)
    expect(after).toBeNull()
  })
})
