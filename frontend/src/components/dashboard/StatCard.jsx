import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reference design wala stat tile: corner me halka brand glow blob, icon,
 * bada number aur trend pill. Hover par tile thoda "uth" jaati hai.
 *
 * `percent` null aata hai jab compare karne ko pichhla data hi nahi tha -
 * tab trend pill ki jagah neutral hint dikhate hain (fake % nahi).
 */
export function StatCard({ icon: Icon, label, value, percent, hint, tone = 'brand' }) {
    const tones = {
        brand: 'bg-accent text-accent-foreground',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    };

    const up = percent != null && percent >= 0;

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
            {/* Decorative glow - ngo-latest ke stat tile jaisa */}
            <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-brand-400/10 blur-2xl transition-colors group-hover:bg-brand-400/20"
            />

            <div className="relative flex items-start justify-between gap-2">
                <span
                    className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        tones[tone] || tones.brand
                    )}
                >
                    <Icon className="h-5 w-5" />
                </span>

                {percent != null ? (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                            up
                                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200'
                                : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                        )}
                    >
                        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {up ? '+' : ''}
                        {percent}%
                    </span>
                ) : null}
            </div>

            <div className="relative mt-3 space-y-0.5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
                {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            </div>
        </div>
    );
}
