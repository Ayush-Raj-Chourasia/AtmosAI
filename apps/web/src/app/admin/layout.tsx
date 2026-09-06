
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // Enforce minimum width to ensure desktop layout structure is preserved
    // This allows mobile users to scroll horizontally to view the full interface
    <div className="flex min-h-screen bg-slate-100 min-w-[1024px]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
