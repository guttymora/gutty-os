// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PALETTE_ID } from '@data/palettes';
import { useThemeStore } from '@stores/theme-store';
import { useUiStore } from '@stores/ui-store';

import { OptionsPanel } from './options-panel';

describe('OptionsPanel', () => {
    const bridge = {
        getLibraryLocation: vi.fn(),
        chooseLibraryFolder: vi.fn(),
        moveLibrary: vi.fn(),
        onLibraryMoveProgress: vi.fn(() => () => undefined),
    };

    beforeEach(() => {
        useThemeStore.setState({ paletteId: DEFAULT_PALETTE_ID });
        useUiStore.setState({ isOptionsOpen: true });
        bridge.getLibraryLocation.mockResolvedValue({
            displayPath: '~/gutty-os',
        });
        vi.stubGlobal('bridgeAPI', bridge);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
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

    it('closes with Escape while open', () => {
        render(<OptionsPanel />);

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useUiStore.getState().isOptionsOpen).toBe(false);
    });

    it('stops listening for Escape once closed', () => {
        const { unmount } = render(<OptionsPanel />);
        unmount();
        useUiStore.setState({ isOptionsOpen: true });

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useUiStore.getState().isOptionsOpen).toBe(true);
    });

    it('shows the library folder setting', async () => {
        render(<OptionsPanel />);

        expect(await screen.findByText('~/gutty-os')).toBeInTheDocument();
    });

    it('cannot be closed while the library is moving', async () => {
        let finishMove: (value: unknown) => void = () => undefined;
        bridge.chooseLibraryFolder.mockResolvedValue({
            ok: true,
            token: 'folder',
            displayPath: '~/Games',
        });
        bridge.moveLibrary.mockReturnValue(
            new Promise((resolve) => {
                finishMove = resolve;
            })
        );
        render(<OptionsPanel />);
        await userEvent.click(
            await screen.findByRole('button', { name: 'Change…' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Move my library' })
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(useUiStore.getState().isOptionsOpen).toBe(true);
        expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();

        await act(async () => {
            finishMove({
                ok: true,
                location: { displayPath: '~/Games' },
                oldFilesLeft: false,
            });
        });
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(useUiStore.getState().isOptionsOpen).toBe(false);
    });
});
