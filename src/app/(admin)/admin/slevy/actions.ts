"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function createDiscountCode(formData: FormData) {
  await requireAdmin();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const type = formData.get("type") as string;
  const value = parseInt(formData.get("value") as string, 10);
  const minOrderAmount = formData.get("minOrderAmount")
    ? parseInt(formData.get("minOrderAmount") as string, 10) * 100
    : null;
  const usageLimit = formData.get("usageLimit")
    ? parseInt(formData.get("usageLimit") as string, 10)
    : null;
  const validFrom = formData.get("validFrom")
    ? new Date(formData.get("validFrom") as string)
    : null;
  const validTo = formData.get("validTo")
    ? new Date(formData.get("validTo") as string)
    : null;

  const restrictCategoriesRaw = formData.get("restrictCategories") as string;
  const restrictCategories = restrictCategoriesRaw?.trim()
    ? JSON.stringify(restrictCategoriesRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const restrictBrandsRaw = formData.get("restrictBrands") as string;
  const restrictBrands = restrictBrandsRaw?.trim()
    ? JSON.stringify(restrictBrandsRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  if (!code || !type || isNaN(value) || value <= 0) {
    throw new Error("Vyplňte všechna povinná pole.");
  }

  // For percentage, value is stored as-is (1-100)
  // For fixed, convert from CZK to hellers
  const storedValue = type === "fixed" ? value * 100 : value;

  const existing = await prisma.discountCode.findUnique({ where: { code } });
  if (existing) {
    throw new Error(`Kód "${code}" již existuje.`);
  }

  await prisma.discountCode.create({
    data: {
      code,
      type,
      value: storedValue,
      minOrderAmount,
      usageLimit,
      validFrom,
      validTo,
      restrictCategories,
      restrictBrands,
    },
  });

  revalidatePath("/admin/slevy");
  redirect("/admin/slevy");
}

export async function updateDiscountCode(id: string, formData: FormData) {
  await requireAdmin();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const type = formData.get("type") as string;
  const value = parseInt(formData.get("value") as string, 10);
  const minOrderAmount = formData.get("minOrderAmount")
    ? parseInt(formData.get("minOrderAmount") as string, 10) * 100
    : null;
  const usageLimit = formData.get("usageLimit")
    ? parseInt(formData.get("usageLimit") as string, 10)
    : null;
  const validFrom = formData.get("validFrom")
    ? new Date(formData.get("validFrom") as string)
    : null;
  const validTo = formData.get("validTo")
    ? new Date(formData.get("validTo") as string)
    : null;
  const active = formData.get("active") === "on";

  const restrictCategoriesRaw = formData.get("restrictCategories") as string;
  const restrictCategories = restrictCategoriesRaw?.trim()
    ? JSON.stringify(restrictCategoriesRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const restrictBrandsRaw = formData.get("restrictBrands") as string;
  const restrictBrands = restrictBrandsRaw?.trim()
    ? JSON.stringify(restrictBrandsRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  if (!code || !type || isNaN(value) || value <= 0) {
    throw new Error("Vyplňte všechna povinná pole.");
  }

  const storedValue = type === "fixed" ? value * 100 : value;

  // Check uniqueness (exclude current)
  const existing = await prisma.discountCode.findFirst({
    where: { code, id: { not: id } },
  });
  if (existing) {
    throw new Error(`Kód "${code}" již existuje.`);
  }

  await prisma.discountCode.update({
    where: { id },
    data: {
      code,
      type,
      value: storedValue,
      minOrderAmount,
      usageLimit,
      validFrom,
      validTo,
      active,
      restrictCategories,
      restrictBrands,
    },
  });

  revalidatePath("/admin/slevy");
  redirect("/admin/slevy");
}

export async function deleteDiscountCode(id: string) {
  await requireAdmin();
  await prisma.discountCode.delete({ where: { id } });
  revalidatePath("/admin/slevy");
  redirect("/admin/slevy");
}
