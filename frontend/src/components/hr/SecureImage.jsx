import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// Ek hi selfie baar-baar download na ho (live panel har 30 sec refresh hota hai)
const cache = new Map();

/**
 * Private selfie - <img src> token nahi bhej sakta, isliye API se blob laakar
 * dikhate hain. Sirf login kiye HR user ko milti hai.
 */
export function SecureImage({ path, alt = '', className, fallbackClassName }) {
    const [src, setSrc] = useState(() => (path ? cache.get(path) : null) || null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!path) return undefined;
        if (cache.has(path)) {
            setSrc(cache.get(path));
            return undefined;
        }
        let alive = true;
        setFailed(false);
        api.get(path, { responseType: 'blob' })
            .then(({ data }) => {
                const url = URL.createObjectURL(data);
                cache.set(path, url);
                if (alive) setSrc(url);
            })
            .catch(() => alive && setFailed(true));
        return () => {
            alive = false;
        };
    }, [path]);

    if (!path || failed || !src) {
        return (
            <div className={cn('flex items-center justify-center bg-muted text-muted-foreground', className, fallbackClassName)}>
                <UserRound className="h-1/3 w-1/3" />
            </div>
        );
    }
    return <img src={src} alt={alt} className={cn('object-cover', className)} />;
}

export const photoPath = (recordId, which = 'in') => '/hr/attendance/' + recordId + '/photo/' + which;
