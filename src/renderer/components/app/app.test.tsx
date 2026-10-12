// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SPLASH_FADE_MS } from '@components/splash-screen/splash-screen';

import { App } from './app';

describe('App', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('bridgeAPI', {
            platform: 'darwin',
            minimizeWindow: vi.fn(),
            toggleMaximizeWindow: vi.fn(),
            closeWindow: vi.fn(),
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
});
