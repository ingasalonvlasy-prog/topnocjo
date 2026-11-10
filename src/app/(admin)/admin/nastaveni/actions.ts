"use server";

import { setSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export async function saveStoreSettings(formData: FormData) {
  const keys = [
    "store_name",
    "store_ico",
    "store_dic",
    "store_address",
    "store_phone",
    "store_email",
  ];

  for (const key of keys) {
    const value = (formData.get(key) as string)?.trim() ?? "";
    if (value) {
      await setSetting(key, value);
    }
  }

  revalidatePath("/admin/nastaveni");
}

export async function saveEmailSettings(formData: FormData) {
  const senderEmail = (formData.get("email_sender") as string)?.trim() ?? "";
  if (senderEmail) {
    await setSetting("email_sender", senderEmail);
  }

  revalidatePath("/admin/nastaveni");
}

export async function saveSocialSettings(formData: FormData) {
  const keys = ["social_instagram", "social_facebook", "logo_url"];
  for (const key of keys) {
    const value = (formData.get(key) as string)?.trim() ?? "";
    await setSetting(key, value);
  }
  revalidatePath("/admin/nastaveni");
}

export async function saveSeoSettings(formData: FormData) {
  const keys = ["seo_title_template", "seo_description"];
  for (const key of keys) {
    const value = (formData.get(key) as string)?.trim() ?? "";
    await setSetting(key, value);
  }
  revalidatePath("/admin/nastaveni");
}
