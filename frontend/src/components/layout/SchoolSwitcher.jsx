import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Building2, Check, ChevronDown } from 'lucide-react';
import api, { setActiveSchool, getActiveSchool } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Sirf super admin ke liye. Chune hue school ka id X-School-Id header me
 * jaata hai, jisse wo us school ka data aise dekh sakta hai jaise andar ho.
 */
export function SchoolSwitcher() {
    const [schools, setSchools] = useState([]);
    const [activeId, setActiveId] = useState(getActiveSchool());

    useEffect(() => {
        api.get('/platform/schools', { params: { limit: 100 } })
            .then(({ data }) => setSchools(data.data.items))
            .catch(() => {});
    }, []);

    const pick = (id) => {
        setActiveSchool(id);
        setActiveId(id ? String(id) : null);
        // Poore app ka data badalta hai - reload sabse saaf tareeka hai
        window.location.reload();
    };

    const active = schools.find((s) => String(s.id) === String(activeId));

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                        active
                            ? 'border-primary/40 bg-accent text-accent-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    )}
                >
                    <Building2 className="h-4 w-4" />
                    <span className="hidden max-w-40 truncate sm:block">
                        {active ? active.name : 'Platform view'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-50 max-h-80 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                >
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                        School chuniye - uska data aise dikhega jaise aap us school me ho
                    </p>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />

                    <DropdownMenu.Item
                        onSelect={() => pick(null)}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent"
                    >
                        Platform view (koi school nahi)
                        {!activeId ? <Check className="h-4 w-4 text-primary" /> : null}
                    </DropdownMenu.Item>

                    {schools.map((s) => (
                        <DropdownMenu.Item
                            key={s.id}
                            onSelect={() => pick(s.id)}
                            className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent"
                        >
                            <span className="min-w-0">
                                <span className="block truncate">{s.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                    {s.code}
                                </span>
                            </span>
                            {String(activeId) === String(s.id) ? (
                                <Check className="h-4 w-4 shrink-0 text-primary" />
                            ) : null}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
