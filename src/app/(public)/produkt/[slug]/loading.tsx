export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="h-4 w-16 bg-wash rounded animate-pulse" />
        <div className="h-4 w-4 bg-wash rounded animate-pulse" />
        <div className="h-4 w-24 bg-wash rounded animate-pulse" />
        <div className="h-4 w-4 bg-wash rounded animate-pulse" />
        <div className="h-4 w-32 bg-wash rounded animate-pulse" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image placeholder */}
        <div className="aspect-[4/5] bg-wash rounded-[12px] animate-pulse" />

        {/* Product info skeleton */}
        <div className="flex flex-col gap-4 py-2">
          {/* Brand */}
          <div className="h-4 w-20 bg-wash rounded animate-pulse" />
          {/* Name */}
          <div className="h-8 w-3/4 bg-wash rounded animate-pulse" />
          {/* Price */}
          <div className="h-7 w-28 bg-wash rounded animate-pulse" />
          {/* Availability */}
          <div className="h-4 w-40 bg-wash rounded animate-pulse" />

          {/* Size label */}
          <div className="h-4 w-36 bg-wash rounded animate-pulse mt-4" />
          {/* Size chips */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-[52px] h-[44px] bg-wash rounded-[8px] animate-pulse" />
            ))}
          </div>

          {/* CTA button */}
          <div className="h-[52px] w-full bg-wash rounded-[var(--radius-pill)] animate-pulse mt-4" />

          {/* Description lines */}
          <div className="flex flex-col gap-2 mt-6">
            <div className="h-4 w-full bg-wash rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-wash rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-wash rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
