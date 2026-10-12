// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformSidebar } from './platform-sidebar';

describe('PlatformSidebar', () => {
    it('lists all games first, then each platform', () => {
        render(<PlatformSidebar selected="all" onSelect={vi.fn()} />);

        expect(
            screen.getAllByRole('button').map((button) => button.textContent)
        ).toEqual(['All Games', 'Game Boy', 'GB Color', 'GB Advance']);
    });

    it('marks the selected platform as current', () => {
        render(<PlatformSidebar selected="gbc" onSelect={vi.fn()} />);

        expect(
            screen.getByRole('button', { name: 'GB Color' })
        ).toHaveAttribute('aria-current', 'true');
        expect(
            screen.getByRole('button', { name: 'All Games' })
        ).not.toHaveAttribute('aria-current');
    });

    it('reports the clicked platform', async () => {
        const onSelect = vi.fn();
        render(<PlatformSidebar selected="all" onSelect={onSelect} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'GB Advance' })
        );

        expect(onSelect).toHaveBeenCalledWith('gba');
    });
});
