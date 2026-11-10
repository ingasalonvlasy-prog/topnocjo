export default function CategoryLoading() {
  return (
    <>
      {/* Hero banner skeleton */}
      <div className="bg-navy">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="h-5 w-48 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-9 w-64 bg-white/10 rounded animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar skeleton — desktop only */}
          <div className="hidden lg:block w-[220px] shrink-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mb-6">
                <div className="h-4 w-20 bg-wash rounded animate-pulse mb-3" />
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 w-full bg-wash rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="h-4 w-24 bg-wash rounded animate-pulse" />
              <div className="h-4 w-32 bg-wash rounded animate-pulse" />
            </div>

            {/* Product cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[10px] overflow-hidden">
                  <div className="aspect-[4/5] bg-wash rounded-[10px] animate-pulse" />
                  <div className="pt-3 pb-1 px-1">
                    <div className="h-3 w-24 bg-wash rounded animate-pulse mb-1" />
                    <div className="h-4 w-full bg-wash rounded animate-pulse mb-2" />
                    <div className="h-5 w-16 bg-wash rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
