import { useState } from 'react'

type NarrationPanelProps = {
  text: string
  imageUrl?: string | null
}

export function NarrationPanel({ text, imageUrl }: NarrationPanelProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !imageFailed

  return (
    <article
      aria-label="시나리오 나레이션"
      className="space-y-5 rounded-lg border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20"
    >
      {showImage ? (
        <div className="overflow-hidden rounded-md border border-white/10 bg-slate-900">
          <img
            src={imageUrl ?? undefined}
            alt=""
            aria-hidden="true"
            onError={() => setImageFailed(true)}
            className="block h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="space-y-3 text-base leading-7 text-slate-200">
        {text.split(/\n+/).map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}
