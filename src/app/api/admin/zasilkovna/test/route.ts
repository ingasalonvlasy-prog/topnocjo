import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/zasilkovna";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
