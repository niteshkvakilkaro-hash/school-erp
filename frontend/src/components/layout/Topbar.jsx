import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Menu, Moon, Sun, LogOut, KeyRound, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { initials } from '@/lib/utils';
import { SchoolSwitcher } from './SchoolSwitcher';

export function Topbar({ onMenu, onChangePassword }) {
    const { user, logout, isPlatform } = useAuth();
    const { theme, toggle } = useTheme();

    return (
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:px-6">
            <Button variant="ghost" size="icon" onClick={onMenu} className="lg:hidden" aria-label="Menu">
                <Menu />
            </Button>

            <div className="flex-1" />

            {isPlatform ? <SchoolSwitcher /> : null}

            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>

            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2 py-1.5 text-left transition-colors hover:bg-accent">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {initials(user?.name || 'U')}
                        </span>
                        <span className="hidden leading-tight sm:block">
                            <span className="block text-sm font-medium text-foreground">{user?.name}</span>
                            <span className="block text-[11px] text-muted-foreground">
                                {user?.role?.name || ''}
                            </span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="end"
                        sideOffset={8}
                        className="z-50 w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                    >
                        <div className="px-3 py-2">
                            <p className="truncate text-sm font-medium">{user?.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        <DropdownMenu.Item
                            onSelect={onChangePassword}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                        >
                            <KeyRound className="h-4 w-4" /> Change password
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            onSelect={logout}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10"
                        >
                            <LogOut className="h-4 w-4" /> Logout
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </header>
    );
}
