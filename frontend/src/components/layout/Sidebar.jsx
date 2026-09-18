import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    School,
    Layers3,
    BookOpen,
    CalendarRange,
    ClipboardCheck,
    NotebookPen,
    FileSpreadsheet,
    Wallet,
    Megaphone,
    Library,
    Bus,
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

/**
 * Reference design jaisa grouped menu. Har item apni permission maangta hai -
 * permission nahi to wo item (aur khaali pad gaya group) dikhta hi nahi.
 */
const PLATFORM_GROUPS = [
    {
        items: [
            { to: '/platform', label: 'Platform', icon: LayoutDashboard, end: true, perm: ['platform.dashboard.view'] },
        ],
    },
    {
        title: 'Tenants',
        items: [
            { to: '/platform/schools', label: 'Schools', icon: Building2, perm: ['platform.schools.view'] },
            { to: '/platform/plans', label: 'Plans', icon: CreditCard, perm: ['platform.plans.manage'] },
        ],
    },
];

const SCHOOL_GROUPS = [
    {
        items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: ['dashboard.view'] }],
    },
    {
        title: 'People',
        items: [
            { to: '/students', label: 'Students', icon: GraduationCap, perm: ['students.view'] },
            { to: '/teachers', label: 'Teachers', icon: Users, perm: ['teachers.view'] },
            { to: '/users', label: 'Staff & Parents', icon: UserCog, perm: ['users.view', 'users.manage'] },
        ],
    },
    {
        title: 'Academics',
        items: [
            { to: '/classes', label: 'Classes', icon: School, perm: ['classes.view'] },
            { to: '/sections', label: 'Sections', icon: Layers3, perm: ['sections.view'] },
            { to: '/subjects', label: 'Subjects', icon: BookOpen, perm: ['subjects.view'] },
            { to: '/timetable', label: 'Timetable', icon: CalendarRange, perm: ['timetable.view'] },
            { to: '/attendance', label: 'Attendance', icon: ClipboardCheck, perm: ['attendance.view', 'attendance.mark'] },
            { to: '/homework', label: 'Homework', icon: NotebookPen, perm: ['homework.view'] },
            { to: '/exams', label: 'Exams & Results', icon: FileSpreadsheet, perm: ['exams.view'] },
        ],
    },
    {
        title: 'Finance',
        items: [
            { to: '/fees', label: 'Fees & Payments', icon: Wallet, perm: ['fees.view'] },
        ],
    },
    {
        title: 'Operations',
        items: [
            { to: '/library', label: 'Library', icon: Library, perm: ['library.view'] },
            { to: '/transport', label: 'Transport', icon: Bus, perm: ['transport.view'] },
        ],
    },
    {
        title: 'Communication',
        items: [
            { to: '/notices', label: 'Notices', icon: Megaphone, perm: ['notices.view'] },
        ],
    },
    {
        title: 'Settings',
        items: [
            { to: '/roles', label: 'Roles & Permissions', icon: ShieldCheck, perm: ['roles.view', 'roles.manage'] },
            { to: '/settings', label: 'School Settings', icon: Settings, perm: ['school.settings.view'] },
        ],
    },
];

function NavGroup({ title, items, onClose }) {
    if (items.length === 0) return null;

    return (
        <div className="space-y-0.5">
            {title ? (
                <p className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
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
                                ? 'bg-linear-to-r from-brand-500/90 to-brand-600/90 font-semibold text-white shadow-brand'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )
                    }
                >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {label}
                </NavLink>
            ))}
        </div>
    );
}

export function Sidebar({ open, onClose }) {
    const { can, isPlatform, school } = useAuth();

    // Group me se sirf allowed items, aur poora khaali group drop kar do
    const visibleGroups = (groups) =>
        groups
            .map((g) => ({ ...g, items: g.items.filter((i) => can(...i.perm)) }))
            .filter((g) => g.items.length > 0);

    const platformGroups = visibleGroups(PLATFORM_GROUPS);

    // Super admin ke paas saari permissions hoti hain, par bina school chune
    // school ke modules kaam hi nahi karte - isliye tab tak chhupa dete hain.
    const schoolGroups = isPlatform && !school ? [] : visibleGroups(SCHOOL_GROUPS);

    const showSectionLabels = platformGroups.length > 0 && schoolGroups.length > 0;

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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-glow">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-semibold text-white">
                                {school?.name || 'ERPSC'}
                            </p>
                            <p className="truncate text-[11px] text-sidebar-foreground/70">
                                {isPlatform && !school
                                    ? 'Platform console'
                                    : school?.code || 'School Management'}
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

                <nav className="flex-1 overflow-y-auto px-3 pb-4">
                    {showSectionLabels && platformGroups.length ? (
                        <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-brand-400/70">
                            Platform
                        </p>
                    ) : null}
                    {platformGroups.map((g, i) => (
                        <NavGroup key={'p' + i} title={g.title} items={g.items} onClose={onClose} />
                    ))}

                    {showSectionLabels ? (
                        <p className="mt-4 border-t border-sidebar-border px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-brand-400/70">
                            School
                        </p>
                    ) : null}
                    {schoolGroups.map((g, i) => (
                        <NavGroup key={'s' + i} title={g.title} items={g.items} onClose={onClose} />
                    ))}
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
