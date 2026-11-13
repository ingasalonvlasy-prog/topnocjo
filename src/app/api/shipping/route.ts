import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const methods = await prisma.shippingMethod.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      price: true,
      freeFrom: true,
      description: true,
      config: true,
    },
  });

  const result = methods.map(({ config, ...m }) => {
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(config || "{}"); } catch { /* noop */ }

    return {
      ...m,
      carrier: (parsed.carrier as string) || undefined,
      carrierConfig: m.type === "pickup_point" ? {
        apiKey: (parsed.apiKey as string) || undefined,
        widgetType: (parsed.widgetType as string) || undefined,
      } : undefined,
    };
  });

  return NextResponse.json(result);
}
