import { useEffect, useState } from 'react';

export const formatTime = (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
    ).padStart(2, '0')}`;

export const Clock = () => {
    const [time, setTime] = useState(() => formatTime(new Date()));

    useEffect(() => {
        // React skips the re-render while the formatted minute is unchanged
        const timer = window.setInterval(
            () => setTime(formatTime(new Date())),
            1000
        );

        return () => window.clearInterval(timer);
    }, []);

    return <time>{time}</time>;
};
