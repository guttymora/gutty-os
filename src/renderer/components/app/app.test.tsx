// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SPLASH_FADE_MS } from '@components/splash-screen/splash-screen';
import { MOCK_GAMES } from '@data/mock-games';
import { useLibraryStore } from '@stores/library-store';
import { useUiStore } from '@stores/ui-store';

import { App } from './app';

describe('App', () => {
    beforeEach(() => {
        useUiStore.setState({ isOptionsOpen: false });
        useLibraryStore.setState({ status: 'loading', games: [] });
        vi.useFakeTimers();
        vi.stubGlobal('bridgeAPI', {
            platform: 'darwin',
            minimizeWindow: vi.fn(),
            toggleMaximizeWindow: vi.fn(),
            closeWindow: vi.fn(),
            getGames: vi.fn().mockResolvedValue(MOCK_GAMES),
            getLibraryLocation: vi
                .fn()
                .mockResolvedValue({ displayPath: '~/gutty-os' }),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('shows the splash first, then the game library', () => {
        render(<App />);
        expect(
            screen.getByRole('img', { name: 'GuttyOS' })
        ).toBeInTheDocument();
        expect(screen.getByText('GuttyOS • GAMES')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => vi.advanceTimersByTime(SPLASH_FADE_MS));

        expect(screen.queryByRole('img', { name: 'GuttyOS' })).toBeNull();
        expect(
            screen.getByRole('navigation', { name: 'Platforms' })
        ).toBeInTheDocument();
    });

    it('opens the options panel from the hint bar', () => {
        render(<App />);
        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => vi.advanceTimersByTime(SPLASH_FADE_MS));

        fireEvent.click(screen.getByRole('button', { name: 'TabOptions' }));

        expect(
            screen.getByRole('dialog', { name: 'Options' })
        ).toBeInTheDocument();
    });

    it('opens options with Tab and closes them with Escape', () => {
        render(<App />);
        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => vi.advanceTimersByTime(SPLASH_FADE_MS));

        fireEvent.keyDown(window, { key: 'Tab' });
        expect(
            screen.getByRole('dialog', { name: 'Options' })
        ).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
    });

    it('ignores Tab while the splash is showing', () => {
        render(<App />);

        fireEvent.keyDown(window, { key: 'Tab' });

        expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
    });

    it('loads the games from the library on start', async () => {
        render(<App />);
        await act(async () => undefined);

        expect(window.bridgeAPI.getGames).toHaveBeenCalledOnce();
        expect(
            screen.getByRole('button', { name: /Super Mario Land/ })
        ).toBeInTheDocument();
    });

    it('keeps files dropped outside a drop zone from opening', () => {
        render(<App />);
        const dropEvent = new Event('drop', { cancelable: true });
        const dragOverEvent = new Event('dragover', { cancelable: true });

        window.dispatchEvent(dragOverEvent);
        window.dispatchEvent(dropEvent);

        expect(dragOverEvent.defaultPrevented).toBe(true);
        expect(dropEvent.defaultPrevented).toBe(true);
    });
});
