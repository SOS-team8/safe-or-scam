import { Navigate, useParams } from 'react-router-dom'

import { GameContainer } from '../components/GameContainer'

export function GamePlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  if (!sessionId) {
    return <Navigate to="/lobby" replace />
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-6 sm:py-10">
      <GameContainer sessionId={sessionId} />
    </section>
  )
}
