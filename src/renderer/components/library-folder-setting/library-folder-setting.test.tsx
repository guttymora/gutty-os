// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoveLibraryProgress } from '@shared/library-location';
import { useLibraryStore } from '@stores/library-store';

import { LibraryFolderSetting } from './library-folder-setting';

describe('LibraryFolderSetting', () => {
    let reportProgress: (progress: MoveLibraryProgress) => void;
    const stopListening = vi.fn();
    const loadGames = vi.fn();
    const bridge = {
        getLibraryLocation: vi.fn(),
        chooseLibraryFolder: vi.fn(),
        moveLibrary: vi.fn(),
        onLibraryMoveProgress: vi.fn(
            (callback: (progress: MoveLibraryProgress) => void) => {
                reportProgress = callback;
                return stopListening;
            }
        ),
    };

    const chooseFolder = async () => {
        bridge.chooseLibraryFolder.mockResolvedValue({
            ok: true,
            token: 'folder-token',
            displayPath: '~/Games',
        });
        await userEvent.click(
            await screen.findByRole('button', { name: 'Change…' })
        );
    };

    beforeEach(() => {
        bridge.getLibraryLocation.mockResolvedValue({
            displayPath: '~/gutty-os',
        });
        vi.stubGlobal('bridgeAPI', bridge);
        useLibraryStore.setState({ loadGames });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('shows where the library is', async () => {
        render(<LibraryFolderSetting />);

        expect(await screen.findByText('~/gutty-os')).toBeInTheDocument();
    });

    it('does nothing when the folder dialog is cancelled', async () => {
        bridge.chooseLibraryFolder.mockResolvedValue({
            ok: false,
            reason: 'cancelled',
        });
        render(<LibraryFolderSetting />);

        await userEvent.click(
            await screen.findByRole('button', { name: 'Change…' })
        );

        expect(screen.queryByRole('status')).toBeNull();
        expect(screen.getByText('~/gutty-os')).toBeInTheDocument();
    });

    it('explains why a folder cannot be used', async () => {
        bridge.chooseLibraryFolder.mockResolvedValue({
            ok: false,
            reason: 'not-empty',
        });
        render(<LibraryFolderSetting />);

        await userEvent.click(
            await screen.findByRole('button', { name: 'Change…' })
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Choose an empty folder'
        );
    });

    it('asks for confirmation and can be cancelled', async () => {
        render(<LibraryFolderSetting />);
        await chooseFolder();

        expect(screen.getByText(/Move your library to/)).toHaveTextContent(
            '~/Games'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(bridge.moveLibrary).not.toHaveBeenCalled();
        expect(screen.getByText('~/gutty-os')).toBeInTheDocument();
    });

    it('moves the library, showing progress, then reloads the games', async () => {
        const onBusyChange = vi.fn();
        let finishMove: (value: unknown) => void = () => undefined;
        bridge.moveLibrary.mockReturnValue(
            new Promise((resolve) => {
                finishMove = resolve;
            })
        );
        render(<LibraryFolderSetting onBusyChange={onBusyChange} />);
        await chooseFolder();

        await userEvent.click(
            screen.getByRole('button', { name: 'Move my library' })
        );
        act(() => reportProgress({ done: 3, total: 8 }));

        expect(bridge.moveLibrary).toHaveBeenCalledWith('folder-token');
        expect(onBusyChange).toHaveBeenLastCalledWith(true);
        expect(screen.getByText('3 of 8 files')).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', { name: 'Moving library' })
        ).toHaveAttribute('value', '3');

        await act(async () => {
            finishMove({
                ok: true,
                location: { displayPath: '~/Games' },
                oldFilesLeft: false,
            });
        });

        expect(onBusyChange).toHaveBeenLastCalledWith(false);
        expect(stopListening).toHaveBeenCalledOnce();
        expect(screen.getByText('~/Games')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Library moved');
        expect(loadGames).toHaveBeenCalledOnce();
    });

    it('mentions old files that could not be removed', async () => {
        bridge.moveLibrary.mockResolvedValue({
            ok: true,
            location: { displayPath: '~/Games' },
            oldFilesLeft: true,
        });
        render(<LibraryFolderSetting />);
        await chooseFolder();

        await userEvent.click(
            screen.getByRole('button', { name: 'Move my library' })
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            "Some files couldn't be removed from the old folder"
        );
    });

    it('reports a failed move and keeps the old location', async () => {
        bridge.moveLibrary.mockResolvedValue({ ok: false, reason: 'failed' });
        render(<LibraryFolderSetting />);
        await chooseFolder();

        await userEvent.click(
            screen.getByRole('button', { name: 'Move my library' })
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            "Couldn't move your library. Nothing was changed"
        );
        expect(screen.getByText('~/gutty-os')).toBeInTheDocument();
        expect(loadGames).not.toHaveBeenCalled();
    });

    it('unlocks the panel even if the move request itself fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const onBusyChange = vi.fn();
        bridge.moveLibrary.mockRejectedValue(new Error('IPC failed'));
        render(<LibraryFolderSetting onBusyChange={onBusyChange} />);
        await chooseFolder();

        await userEvent.click(
            screen.getByRole('button', { name: 'Move my library' })
        );

        expect(onBusyChange).toHaveBeenLastCalledWith(false);
        expect(stopListening).toHaveBeenCalledOnce();
        expect(screen.getByRole('status')).toHaveTextContent(
            "Couldn't move your library"
        );
    });
});
