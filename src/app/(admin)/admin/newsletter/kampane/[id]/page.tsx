import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CampaignEditor } from "./CampaignEditor";
import { CampaignStats } from "./CampaignStats";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    return redirect("/admin/newsletter/kampane");
  }

  const activeCount = await prisma.newsletterSubscriber.count({
    where: { active: true },
  });

  const isDraft = campaign.status === "DRAFT";

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/newsletter/kampane"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Zpět na kampaně
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      {isDraft ? (
        <CampaignEditor campaign={campaign} activeCount={activeCount} />
      ) : (
        <CampaignStats campaign={campaign} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Koncept", color: "bg-gray-100 text-gray-700" },
    SCHEDULED: { label: "Naplánováno", color: "bg-blue-100 text-blue-700" },
    SENT: { label: "Odesláno", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Zrušeno", color: "bg-red-100 text-red-700" },
  };
  const st = map[status] || map.DRAFT;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}
    >
      {st.label}
    </span>
  );
}
