// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '@shared/game';
import type { ImportResult, StagedFile, StageResult } from '@shared/import';
import { useLibraryStore } from '@stores/library-store';
import { useUiStore } from '@stores/ui-store';

import { AddGameDialog } from './add-game-dialog';

const ROM: StagedFile = {
    token: 'rom-token',
    name: 'Pokemon Emerald.gba',
    kind: 'rom',
    platform: 'gba',
};
const SAVE: StagedFile = {
    token: 'save-token',
    name: 'Pokemon Emerald.sav',
    kind: 'save',
};
const GAME: Game = {
    id: 'f3ae088181bf583e55daf962a92bb46f4f1d07b7',
    title: 'Pokemon Emerald',
    platform: 'gba',
    rating: 0,
    playTimeMinutes: 0,
    isFavorite: false,
    addedAt: '2026-10-13T12:00:00.000Z',
};

const staged = (file: StagedFile, suggestedSave?: StagedFile): StageResult => ({
    ok: true,
    file,
    suggestedSave,
});

const bridge = {
    chooseImportFile: vi.fn<(...args: unknown[]) => Promise<StageResult>>(),
    stageDroppedFile: vi.fn<(file: File) => Promise<StageResult>>(),
    importGame: vi.fn<(...args: unknown[]) => Promise<ImportResult>>(),
};

const panel = () => screen.getByRole('dialog', { name: 'Add a game' });
const addButton = () => screen.getByRole('button', { name: 'Add game' });
const status = () => screen.getByRole('status');

const drop = async (...names: string[]) => {
    await act(async () => {
        fireEvent.drop(panel(), {
            dataTransfer: { files: names.map((name) => new File(['x'], name)) },
        });
    });
};

