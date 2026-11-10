export default function GrowthPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Růst</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kampaně, automatizace a SEO doporučení pro růst e-shopu
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Připravujeme</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Zde budou nástroje pro růst vašeho e-shopu: marketingové kampaně,
          automatizace e-mailů, SEO doporučení a analýza konverzního trychtýře.
        </p>
      </div>
    </div>
  );
}
