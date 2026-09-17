import { useEffect, useState } from 'react';

/** Search box har keystroke par API hit na kare. */
export function useDebounce(value, delay = 400) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);

    return debounced;
}
