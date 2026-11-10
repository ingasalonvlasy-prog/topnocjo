"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin-log";

export async function bulkUpdateProductStatus(ids: string[], status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
  logAdminAction("bulk_update", "product", undefined, `${ids.length} produktů → ${status}`);
  revalidatePath("/admin/produkty");
}

export async function bulkDeleteProducts(ids: string[]) {
  await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });
  logAdminAction("bulk_delete", "product", undefined, `Smazáno ${ids.length} produktů`);
  revalidatePath("/admin/produkty");
}
