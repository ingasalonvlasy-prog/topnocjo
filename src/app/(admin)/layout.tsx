import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSidebar />
      <div className="lg:ml-60 min-h-screen bg-gray-50">
        <div className="p-6 lg:p-8">{children}</div>
      </div>
    </>
  );
}
