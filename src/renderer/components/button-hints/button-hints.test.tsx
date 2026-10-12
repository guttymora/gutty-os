// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ButtonHints } from './button-hints';

describe('ButtonHints', () => {
    it('shows each control with its key and action', () => {
        render(<ButtonHints />);

        expect(
            screen.getAllByRole('listitem').map((item) => item.textContent)
        ).toEqual(['APlay', 'BBack', 'XSearch', 'YRandom', 'TabOptions']);
    });

    it('makes hints with a handler clickable', async () => {
        const openOptions = vi.fn();
        render(<ButtonHints onPress={{ options: openOptions }} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'TabOptions' })
        );

        expect(openOptions).toHaveBeenCalledOnce();
        expect(screen.getAllByRole('button')).toHaveLength(1);
    });
});
