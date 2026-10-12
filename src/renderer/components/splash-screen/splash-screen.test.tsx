// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    SPLASH_DURATION_MS,
    SPLASH_FADE_MS,
    SplashScreen,
} from './splash-screen';

describe('SplashScreen', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fades out and finishes after the splash duration', () => {
        const onFinish = vi.fn();
        render(<SplashScreen onFinish={onFinish} />);
        const splash = screen.getByRole('img', { name: 'GuttyOS' });

        act(() => vi.advanceTimersByTime(SPLASH_DURATION_MS));
        expect(splash).toHaveAttribute('data-leaving', 'true');
        expect(onFinish).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(SPLASH_FADE_MS));
        expect(onFinish).toHaveBeenCalledOnce();
    });

    it('can be skipped with any key', () => {
        const onFinish = vi.fn();
        render(<SplashScreen onFinish={onFinish} />);

        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => vi.advanceTimersByTime(SPLASH_FADE_MS));

        expect(onFinish).toHaveBeenCalledOnce();
    });
});
