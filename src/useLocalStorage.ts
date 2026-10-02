// useLocalStorage.ts
// Per-browser preferences (theme, selected model). Storage can be unavailable, so every access is guarded.
import { useCallback, useState } from 'react';

export function useLocalStorage<T>(key: string, fallback: T, isValid: (value: unknown) => value is T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(key);
            if (raw !== null) {
                const parsed: unknown = JSON.parse(raw);
                if (isValid(parsed)) return parsed;
            }
        } catch {
            // Fall back to the default below.
        }
        return fallback;
    });

    const update = useCallback((next: T) => {
        setValue(next);
        try {
            localStorage.setItem(key, JSON.stringify(next));
        } catch {
            // Ignore: the preference just won't survive a reload.
        }
    }, [key]);

    return [value, update] as const;
}
