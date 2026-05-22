import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ResumeOrRestartDialog } from '../components/ResumeOrRestartDialog'

describe('ResumeOrRestartDialog', () => {
  it('시나리오 제목을 메시지에 포함한다', () => {
    render(
      <ResumeOrRestartDialog
        scenarioTitle="택배 스미싱"
        onResume={() => {}}
        onRestart={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('택배 스미싱')).toBeInTheDocument()
    // 다이얼로그 자체가 dialog role로 노출되는지 확인
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('"이어하기" 버튼 클릭 시 onResume 호출', async () => {
    const onResume = vi.fn()
    render(
      <ResumeOrRestartDialog
        scenarioTitle="t"
        onResume={onResume}
        onRestart={() => {}}
        onClose={() => {}}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '이어하기' }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('"처음부터" 버튼 클릭 시 onRestart 호출', async () => {
    const onRestart = vi.fn()
    render(
      <ResumeOrRestartDialog
        scenarioTitle="t"
        onResume={() => {}}
        onRestart={onRestart}
        onClose={() => {}}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '처음부터' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('"기존 진행 기록은 사라집니다" 안내가 처음부터 옆에 표시', () => {
    render(
      <ResumeOrRestartDialog
        scenarioTitle="t"
        onResume={() => {}}
        onRestart={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText(/기존 진행 기록은 사라집니다/)).toBeInTheDocument()
  })

  it('닫기(X) 버튼 클릭 시 onClose 호출', async () => {
    const onClose = vi.fn()
    render(
      <ResumeOrRestartDialog
        scenarioTitle="t"
        onResume={() => {}}
        onRestart={() => {}}
        onClose={onClose}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ESC 키 입력 시 onClose 호출', () => {
    const onClose = vi.fn()
    render(
      <ResumeOrRestartDialog
        scenarioTitle="t"
        onResume={() => {}}
        onRestart={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('isBusy=true이면 두 버튼이 disabled', () => {
    render(
      <ResumeOrRestartDialog
        scenarioTitle="t"
        isBusy
        onResume={() => {}}
        onRestart={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: '이어하기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '처음부터' })).toBeDisabled()
  })
})
