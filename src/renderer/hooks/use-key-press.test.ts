// @vitest-environment jsdom
import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKeyPress } from './use-key-press';

const KEYS = ['Tab', 'a'];

describe('useKeyPress', () => {
    it('calls the handler for matching keys, ignoring letter case', () => {
        const handler = vi.fn();
        renderHook(() => useKeyPress(KEYS, handler));

        fireEvent.keyDown(window, { key: 'Tab' });
        fireEvent.keyDown(window, { key: 'A' });
        fireEvent.keyDown(window, { key: 'b' });

        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('prevents the default action of handled keys', () => {
        renderHook(() => useKeyPress(KEYS, vi.fn()));

        const event = new KeyboardEvent('keydown', {
            key: 'Tab',
            cancelable: true,
        });
        window.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });

    it('ignores keys pressed with system modifiers', () => {
        const handler = vi.fn();
        renderHook(() => useKeyPress(KEYS, handler));

        fireEvent.keyDown(window, { key: 'a', metaKey: true });
        fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true });

        expect(handler).not.toHaveBeenCalled();
    });

    it('only listens while enabled', () => {
        const handler = vi.fn();
        const { rerender } = renderHook(
            ({ enabled }) => useKeyPress(KEYS, handler, enabled),
            { initialProps: { enabled: false } }
        );

        fireEvent.keyDown(window, { key: 'Tab' });
        expect(handler).not.toHaveBeenCalled();

        rerender({ enabled: true });
        fireEvent.keyDown(window, { key: 'Tab' });
        expect(handler).toHaveBeenCalledOnce();
    });

    it('removes the listener on unmount', () => {
        const handler = vi.fn();
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useKeyPress(KEYS, handler));

        unmount();
        fireEvent.keyDown(window, { key: 'Tab' });

        expect(handler).not.toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        removeSpy.mockRestore();
    });
});
