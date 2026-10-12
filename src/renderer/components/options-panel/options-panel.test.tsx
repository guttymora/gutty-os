// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_PALETTE_ID } from '@data/palettes';
import { useThemeStore } from '@stores/theme-store';
import { useUiStore } from '@stores/ui-store';

import { OptionsPanel } from './options-panel';

describe('OptionsPanel', () => {
    beforeEach(() => {
        useThemeStore.setState({ paletteId: DEFAULT_PALETTE_ID });
        useUiStore.setState({ isOptionsOpen: true });
    });

    it('lists the palettes with the active one checked', () => {
        render(<OptionsPanel />);

        expect(screen.getAllByRole('radio')).toHaveLength(4);
        expect(screen.getByRole('radio', { name: 'Escarcha' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
    });

    it('switches the palette when one is chosen', async () => {
        render(<OptionsPanel />);

        await userEvent.click(screen.getByRole('radio', { name: 'Pocket' }));

        expect(useThemeStore.getState().paletteId).toBe('pocket');
        expect(screen.getByRole('radio', { name: 'Pocket' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
    });

    it('closes with the close button', async () => {
        render(<OptionsPanel />);

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(useUiStore.getState().isOptionsOpen).toBe(false);
    });
});
