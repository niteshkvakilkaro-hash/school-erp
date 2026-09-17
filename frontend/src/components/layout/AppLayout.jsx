import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { ImpersonationBanner } from './ImpersonationBanner';

export function AppLayout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [pwOpen, setPwOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

            <div className="lg:pl-64">
                <Topbar onMenu={() => setMenuOpen(true)} onChangePassword={() => setPwOpen(true)} />
                <ImpersonationBanner />
                <main className="px-4 py-6 lg:px-6">
                    <Outlet />
                </main>
            </div>

            <ChangePasswordModal open={pwOpen} onOpenChange={setPwOpen} />
        </div>
    );
}
