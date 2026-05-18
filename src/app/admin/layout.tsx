import { AdminSidebar } from './_components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex">
            <AdminSidebar />
            {/* Content area pushed right of sidebar */}
            <div className="flex-1 ml-60 min-h-screen overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
