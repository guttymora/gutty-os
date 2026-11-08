import { useEffect, useRef } from 'react';

const normalize = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

/**
 * Calls `handler` when one of `keys` (KeyboardEvent.key values) is pressed.
 * The window listener only exists while `enabled` is true and the component
 * is mounted. Pass a stable `keys` array (e.g. a module constant).
 * Events `skip` returns true for are left alone, for the page to handle.
 */
export const useKeyPress = (
    keys: readonly string[],
    handler: (event: KeyboardEvent) => void,
    enabled = true,
    skip?: (event: KeyboardEvent) => boolean
) => {
    // Keep the latest callbacks without re-registering the listener
    const handlerRef = useRef(handler);
    const skipRef = useRef(skip);
    useEffect(() => {
        handlerRef.current = handler;
        skipRef.current = skip;
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
            if (
                targetKeys.includes(normalize(event.key)) &&
                !skipRef.current?.(event)
            ) {
                event.preventDefault();
                handlerRef.current(event);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [keys, enabled]);
};
