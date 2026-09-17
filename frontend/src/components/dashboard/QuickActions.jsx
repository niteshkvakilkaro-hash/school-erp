import { Link } from 'react-router-dom';
import { UserPlus, School, BookOpen, UserCog, ClipboardCheck, NotebookPen, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

/**
 * Sirf wahi actions dikhte hain jinki permission user ke paas hai.
 * `to` par ?new=1 bhejte hain taaki page khulte hi form modal khul jaye.
 */
const ACTIONS = [
    { to: '/students?new=1', label: 'Add Student', sub: 'Naya admission', icon: UserPlus, perm: ['students.create'], tone: 'brand' },
    { to: '/teachers?new=1', label: 'Add Teacher', sub: 'Staff register', icon: UserCog, perm: ['teachers.create'], tone: 'violet' },
    { to: '/classes?new=1', label: 'Add Class', sub: 'Class banaiye', icon: School, perm: ['classes.manage'], tone: 'blue' },
    { to: '/attendance', label: 'Take Attendance', sub: 'Aaj ki class', icon: ClipboardCheck, perm: ['attendance.mark'], tone: 'amber' },
    { to: '/homework?new=1', label: 'Assign Homework', sub: 'Naya homework', icon: NotebookPen, perm: ['homework.manage'], tone: 'blue' },
    { to: '/exams?new=1', label: 'Create Exam', sub: 'Datesheet banaiye', icon: FileSpreadsheet, perm: ['exams.manage'], tone: 'violet' },
    { to: '/subjects?new=1', label: 'Add Subject', sub: 'Subject banaiye', icon: BookOpen, perm: ['subjects.manage'], tone: 'brand' },
];

const TONES = {
    brand: 'bg-accent text-accent-foreground',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

export function QuickActions() {
    const { can } = useAuth();
    const items = ACTIONS.filter((a) => can(...a.perm));

    if (items.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map(({ to, label, sub, icon: Icon, tone }) => (
                    <Link
                        key={to}
                        to={to}
                        className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40 hover:shadow-card-hover"
                    >
                        <span
                            className={cn(
                                'mb-3 flex h-10 w-10 items-center justify-center rounded-lg',
                                TONES[tone] || TONES.brand
                            )}
                        >
                            <Icon className="h-5 w-5" />
                        </span>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary">{label}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}
