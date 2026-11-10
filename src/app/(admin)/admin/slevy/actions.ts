"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createDiscountCode(formData: FormData) {
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
    },
  });

  revalidatePath("/admin/slevy");
  redirect("/admin/slevy");
}

export async function updateDiscountCode(id: string, formData: FormData) {
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
    },
  });

  revalidatePath("/admin/slevy");
  redirect("/admin/slevy");
}

export async function deleteDiscountCode(id: string) {
  await prisma.discountCode.delete({ where: { id } });
  revalidatePath("/admin/slevy");
  redirect("/admin/slevy");
}
