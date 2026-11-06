export default function AdminDiscountsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Slevové kódy</h1>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-600 mb-2">Slevové kódy - připravuje se</h2>
        <p className="text-sm text-gray-400">Modul slev bude dostupný ve Fázi 2 po přidání košíku a objednávek.</p>
      </div>
    </div>
  );
}
