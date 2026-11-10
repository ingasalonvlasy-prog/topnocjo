import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/zasilkovna";

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json();

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { valid: false, error: "API klíč je povinný" },
      { status: 400 },
    );
  }

  const result = await validateApiKey(apiKey);
  return NextResponse.json(result);
}
