import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Dashboard ke Quick Actions "/students?new=1" par bhejte hain.
 * Page khulte hi form modal khol do aur param hata do, taki back/refresh
 * par wo dobara na khule.
 */
export function useNewParam(onOpen) {
    const [params, setParams] = useSearchParams();

    useEffect(() => {
        if (!params.has('new')) return;

        onOpen();
        const next = new URLSearchParams(params);
        next.delete('new');
        setParams(next, { replace: true });
        // Sirf param aane par chalna chahiye - onOpen har render par badalta hai
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);
}
