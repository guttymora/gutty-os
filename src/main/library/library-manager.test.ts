import {
    chmod,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryManager, toDisplayPath } from './library-manager';
import { LibraryService } from './library-service';

const exists = (filePath: string) =>
    stat(filePath).then(
        () => true,
        () => false
    );

describe('toDisplayPath', () => {
    it.each([
        ['/Users/player/gutty-os', '~/gutty-os'],
        ['/Users/player', '~'],
        ['/Users/player-two/gutty-os', '/Users/player-two/gutty-os'],
        ['/Volumes/Games/gutty-os', '/Volumes/Games/gutty-os'],
    ])('shows %s as %s', (folder, expected) => {
        expect(toDisplayPath(folder, '/Users/player')).toBe(expected);
    });
});

describe('LibraryManager', () => {
    let sandbox: string;
    let home: string;
    let userData: string;
    let manager: LibraryManager;
    let newFolder: string;

    beforeEach(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        home = path.join(sandbox, 'home');
        userData = path.join(sandbox, 'userData');
        newFolder = path.join(sandbox, 'Games');
        await mkdir(newFolder);
        manager = await LibraryManager.start(userData, home);
    });

    afterEach(async () => {
        await rm(sandbox, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    const addRomByHand = async () => {
        await writeFile(
            path.join(home, 'gutty-os/roms/gba/Golden Sun.gba'),
            'golden sun'
        );
        // Restart so the rescan picks it up
        manager = await LibraryManager.start(userData, home);
    };

    const stage = async (folder = newFolder) => {
        const result = await manager.stageFolder(folder);
        if (!result.ok) {
            throw new Error(`expected ${folder} to be accepted`);
        }
        return result;
    };

    it('starts with the library in ~/gutty-os', () => {
        expect(manager.getLocation()).toEqual({ displayPath: '~/gutty-os' });
    });

    it('accepts an empty folder and rejects a used one', async () => {
        expect(await manager.stageFolder(newFolder)).toMatchObject({
            ok: true,
            displayPath: newFolder,
        });

        await writeFile(path.join(newFolder, 'notes.txt'), 'x');
        expect(await manager.stageFolder(newFolder)).toEqual({
            ok: false,
            reason: 'not-empty',
        });
    });

    it('moves the library and remembers the new folder', async () => {
        await addRomByHand();
        const { token } = await stage();
        const progress = vi.fn();

        const result = await manager.moveTo(token, progress);

        expect(result).toEqual({
            ok: true,
            location: { displayPath: newFolder },
            oldFilesLeft: false,
        });
        expect(progress).toHaveBeenCalled();
        expect(manager.getGames().map((game) => game.title)).toEqual([
            'Golden Sun',
        ]);
        expect(await exists(path.join(home, 'gutty-os'))).toBe(false);
        expect(
            await readFile(
                path.join(newFolder, 'roms/gba/Golden Sun.gba'),
                'utf8'
            )
        ).toBe('golden sun');
        const settings = JSON.parse(
            await readFile(path.join(userData, 'settings.json'), 'utf8')
        );
        expect(settings.libraryPath).toBe(newFolder);

        // After a restart the library loads from the new folder
        const restarted = await LibraryManager.start(userData, home);
        expect(restarted.getLocation()).toEqual({ displayPath: newFolder });
        expect(restarted.getGames()).toHaveLength(1);
    });

    it('refuses an unknown folder token', async () => {
        expect(await manager.moveTo('made-up')).toEqual({
            ok: false,
            reason: 'folder-not-found',
        });
        expect(await manager.moveTo(42)).toEqual({
            ok: false,
            reason: 'folder-not-found',
        });
    });

    it('checks the folder again before moving', async () => {
        const { token } = await stage();
        await writeFile(path.join(newFolder, 'surprise.txt'), 'x');

        expect(await manager.moveTo(token)).toEqual({
            ok: false,
            reason: 'not-empty',
        });
    });

    it('reports a picked folder that disappeared', async () => {
        const { token } = await stage();
        await rm(newFolder, { recursive: true });

        expect(await manager.moveTo(token)).toEqual({
            ok: false,
            reason: 'folder-not-found',
        });
    });

    it('keeps everything in place when the move fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        await addRomByHand();
        const { token } = await stage();
        await chmod(newFolder, 0o555);

        try {
            expect(await manager.moveTo(token)).toEqual({
                ok: false,
                reason: 'failed',
            });
        } finally {
            await chmod(newFolder, 0o755);
        }
        expect(manager.getLocation()).toEqual({ displayPath: '~/gutty-os' });
        expect(
            await exists(path.join(home, 'gutty-os/roms/gba/Golden Sun.gba'))
        ).toBe(true);
    });

    it('reports a moved library that could not be opened', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const { token } = await stage();
        vi.spyOn(LibraryService, 'open').mockRejectedValueOnce(
            new Error('cannot open')
        );

        expect(await manager.moveTo(token)).toEqual({
            ok: false,
            reason: 'reload-failed',
        });
        // The files did move, so the new folder is the library now
        expect(manager.getLocation()).toEqual({ displayPath: newFolder });
    });

    it('does not import a game while the library is moving', async () => {
        const { token } = await stage();

        const moving = manager.moveTo(token);
        const imported = await manager.importGame({
            path: '/x.gb',
            kind: 'rom',
            platform: 'gb',
        });
        await moving;

        expect(imported).toEqual({ status: 'error', reason: 'busy' });
    });

    it('does not move the library while a game is being imported', async () => {
        const rom = path.join(sandbox, 'Tetris.gb');
        await writeFile(rom, 'tetris');
        const { token } = await stage();

        const importing = manager.importGame({
            path: rom,
            kind: 'rom',
            platform: 'gb',
        });
        const moved = await manager.moveTo(token);
        await importing;

        expect(moved).toEqual({ ok: false, reason: 'busy' });
    });
});