describe('AddGameDialog', () => {
    beforeEach(() => {
        vi.stubGlobal('bridgeAPI', bridge);
        useLibraryStore.setState({ status: 'ready', games: [] });
        useUiStore.setState({ isAddGameOpen: true });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetAllMocks();
    });

    it('enables "Add game" only once a ROM is chosen', async () => {
        bridge.chooseImportFile.mockResolvedValue(staged(ROM));
        render(<AddGameDialog />);
        expect(addButton()).toBeDisabled();

        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );

        expect(screen.getByText('Pokemon Emerald.gba')).toBeInTheDocument();
        expect(screen.getByText('GBA')).toBeInTheDocument();
        expect(addButton()).toBeEnabled();
    });

    it('fills in the save found next to the chosen ROM', async () => {
        bridge.chooseImportFile.mockResolvedValue(staged(ROM, SAVE));
        render(<AddGameDialog />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );

        expect(screen.getByText('Pokemon Emerald.sav')).toBeInTheDocument();
    });

    it('limits the dialog to the given platform for ROMs only', async () => {
        bridge.chooseImportFile.mockResolvedValue({
            ok: false,
            reason: 'cancelled',
        });
        render(<AddGameDialog platform="gb" />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Choose Save (optional)' })
        );

        expect(bridge.chooseImportFile).toHaveBeenNthCalledWith(1, 'rom', 'gb');
        expect(bridge.chooseImportFile).toHaveBeenNthCalledWith(
            2,
            'save',
            undefined
        );
        // A cancelled dialog is not an error
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('accepts a ROM and its save dropped together', async () => {
        bridge.stageDroppedFile.mockImplementation(async (file) =>
            staged(file.name.endsWith('.sav') ? SAVE : ROM)
        );
        render(<AddGameDialog />);

        await drop('Pokemon Emerald.gba', 'Pokemon Emerald.sav');

        expect(screen.getByText('Pokemon Emerald.gba')).toBeInTheDocument();
        expect(screen.getByText('Pokemon Emerald.sav')).toBeInTheDocument();
    });

    it('highlights the panel while files are dragged over it', () => {
        render(<AddGameDialog />);

        fireEvent.dragOver(panel());
        expect(panel()).toHaveAttribute('data-drag-over', 'true');

        fireEvent.dragLeave(panel());
        expect(panel()).toHaveAttribute('data-drag-over', 'false');
    });

    it('accepts only one game at a time', async () => {
        bridge.stageDroppedFile.mockResolvedValue(staged(ROM));
        render(<AddGameDialog />);

        await drop('a.gba', 'b.gba', 'c.gba');
        expect(status()).toHaveTextContent('Add one game at a time');

        await drop('a.gba', 'b.gba');
        expect(status()).toHaveTextContent('Add one game at a time');
        expect(addButton()).toBeDisabled();
    });

    it('explains why a dropped file was rejected', async () => {
        bridge.stageDroppedFile.mockResolvedValue({
            ok: false,
            reason: 'unsupported',
        });
        render(<AddGameDialog />);

        await drop('game.zip');

        expect(status()).toHaveTextContent('Use a .gb, .gbc or .gba ROM');
    });

    it('removes a chosen file', async () => {
        bridge.chooseImportFile.mockResolvedValue(staged(ROM));
        render(<AddGameDialog />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Remove ROM' })
        );

        expect(screen.queryByText('Pokemon Emerald.gba')).toBeNull();
        expect(addButton()).toBeDisabled();
    });

    it('adds the game, closes and reports it', async () => {
        const onAdded = vi.fn();
        bridge.chooseImportFile.mockResolvedValue(staged(ROM, SAVE));
        bridge.importGame.mockResolvedValue({
            status: 'added',
            game: GAME,
            warnings: [],
        });
        render(<AddGameDialog onAdded={onAdded} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );

        await userEvent.click(addButton());

        expect(bridge.importGame).toHaveBeenCalledWith(
            'rom-token',
            'save-token'
        );
        expect(useLibraryStore.getState().games).toEqual([GAME]);
        expect(useUiStore.getState().isAddGameOpen).toBe(false);
        expect(onAdded).toHaveBeenCalledWith(GAME);
    });

    it('mentions anything that went wrong with an added game', async () => {
        bridge.chooseImportFile.mockResolvedValue(staged(ROM));
        bridge.importGame.mockResolvedValue({
            status: 'added',
            game: GAME,
            warnings: ['original-not-removed'],
        });
        render(<AddGameDialog />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );

        await userEvent.click(addButton());

        expect(status()).toHaveTextContent(
            "Added Pokemon Emerald. The original ROM couldn't be deleted"
        );
        expect(status()).toHaveAttribute('data-tone', 'info');
        // Stays open so the warning can be read
        expect(useUiStore.getState().isAddGameOpen).toBe(true);
    });

    it('tells the user when the game is already in the library', async () => {
        bridge.chooseImportFile.mockResolvedValue(staged(ROM));
        bridge.importGame.mockResolvedValue({
            status: 'duplicate',
            game: GAME,
        });
        render(<AddGameDialog />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );

        await userEvent.click(addButton());

        expect(status()).toHaveTextContent(
            'Pokemon Emerald is already in your library'
        );
        expect(useLibraryStore.getState().games).toEqual([]);
    });

    it('keeps the chosen files when the import fails', async () => {
        bridge.chooseImportFile.mockResolvedValue(staged(ROM));
        bridge.importGame.mockResolvedValue({
            status: 'error',
            reason: 'busy',
        });
        render(<AddGameDialog />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Choose ROM' })
        );

        await userEvent.click(addButton());

        expect(status()).toHaveTextContent('Another game is being added');
        expect(status()).toHaveAttribute('data-tone', 'error');
        expect(screen.getByText('Pokemon Emerald.gba')).toBeInTheDocument();
    });

    it('sets and removes a save chosen with the dialog', async () => {
        bridge.chooseImportFile.mockResolvedValue(staged(SAVE));
        render(<AddGameDialog />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Choose Save (optional)' })
        );
        expect(screen.getByText('Pokemon Emerald.sav')).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Remove Save (optional)' })
        );
        expect(screen.queryByText('Pokemon Emerald.sav')).toBeNull();
    });

    it('keeps a save the user chose over the one next to the ROM', async () => {
        const otherSave = { ...SAVE, token: 'other', name: 'backup.sav' };
        bridge.chooseImportFile.mockResolvedValueOnce(staged(otherSave));
        bridge.stageDroppedFile.mockResolvedValue(staged(ROM, SAVE));
        render(<AddGameDialog />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Choose Save (optional)' })
        );
        await drop('Pokemon Emerald.gba');

        expect(screen.getByText('backup.sav')).toBeInTheDocument();
        expect(screen.queryByText('Pokemon Emerald.sav')).toBeNull();
    });

    it('accepts a save dropped on its own', async () => {
        bridge.stageDroppedFile.mockResolvedValue(staged(SAVE));
        render(<AddGameDialog />);

        await drop('Pokemon Emerald.sav');

        expect(screen.getByText('Pokemon Emerald.sav')).toBeInTheDocument();
        expect(addButton()).toBeDisabled();
    });

    it('ignores a drop without files', async () => {
        render(<AddGameDialog />);

        await drop();

        expect(bridge.stageDroppedFile).not.toHaveBeenCalled();
        expect(screen.queryByRole('status')).toBeNull();
    });

    it.each([
        [
            'the Close button',
            () =>
                userEvent.click(screen.getByRole('button', { name: 'Close' })),
        ],
        ['Escape', () => userEvent.keyboard('{Escape}')],
        [
            'a click outside',
            () => userEvent.click(panel().parentElement as HTMLElement),
        ],
    ])('closes with %s', async (_, close) => {
        render(<AddGameDialog />);

        await close();

        expect(useUiStore.getState().isAddGameOpen).toBe(false);
    });

    it('stays open when clicking inside it', async () => {
        render(<AddGameDialog />);

        await userEvent.click(panel());

        expect(useUiStore.getState().isAddGameOpen).toBe(true);
    });
});
