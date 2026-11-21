import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";

async function getResend() {
  const { Resend } = await import("resend");
  return new Resend(process.env.RESEND_API_KEY);
}

async function getAudienceId(): Promise<string | null> {
  return getSetting("resend_audience_id");
}

/**
 * Sync a subscriber to Resend contacts.
 * Creates or updates the contact in Resend and stores the contactId in DB.
 */
export async function syncContactToResend(email: string, active: boolean) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[newsletter-sync] RESEND_API_KEY not set, skipping sync");
    return;
  }

  const audienceId = await getAudienceId();
  if (!audienceId) {
    console.warn("[newsletter-sync] resend_audience_id not set, skipping sync");
    return;
  }

  const resend = await getResend();
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  if (!subscriber) return;

  try {
    if (subscriber.resendContactId) {
      // Update existing contact
      await resend.contacts.update({
        audienceId,
        id: subscriber.resendContactId,
        unsubscribed: !active,
      });
    } else {
      // Create new contact
      const { data } = await resend.contacts.create({
        audienceId,
        email,
        unsubscribed: !active,
      });
      if (data?.id) {
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: { resendContactId: data.id },
        });
      }
    }
  } catch (error) {
    console.error("[newsletter-sync] Failed to sync contact:", email, error);
  }
}

/**
 * Remove a contact from Resend.
 */
export async function removeContactFromResend(resendContactId: string) {
  if (!process.env.RESEND_API_KEY) return;

  const audienceId = await getAudienceId();
  if (!audienceId || !resendContactId) return;

  const resend = await getResend();
  try {
    await resend.contacts.remove({
      audienceId,
      id: resendContactId,
    });
  } catch (error) {
    console.error("[newsletter-sync] Failed to remove contact:", error);
  }
}

/**
 * Initial sync: push all active subscribers to Resend.
 * Returns count of synced contacts.
 */
export async function syncAllSubscribersToResend(): Promise<number> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not set");
  }

  const audienceId = await getAudienceId();
  if (!audienceId) {
    throw new Error("resend_audience_id not set in Settings");
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { active: true, resendContactId: null },
  });

  const resend = await getResend();
  let synced = 0;

  for (const sub of subscribers) {
    try {
      const { data } = await resend.contacts.create({
        audienceId,
        email: sub.email,
        unsubscribed: false,
      });
      if (data?.id) {
        await prisma.newsletterSubscriber.update({
          where: { id: sub.id },
          data: { resendContactId: data.id },
        });
        synced++;
      }
    } catch (error) {
      console.error("[newsletter-sync] Failed to sync:", sub.email, error);
    }
  }

  return synced;
}
