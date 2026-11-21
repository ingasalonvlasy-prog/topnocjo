import Link from "next/link";
import { createCampaign } from "../actions";

export default function NewCampaignPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/newsletter/kampane"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Zpět na kampaně
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nová kampaň</h1>
      </div>

      <form action={createCampaign} className="space-y-6 max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Interní název
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="např. Zimní výprodej 2026"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Předmět emailu
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              required
              placeholder="např. Zimní výprodej — slevy až 50 %"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Obsah (HTML)
            </label>
            <textarea
              id="content"
              name="content"
              rows={6}
              placeholder="<h2>Ahoj!</h2><p>Připravili jsme pro tebe...</p>"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obsah bude zabalen do emailové šablony Qsport.cz
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            Vytvořit kampaň
          </button>
          <Link
            href="/admin/newsletter/kampane"
            className="px-6 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}
