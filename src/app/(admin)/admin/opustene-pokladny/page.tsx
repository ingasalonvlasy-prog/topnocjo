export default function AbandonedCheckoutsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Opuštěné pokladny</h1>
        <p className="text-sm text-gray-500 mt-1">
          Přehled neukončených objednávek a možnost kontaktovat zákazníky
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Připravujeme</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Zde se budou zobrazovat košíky, které zákazníci opustili bez dokončení objednávky.
          Budete moci odesílat upomínkové e-maily a sledovat konverzní poměr.
        </p>
      </div>
    </div>
  );
}
