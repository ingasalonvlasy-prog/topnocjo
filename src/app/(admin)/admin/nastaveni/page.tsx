import { prisma } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import Link from "next/link";
import { StoreSettingsForm, EmailSettingsForm, SocialSettingsForm, SeoSettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const [
    settings,
    shippingMethods,
    totalSubscribers,
    activeSubscribers,
    recentSubscribers,
  ] = await Promise.all([
    getAllSettings(),
    prisma.shippingMethod.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { active: true } }),
    prisma.newsletterSubscriber.findMany({
      where: { active: true },
      orderBy: { subscribedAt: "desc" },
      take: 10,
    }),
  ]);

  const resendConnected = !!process.env.RESEND_API_KEY;
  const comgateMerchant = process.env.COMGATE_MERCHANT || "";
  const comgateConnected = !!comgateMerchant;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nastavení</h1>

      <div className="space-y-6">
        {/* Store info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <StoreSettingsForm settings={settings} />
        </div>

        {/* Emails */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <EmailSettingsForm
            settings={settings}
            resendConnected={resendConnected}
          />
        </div>

        {/* Social & Logo */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <SocialSettingsForm settings={settings} />
        </div>

        {/* SEO */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <SeoSettingsForm settings={settings} />
        </div>

        {/* Payments */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platby</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comgate Merchant ID
              </label>
              <div className="flex items-center h-10 px-3 border border-gray-200 rounded-md bg-gray-50">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    comgateConnected ? "bg-green-500" : "bg-red-400"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {comgateConnected
                    ? `Připojeno (${comgateMerchant})`
                    : "Nepřipojeno"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Nastavte COMGATE_MERCHANT a COMGATE_SECRET v .env.local
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Testovací režim
              </label>
              <div className="flex items-center h-10 px-3 border border-gray-200 rounded-md bg-gray-50">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    process.env.COMGATE_TEST === "true"
                      ? "bg-amber-400"
                      : "bg-green-500"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {process.env.COMGATE_TEST === "true"
                    ? "Testovací režim"
                    : "Produkční režim"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Doprava</h2>
            <Link
              href="/admin/doprava"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Spravovat &rarr;
            </Link>
          </div>
          {shippingMethods.length === 0 ? (
            <p className="text-sm text-gray-500">
              Žádné aktivní dopravní metody.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {shippingMethods.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {m.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {m.type === "pickup_point"
                        ? "Výdejní místo"
                        : m.type === "personal"
                          ? "Osobní odběr"
                          : "Na adresu"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {m.price === 0
                      ? "Zdarma"
                      : `${(m.price / 100).toLocaleString("cs-CZ")} Kč`}
                    {m.freeFrom && (
                      <span className="text-xs text-gray-400 ml-1">
                        (zdarma od{" "}
                        {(m.freeFrom / 100).toLocaleString("cs-CZ")} Kč)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Newsletter
          </h2>
          <div className="flex gap-6 mb-4">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {activeSubscribers}
              </span>
              <span className="text-sm text-gray-500 ml-1">aktivních</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-400">
                {totalSubscribers}
              </span>
              <span className="text-sm text-gray-500 ml-1">celkem</span>
            </div>
          </div>
          {recentSubscribers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Poslední odběratelé
              </h3>
              <div className="space-y-1">
                {recentSubscribers.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-900">{sub.email}</span>
                    <span className="text-gray-400 text-xs">
                      {sub.subscribedAt.toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Technical info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Technické informace
          </h2>
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
