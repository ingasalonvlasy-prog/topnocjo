import { prisma } from "./db";

export async function logAdminAction(
  action: string,
  entity: string,
  entityId?: string,
  detail?: string,
) {
  await prisma.adminLog.create({
    data: { action, entity, entityId, detail },
  });
}
