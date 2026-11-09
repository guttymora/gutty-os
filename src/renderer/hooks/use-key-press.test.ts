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
            ({ enabled }) => useKeyPress(KEYS, handler, { enabled }),
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

    it('leaves events alone when skip returns true', () => {
        const handler = vi.fn();
        renderHook(() =>
            useKeyPress(KEYS, handler, { skip: (event) => event.shiftKey })
        );

        const skipped = fireEvent.keyDown(window, {
            key: 'Tab',
            shiftKey: true,
        });
        expect(handler).not.toHaveBeenCalled();
        // Not cancelled, so the page still handles it
        expect(skipped).toBe(true);

        fireEvent.keyDown(window, { key: 'Tab' });
        expect(handler).toHaveBeenCalledOnce();
    });

    describe('while typing', () => {
        const typeInto = (element: HTMLElement, key: string) => {
            document.body.append(element);
            element.focus();
            const notCancelled = fireEvent.keyDown(element, { key });
            element.remove();
            return notCancelled;
        };

        it.each([
            ['a text input', () => document.createElement('input')],
            ['a textarea', () => document.createElement('textarea')],
            [
                'editable content',
                () => {
                    const div = document.createElement('div');
                    Object.defineProperty(div, 'isContentEditable', {
                        value: true,
                    });
                    return div;
                },
            ],
        ])('leaves keys typed into %s alone', (_, create) => {
            const handler = vi.fn();
            renderHook(() => useKeyPress(KEYS, handler));

            expect(typeInto(create(), 'a')).toBe(true);
            // Tab keeps moving focus out of the field
            expect(typeInto(create(), 'Tab')).toBe(true);
            expect(handler).not.toHaveBeenCalled();
        });

        it('still handles keys on non-text inputs', () => {
            const handler = vi.fn();
            renderHook(() => useKeyPress(KEYS, handler));
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';

            typeInto(checkbox, 'a');

            expect(handler).toHaveBeenCalledOnce();
        });

        it('handles keys typed into fields with allowWhileTyping', () => {
            const handler = vi.fn();
            renderHook(() =>
                useKeyPress(['Escape'], handler, { allowWhileTyping: true })
            );

            typeInto(document.createElement('input'), 'Escape');

            expect(handler).toHaveBeenCalledOnce();
        });

        it('ignores keys while composing an accent or IME character', () => {
            const handler = vi.fn();
            renderHook(() =>
                useKeyPress(['Escape'], handler, { allowWhileTyping: true })
            );

            fireEvent.keyDown(window, { key: 'Escape', isComposing: true });

            expect(handler).not.toHaveBeenCalled();
        });
    });
});
