import { useEffect, useRef } from 'react';

import { isTextEntry } from '@utils/is-text-entry';

const normalize = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

type KeyPressOptions = {
    /** The window listener only exists while true (default) */
    enabled?: boolean;
    /** Events it returns true for are left alone, for the page to handle */
    skip?: (event: KeyboardEvent) => boolean;
    /**
     * Also handle keys typed into text fields (e.g. Escape closing a dialog
     * from its search box). Off by default, so typing never fires shortcuts.
     */
    allowWhileTyping?: boolean;
};

/**
 * Calls `handler` when one of `keys` (KeyboardEvent.key values) is pressed.
 * The window listener is removed when disabled or unmounted. Pass a stable
 * `keys` array (e.g. a module constant).
 *
 * Keys typed into a text field are ignored. A component with a field handles
 * its own keys (Enter to submit...) with `onKeyDown` on that field.
 */
export const useKeyPress = (
    keys: readonly string[],
    handler: (event: KeyboardEvent) => void,
    { enabled = true, skip, allowWhileTyping = false }: KeyPressOptions = {}
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
            // Mid-composition keys (accents, IME) belong to the text field
            if (event.isComposing) {
                return;
            }
            if (!allowWhileTyping && isTextEntry(event.target)) {
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
    }, [keys, enabled, allowWhileTyping]);
};
