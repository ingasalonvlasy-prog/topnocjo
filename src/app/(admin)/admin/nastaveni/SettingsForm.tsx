"use client";

import { useTransition, useState } from "react";
import {
  saveStoreSettings,
  saveEmailSettings,
  saveSocialSettings,
  saveSeoSettings,
  saveAnalyticsSettings,
} from "./actions";

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {pending ? "Ukládám..." : "Uložit"}
    </button>
  );
}

function SuccessMessage({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="text-sm text-green-600 font-medium">Uloženo</span>
  );
}

interface StoreFormProps {
  settings: Record<string, string>;
}

export function StoreSettingsForm({ settings }: StoreFormProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveStoreSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Obchod</h2>
        <div className="flex items-center gap-3">
          <SuccessMessage show={saved} />
          <SaveButton pending={pending} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Název e-shopu</label>
          <input
            name="store_name"
            defaultValue={settings.store_name || ""}
            placeholder="Qsport.cz"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IČO</label>
          <input
            name="store_ico"
            defaultValue={settings.store_ico || ""}
            placeholder="12345678"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DIČ</label>
          <input
            name="store_dic"
            defaultValue={settings.store_dic || ""}
            placeholder="CZ12345678"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input
            name="store_phone"
            defaultValue={settings.store_phone || ""}
            placeholder="+420 123 456 789"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresa</label>
          <input
            name="store_address"
            defaultValue={settings.store_address || ""}
            placeholder="Ulice 123, 110 00 Praha"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kontaktní e-mail</label>
          <input
            name="store_email"
            type="email"
            defaultValue={settings.store_email || ""}
            placeholder="info@qsport.cz"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
      </div>
    </form>
  );
}

interface EmailFormProps {
  settings: Record<string, string>;
  resendConnected: boolean;
}

export function EmailSettingsForm({ settings, resendConnected }: EmailFormProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveEmailSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Emaily</h2>
        <div className="flex items-center gap-3">
          <SuccessMessage show={saved} />
          <SaveButton pending={pending} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Odesílací e-mail</label>
          <input
            name="email_sender"
            type="email"
            defaultValue={settings.email_sender || ""}
            placeholder="objednavky@qsport.cz"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resend API</label>
          <div className="flex items-center h-10 px-3 border border-gray-200 rounded-md bg-gray-50">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-2 ${
                resendConnected ? "bg-green-500" : "bg-red-400"
              }`}
            />
            <span className="text-sm text-gray-600">
              {resendConnected ? "Připojeno" : "Nepřipojeno"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Nastavte RESEND_API_KEY v .env.local
          </p>
        </div>
      </div>
    </form>
  );
}

export function SocialSettingsForm({ settings }: StoreFormProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveSocialSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Sociální sítě &amp; Logo</h2>
        <div className="flex items-center gap-3">
          <SuccessMessage show={saved} />
          <SaveButton pending={pending} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
          <input
            name="social_instagram"
            defaultValue={settings.social_instagram || ""}
            placeholder="https://instagram.com/qsport.cz"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
          <input
            name="social_facebook"
            defaultValue={settings.social_facebook || ""}
            placeholder="https://facebook.com/qsport.cz"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input
            name="logo_url"
            defaultValue={settings.logo_url || ""}
            placeholder="/logo.svg"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Relativní cesta (/logo.svg) nebo plná URL</p>
        </div>
      </div>
    </form>
  );
}

export function SeoSettingsForm({ settings }: StoreFormProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveSeoSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">SEO výchozí hodnoty</h2>
        <div className="flex items-center gap-3">
          <SuccessMessage show={saved} />
          <SaveButton pending={pending} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title šablona</label>
          <input
            name="seo_title_template"
            defaultValue={settings.seo_title_template || ""}
            placeholder="{page} | Qsport.cz"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">{"{page}"} se nahradí názvem stránky</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Výchozí meta description</label>
          <textarea
            name="seo_description"
            rows={3}
            defaultValue={settings.seo_description || ""}
            placeholder="Sportovní vybavení od značek On, POC, Maloja, Alpina a Mizuno. Rychlé doručení, osobní přístup."
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none resize-none"
          />
        </div>
      </div>
    </form>
  );
}

export function AnalyticsSettingsForm({ settings }: StoreFormProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveAnalyticsSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Analytika</h2>
        <div className="flex items-center gap-3">
          <SuccessMessage show={saved} />
          <SaveButton pending={pending} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GA4 Measurement ID</label>
          <input
            name="ga4_measurement_id"
            defaultValue={settings.ga4_measurement_id || ""}
            placeholder="G-XXXXXXXXXX"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Z Google Analytics 4 &rarr; Admin &rarr; Data Streams</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GTM Container ID</label>
          <input
            name="gtm_container_id"
            defaultValue={settings.gtm_container_id || ""}
            placeholder="GTM-XXXXXXX"
            className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm bg-white text-gray-900 focus:border-gray-400 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Volitelné — pro budoucí GTM integraci</p>
        </div>
      </div>
    </form>
  );
}
