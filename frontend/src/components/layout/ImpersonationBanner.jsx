import { Eye, X } from 'lucide-react';
import { setActiveSchool } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * Super admin jab kisi school ke andar ho to saaf dikhna chahiye - warna
 * galti se doosre school ka data edit ho sakta hai.
 */
export function ImpersonationBanner() {
    const { school } = useAuth();
    if (!school?.impersonated) return null;

    const exit = () => {
        setActiveSchool(null);
        window.location.href = '/platform';
    };

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-warning/30 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200 lg:px-6">
            <Eye className="h-4 w-4 shrink-0" />
            <span>
                Aap <strong>{school.name}</strong> ({school.code}) ke andar platform admin ke
                taur par hain - yahan kiye gaye changes is school ke data par lagenge.
            </span>
            <button
                onClick={exit}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium underline-offset-2 hover:underline"
            >
                <X className="h-3.5 w-3.5" /> Platform view par wapas
            </button>
        </div>
    );
}
