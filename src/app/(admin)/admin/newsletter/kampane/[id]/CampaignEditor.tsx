"use client";

import { useState, useTransition } from "react";
import {
  updateCampaign,
  sendTestEmail,
  sendCampaign,
  deleteCampaign,
  duplicateCampaign,
} from "../actions";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: string;
}

interface Props {
  campaign: Campaign;
  activeCount: number;
}

export function CampaignEditor({ campaign, activeCount }: Props) {
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [content, setContent] = useState(campaign.content);
  const [showPreview, setShowPreview] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const fd = new FormData();
    fd.set("id", campaign.id);
    fd.set("name", name);
    fd.set("subject", subject);
    fd.set("content", content);
    startTransition(async () => {
      await updateCampaign(fd);
      setTestResult("Uloženo");
      setTimeout(() => setTestResult(null), 2000);
    });
  }

  function handleTestEmail() {
    const fd = new FormData();
    fd.set("id", campaign.id);
    // Save first, then send test
    const saveFd = new FormData();
    saveFd.set("id", campaign.id);
    saveFd.set("name", name);
    saveFd.set("subject", subject);
    saveFd.set("content", content);
    startTransition(async () => {
      await updateCampaign(saveFd);
      await sendTestEmail(fd);
      setTestResult("Testovací email odeslán!");
      setTimeout(() => setTestResult(null), 4000);
    });
  }

  function handleSend() {
    const saveFd = new FormData();
    saveFd.set("id", campaign.id);
    saveFd.set("name", name);
    saveFd.set("subject", subject);
    saveFd.set("content", content);
    const sendFd = new FormData();
    sendFd.set("id", campaign.id);
    if (showSchedule && scheduledAt) {
      sendFd.set("scheduledAt", scheduledAt);
    }
    startTransition(async () => {
      await updateCampaign(saveFd);
      await sendCampaign(sendFd);
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("id", campaign.id);
    startTransition(() => deleteCampaign(fd));
  }

  function handleDuplicate() {
    const fd = new FormData();
    fd.set("id", campaign.id);
    startTransition(() => duplicateCampaign(fd));
  }

  const previewHtml = `
    <div style="background:#F3F3F0;padding:20px;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;">
        <div style="background:#0B1727;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <span style="color:#CEFF2F;font-size:24px;font-weight:bold;letter-spacing:1px;">Qsport.cz</span>
        </div>
        <div style="background:#fff;padding:32px 28px;border-radius:0 0 8px 8px;">
          ${content}
        </div>
        <div style="padding:20px;text-align:center;">
          <p style="color:#666;font-size:12px;margin:0 0 4px;">Qsport.cz — Sportovní vybavení</p>
          <p style="color:#999;font-size:11px;margin:0 0 4px;">info@qsport.cz</p>
          <p style="color:#999;font-size:11px;margin:0;"><a href="#" style="color:#999;">Odhlásit z odběru</a></p>
        </div>
      </div>
    </div>
  `;

  return (
    <div className="space-y-6">
      {/* Editor */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700"
            >
              Obsah (HTML)
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showPreview ? "Skrýt náhled" : "Zobrazit náhled"}
            </button>
          </div>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-500 focus:outline-none"
            placeholder="<h2>Ahoj!</h2><p>Připravili jsme pro tebe...</p>"
          />
          <p className="text-xs text-gray-400 mt-1">
            HTML bude zabaleno do emailové šablony s hlavičkou a patičkou
            Qsport.cz
          </p>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">
              Náhled emailu
            </h3>
          </div>
          <div className="p-0">
            <iframe
              srcDoc={previewHtml}
              title="Náhled"
              className="w-full border-0"
              style={{ minHeight: "500px" }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">
            Příjemci: <strong>{activeCount}</strong> aktivních odběratelů
          </span>
        </div>

        {testResult && (
          <div className="mb-4 px-3 py-2 rounded-md bg-green-50 text-green-700 text-sm">
            {testResult}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Uložit
          </button>
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Odeslat testovací email
          </button>

          {/* Send / Schedule */}
          {!showSendConfirm ? (
            <button
              type="button"
              onClick={() => setShowSendConfirm(true)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Odeslat kampaň
            </button>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-sm">
                <p className="font-medium text-yellow-800">
                  Opravdu odeslat{showSchedule ? " naplánovat" : ""}?
                </p>
                <p className="text-yellow-700 text-xs mt-0.5">
                  Kampaň bude odeslána {activeCount} odběratelům.
                </p>

                <label className="flex items-center gap-2 mt-2 text-xs text-yellow-700">
                  <input
                    type="checkbox"
                    checked={showSchedule}
                    onChange={(e) => setShowSchedule(e.target.checked)}
                  />
                  Naplánovat na konkrétní čas
                </label>

                {showSchedule && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  />
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isPending || (showSchedule && !scheduledAt)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {showSchedule ? "Naplánovat" : "Ano, odeslat"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSendConfirm(false);
                      setShowSchedule(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Secondary actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={isPending}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Duplikovat
          </button>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Smazat
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-700 font-medium hover:text-red-900 disabled:opacity-50"
              >
                Potvrdit smazání
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Zrušit
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
