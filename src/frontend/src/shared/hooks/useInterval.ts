import { useEffect, useRef } from 'react';

// From https://medium.com/@sfcofc/implementing-polling-in-react-a-guide-for-efficient-real-time-data-fetching-47f0887c54a7

type UseInterval = <T, U>(
    callback: (vars?: U) => T,
    delay: number | null,
) => void;

export const useInterval: UseInterval = (callback, delay) => {
    const callbackRef = useRef<typeof callback | null>(null);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const tick = () => {
            if (callbackRef.current) {
                callbackRef.current();
            }
        };
        if (delay !== null) {
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};
