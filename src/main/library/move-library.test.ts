import {
    chmod,
    mkdir,
    mkdtemp,
    readdir,
    readFile,
    rm,
    stat,
    symlink,
    utimes,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as hashing from './hash-file';
import { ensureLibraryFolders } from './library-folders';
import { checkDestination, moveLibrary } from './move-library';

const exists = (filePath: string) =>
    stat(filePath).then(
        () => true,
        () => false
    );

describe('library move', () => {
    let sandbox: string;
    let oldRoot: string;
    let newRoot: string;

    const put = async (root: string, relative: string, contents: string) => {
        await mkdir(path.dirname(path.join(root, relative)), {
            recursive: true,
        });
        await writeFile(path.join(root, relative), contents);
    };

    beforeEach(async () => {
        sandbox = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        oldRoot = path.join(sandbox, 'gutty-os');
        newRoot = path.join(sandbox, 'Games');
        await ensureLibraryFolders(oldRoot);
        await mkdir(newRoot);
    });

    afterEach(async () => {
        await rm(sandbox, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    describe('checkDestination', () => {
        it('accepts an empty folder, even with a Finder .DS_Store', async () => {
            expect(await checkDestination(oldRoot, newRoot)).toBeUndefined();

            await writeFile(path.join(newRoot, '.DS_Store'), 'finder');
            expect(await checkDestination(oldRoot, newRoot)).toBeUndefined();
        });

        it('rejects a folder with files in it', async () => {
            await writeFile(path.join(newRoot, 'notes.txt'), 'hi');

            expect(await checkDestination(oldRoot, newRoot)).toBe('not-empty');
        });

        it('rejects the current library folder, also through a link', async () => {
            const link = path.join(sandbox, 'link-to-library');
            await symlink(oldRoot, link);

            expect(await checkDestination(oldRoot, oldRoot)).toBe(
                'same-folder'
            );
            expect(await checkDestination(oldRoot, link)).toBe('same-folder');
        });

        it('rejects folders inside or around the current library', async () => {
            const inside = path.join(oldRoot, 'roms', 'new');
            await mkdir(inside);

            expect(await checkDestination(oldRoot, inside)).toBe(
                'inside-library'
            );
            expect(await checkDestination(oldRoot, sandbox)).toBe(
                'contains-library'
            );
        });

        it('rejects files and missing folders', async () => {
            await writeFile(path.join(sandbox, 'file.txt'), 'x');

            expect(
                await checkDestination(oldRoot, path.join(sandbox, 'file.txt'))
            ).toBe('not-a-folder');
            expect(
                await checkDestination(oldRoot, path.join(sandbox, 'nope'))
            ).toBe('not-a-folder');
        });
    });

    describe('moveLibrary', () => {
        beforeEach(async () => {
            await put(oldRoot, 'roms/gba/Emerald.gba', 'emerald');
            await put(oldRoot, 'saves/gba/Emerald.sav', 'progress');
            await put(oldRoot, 'states/gba/Emerald.ss1', 'state');
            await put(oldRoot, 'library.json', '{"version":1,"games":{}}');
        });

        it('moves every file, keeping contents and dates, and removes the old folder', async () => {
            const romDate = new Date('2026-01-02T03:04:05.000Z');
            await utimes(
                path.join(oldRoot, 'roms/gba/Emerald.gba'),
                romDate,
                romDate
            );
            const progress = vi.fn();

            const result = await moveLibrary({
                from: oldRoot,
                to: newRoot,
                onProgress: progress,
                commit: async () => undefined,
            });

            expect(result).toEqual({ oldFilesLeft: false });
            for (const [file, contents] of [
                ['roms/gba/Emerald.gba', 'emerald'],
                ['saves/gba/Emerald.sav', 'progress'],
                ['states/gba/Emerald.ss1', 'state'],
                ['library.json', '{"version":1,"games":{}}'],
            ]) {
                expect(await readFile(path.join(newRoot, file), 'utf8')).toBe(
                    contents
                );
            }
            expect(
                (await stat(path.join(newRoot, 'roms/gba/Emerald.gba'))).mtime
            ).toEqual(romDate);
            // Empty platform folders included, the old library is gone
            expect(await exists(oldRoot)).toBe(false);
            expect(progress.mock.calls).toEqual([
                [{ done: 0, total: 4 }],
                [{ done: 1, total: 4 }],
                [{ done: 2, total: 4 }],
                [{ done: 3, total: 4 }],
                [{ done: 4, total: 4 }],
            ]);
        });

        it('commits only after every file is copied, before deleting', async () => {
            const commit = vi.fn(async () => {
                expect(await exists(path.join(newRoot, 'library.json'))).toBe(
                    true
                );
                expect(
                    await exists(path.join(oldRoot, 'roms/gba/Emerald.gba'))
                ).toBe(true);
            });

            await moveLibrary({ from: oldRoot, to: newRoot, commit });

            expect(commit).toHaveBeenCalledOnce();
        });

        it('leaves files GuttyOS does not manage in the old folder', async () => {
            await put(oldRoot, 'my notes.txt', 'keep me');

            await moveLibrary({
                from: oldRoot,
                to: newRoot,
                commit: async () => undefined,
            });

            expect(
                await readFile(path.join(oldRoot, 'my notes.txt'), 'utf8')
            ).toBe('keep me');
            expect(await exists(path.join(oldRoot, 'roms'))).toBe(false);
        });

        it('undoes the copy and keeps the old library if the commit fails', async () => {
            await expect(
                moveLibrary({
                    from: oldRoot,
                    to: newRoot,
                    commit: async () => {
                        throw new Error('settings not saved');
                    },
                })
            ).rejects.toThrow('settings not saved');

            expect(await readdir(newRoot)).toEqual([]);
            expect(
                await readFile(
                    path.join(oldRoot, 'roms/gba/Emerald.gba'),
                    'utf8'
                )
            ).toBe('emerald');
        });

        it('undoes the copy if a copied file does not match', async () => {
            vi.spyOn(hashing, 'hashFile')
                .mockResolvedValueOnce('original')
                .mockResolvedValueOnce('corrupted');
            const commit = vi.fn();

            await expect(
                moveLibrary({ from: oldRoot, to: newRoot, commit })
            ).rejects.toThrow('does not match');

            expect(commit).not.toHaveBeenCalled();
            expect(await readdir(newRoot)).toEqual([]);
            expect(await exists(path.join(oldRoot, 'library.json'))).toBe(true);
        });

        it('reports old files it could not delete', async () => {
            const romsDir = path.join(oldRoot, 'roms/gba');
            await chmod(romsDir, 0o555);

            try {
                const result = await moveLibrary({
                    from: oldRoot,
                    to: newRoot,
                    commit: async () => undefined,
                });

                expect(result).toEqual({ oldFilesLeft: true });
                expect(
                    await exists(path.join(newRoot, 'roms/gba/Emerald.gba'))
                ).toBe(true);
            } finally {
                await chmod(romsDir, 0o755);
            }
        });
    });
});
