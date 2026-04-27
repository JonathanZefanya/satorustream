interface CardSkeletonProps {
  count?: number
}

export const CardSkeleton = ({ count = 12 }: CardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={`card-skeleton-${index}`} className="animate-pulse">
          <div className="aspect-[3/4] rounded-xl bg-slate-200" />
          <div className="mt-3 h-4 w-11/12 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-7/12 rounded bg-slate-200" />
        </div>
      ))}
    </>
  )
}

export const DetailSkeleton = () => {
  return (
    <div className="grid animate-pulse gap-6 md:grid-cols-[minmax(220px,280px)_1fr]">
      <div className="aspect-[3/4] rounded-2xl bg-slate-200" />
      <div className="space-y-4">
        <div className="h-7 w-10/12 rounded bg-slate-200" />
        <div className="h-5 w-6/12 rounded bg-slate-200" />
        <div className="h-20 rounded-xl bg-slate-200" />
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={`detail-episode-skeleton-${index}`} className="h-11 rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    </div>
  )
}