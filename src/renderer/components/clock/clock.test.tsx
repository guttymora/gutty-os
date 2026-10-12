// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Clock } from './clock';

describe('Clock', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 9, 12, 9, 5, 30));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows the current time as HH:MM and keeps it updated', () => {
        render(<Clock />);
        expect(screen.getByText('09:05')).toBeInTheDocument();

        act(() => vi.advanceTimersByTime(30_000));
        expect(screen.getByText('09:06')).toBeInTheDocument();
    });
});
