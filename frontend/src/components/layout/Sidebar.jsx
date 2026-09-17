import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    School,
    Layers3,
    BookOpen,
    ShieldCheck,
    UserCog,
    Building2,
    CreditCard,
    Settings,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

// Har item apni permission maangta hai - permission nahi to menu me dikhega hi nahi
const PLATFORM_NAV = [
    { to: '/platform', label: 'Platform', icon: LayoutDashboard, end: true, perm: ['platform.dashboard.view'] },
    { to: '/platform/schools', label: 'Schools', icon: Building2, perm: ['platform.schools.view'] },
    { to: '/platform/plans', label: 'Plans', icon: CreditCard, perm: ['platform.plans.manage'] },
];

const SCHOOL_NAV = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: ['dashboard.view'] },
    { to: '/students', label: 'Students', icon: GraduationCap, perm: ['students.view'] },
    { to: '/teachers', label: 'Teachers', icon: Users, perm: ['teachers.view'] },
    { to: '/classes', label: 'Classes', icon: School, perm: ['classes.view'] },
    { to: '/sections', label: 'Sections', icon: Layers3, perm: ['sections.view'] },
    { to: '/subjects', label: 'Subjects', icon: BookOpen, perm: ['subjects.view'] },
    { to: '/users', label: 'Users', icon: UserCog, perm: ['users.view', 'users.manage'] },
    { to: '/roles', label: 'Roles & Permissions', icon: ShieldCheck, perm: ['roles.view', 'roles.manage'] },
    { to: '/settings', label: 'School settings', icon: Settings, perm: ['school.settings.view'] },
];

function NavGroup({ title, items, onClose }) {
    if (items.length === 0) return null;
    return (
        <div className="space-y-1">
            {title ? (
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {title}
                </p>
            ) : null}
            {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )
                    }
                >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {label}
                </NavLink>
            ))}
        </div>
    );
}

export function Sidebar({ open, onClose }) {
    const { can, isPlatform, school } = useAuth();

    const visible = (items) => items.filter((i) => can(...i.perm));
    const platformItems = visible(PLATFORM_NAV);

    // Super admin ke paas saari permissions hoti hain, par bina school chune
    // school ke modules kaam hi nahi karte - isliye tab tak chhupa dete hain.
    const schoolItems = isPlatform && !school ? [] : visible(SCHOOL_NAV);

    return (
        <>
            {open ? (
                <div
                    className="fixed inset-0 z-30 bg-brand-950/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            ) : null}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground',
                    'border-r border-sidebar-border transition-transform duration-200',
                    open ? 'translate-x-0' : '-translate-x-full',
                    'lg:translate-x-0'
                )}
            >
                <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                            <School className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-semibold text-white">
                                {school?.name || 'ERPSC'}
                            </p>
                            <p className="truncate text-[11px] text-sidebar-foreground/70">
                                {isPlatform ? 'Platform console' : school?.code || 'School Management'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onClose}
                        className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white lg:hidden"
                        aria-label="Close menu"
                    >
                        <X />
                    </Button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    <NavGroup
                        title={platformItems.length && schoolItems.length ? 'Platform' : null}
                        items={platformItems}
                        onClose={onClose}
                    />
                    <NavGroup
                        title={platformItems.length && schoolItems.length ? 'School' : null}
                        items={schoolItems}
                        onClose={onClose}
                    />
                </nav>

                <div className="border-t border-sidebar-border px-5 py-4">
                    <p className="text-[11px] text-sidebar-foreground/60">
                        v1.0 &middot; {school?.session || 'Session ' + new Date().getFullYear()}
                    </p>
                </div>
            </aside>
        </>
    );
}
