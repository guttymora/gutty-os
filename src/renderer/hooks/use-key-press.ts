import { useEffect, useRef } from 'react';

const normalize = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

/**
 * Calls `handler` when one of `keys` (KeyboardEvent.key values) is pressed.
 * The window listener only exists while `enabled` is true and the component
 * is mounted. Pass a stable `keys` array (e.g. a module constant).
 */
export const useKeyPress = (
    keys: readonly string[],
    handler: (event: KeyboardEvent) => void,
    enabled = true
) => {
    // Keep the latest handler without re-registering the listener
    const handlerRef = useRef(handler);
    useEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }
        const targetKeys = keys.map(normalize);

        const onKeyDown = (event: KeyboardEvent) => {
            // Leave system shortcuts (Cmd+Q, Ctrl+Tab...) alone
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }
            if (targetKeys.includes(normalize(event.key))) {
                event.preventDefault();
                handlerRef.current(event);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [keys, enabled]);
};
