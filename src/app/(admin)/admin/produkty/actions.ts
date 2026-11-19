"use server";

import { prisma } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";
import { logAdminAction } from "@/lib/admin-log";
import { requireAdmin } from "@/lib/auth";

export async function bulkUpdateProductStatus(ids: string[], status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  await requireAdmin();
  await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
  logAdminAction("bulk_update", "product", undefined, `${ids.length} produktů → ${status}`);
  updateTag("product");
  updateTag("homepage-bestsellers");
  revalidatePath("/admin/produkty");
}

export async function bulkDeleteProducts(ids: string[]) {
  await requireAdmin();
  await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });
  logAdminAction("bulk_delete", "product", undefined, `Smazáno ${ids.length} produktů`);
  updateTag("product");
  updateTag("homepage-bestsellers");
  revalidatePath("/admin/produkty");
}
