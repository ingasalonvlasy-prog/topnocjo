import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const newOrderCount = await prisma.order.count({ where: { status: "NEW" } });

  return (
    <>
      <AdminSidebar newOrderCount={newOrderCount} />
      <div className="lg:ml-60 min-h-screen bg-gray-50">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </>
  );
}
