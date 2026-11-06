export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nastavení</h1>

      <div className="space-y-6">
        {/* Store info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informace o e-shopu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Název e-shopu</label>
              <input
                defaultValue="Qsport.cz"
                disabled
                className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                defaultValue="info@qsport.cz"
                disabled
                className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                defaultValue="+420 123 456 789"
                disabled
                className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Měna</label>
              <input
                defaultValue="CZK"
                disabled
                className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">Editace nastavení bude dostupná v další verzi. Zatím se nastavení mění přes konfigurační soubory.</p>
        </div>

        {/* Technical info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Technické informace</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Framework</dt>
              <dd className="font-medium text-gray-900">Next.js 16</dd>
            </div>
            <div>
              <dt className="text-gray-500">Databáze</dt>
              <dd className="font-medium text-gray-900">SQLite (Prisma 7)</dd>
            </div>
            <div>
              <dt className="text-gray-500">Prostředí</dt>
              <dd className="font-medium text-gray-900">Localhost (dev)</dd>
            </div>
            <div>
              <dt className="text-gray-500">Port</dt>
              <dd className="font-medium text-gray-900">9999</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
