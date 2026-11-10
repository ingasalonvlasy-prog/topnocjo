import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiKeyFromConfig } from "@/lib/zasilkovna";

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

  const result = methods.map(({ config, ...m }) => ({
    ...m,
    packetaApiKey:
      m.type === "pickup_point" ? getApiKeyFromConfig(config) : undefined,
  }));

  return NextResponse.json(result);
}
