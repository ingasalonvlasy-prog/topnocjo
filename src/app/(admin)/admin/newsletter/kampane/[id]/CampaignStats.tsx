"use client";

import { useTransition } from "react";
import { duplicateCampaign } from "../actions";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: string;
  resendId: string | null;
  sentAt: Date | null;
  scheduledAt: Date | null;
  recipientCount: number;
  createdAt: Date;
}

interface Props {
  campaign: Campaign;
}

export function CampaignStats({ campaign }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    const fd = new FormData();
    fd.set("id", campaign.id);
    startTransition(() => duplicateCampaign(fd));
  }

  const dateStr = campaign.sentAt
    ? new Date(campaign.sentAt).toLocaleDateString("cs-CZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : campaign.scheduledAt
      ? `Naplánováno: ${new Date(campaign.scheduledAt).toLocaleDateString("cs-CZ", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "—";

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {campaign.recipientCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">Odesláno</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500 mt-1">Otevřeno</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500 mt-1">Kliknuto</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500 mt-1">Bounce</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Statistiky otevření a kliknutí budou dostupné z Resend dashboardu.
          {campaign.resendId && (
            <span className="ml-1">
              Resend ID: <code className="text-gray-500">{campaign.resendId}</code>
            </span>
          )}
        </p>
      </div>

      {/* Campaign details */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Detail kampaně
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Předmět</dt>
            <dd className="text-gray-900 font-medium mt-0.5">
              {campaign.subject}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Datum</dt>
            <dd className="text-gray-900 mt-0.5">{dateStr}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Příjemců</dt>
            <dd className="text-gray-900 mt-0.5">{campaign.recipientCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Vytvořeno</dt>
            <dd className="text-gray-900 mt-0.5">
              {new Date(campaign.createdAt).toLocaleDateString("cs-CZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Content preview */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Obsah emailu</h3>
        </div>
        <div className="p-0">
          <iframe
            srcDoc={`
              <div style="background:#F3F3F0;padding:20px;font-family:Arial,sans-serif;">
                <div style="max-width:600px;margin:0 auto;">
                  <div style="background:#0B1727;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
                    <span style="color:#CEFF2F;font-size:24px;font-weight:bold;">Qsport.cz</span>
                  </div>
                  <div style="background:#fff;padding:32px 28px;border-radius:0 0 8px 8px;">
                    ${campaign.content}
                  </div>
                </div>
              </div>
            `}
            title="Náhled"
            className="w-full border-0"
            style={{ minHeight: "400px" }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Duplikovat jako novou kampaň
        </button>
      </div>
    </div>
  );
}
