import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportStaging, MAX_ROM_BYTES, MAX_SAVE_BYTES } from './import-staging';

describe('ImportStaging', () => {
    let dir: string;
    let staging: ImportStaging;

    const file = async (name: string, contents: string | Buffer = 'bytes') => {
        const filePath = path.join(dir, name);
        await writeFile(filePath, contents);
        return filePath;
    };

    beforeEach(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
        staging = new ImportStaging();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it.each([
        ['Tetris.gb', 'gb'],
        ['Wario Land 3.gbc', 'gbc'],
        ['Golden Sun.GBA', 'gba'],
    ])('stages %s as a %s ROM', async (name, platform) => {
        const result = await staging.stage(await file(name));

        expect(result).toMatchObject({
            ok: true,
            file: { name, kind: 'rom', platform },
        });
    });

    it('stages a .sav file as a save', async () => {
        const result = await staging.stage(await file('Tetris.sav'));

        expect(result).toMatchObject({ ok: true, file: { kind: 'save' } });
    });

    it('suggests the save that sits next to the ROM', async () => {
        await file('Pokemon Emerald.sav', 'save-bytes');

        const result = await staging.stage(await file('Pokemon Emerald.gba'));

        expect(result).toMatchObject({
            ok: true,
            suggestedSave: { name: 'Pokemon Emerald.sav', kind: 'save' },
        });
    });

    it('rejects unsupported file types', async () => {
        expect(await staging.stage(await file('game.zip'))).toEqual({
            ok: false,
            reason: 'unsupported',
        });
    });

    it('rejects a file of the wrong kind for the dialog', async () => {
        expect(await staging.stage(await file('Tetris.gb'), 'save')).toEqual({
            ok: false,
            reason: 'unsupported',
        });
    });

    it('rejects empty and oversized files', async () => {
        expect(await staging.stage(await file('Empty.gb', ''))).toEqual({
            ok: false,
            reason: 'empty',
        });
        expect(
            await staging.stage(
                await file('Huge.gba', Buffer.alloc(MAX_ROM_BYTES + 1))
            )
        ).toEqual({ ok: false, reason: 'too-large' });
        expect(
            await staging.stage(
                await file('Huge.sav', Buffer.alloc(MAX_SAVE_BYTES + 1))
            )
        ).toEqual({ ok: false, reason: 'too-large' });
    });

    it('rejects folders, missing files and relative paths', async () => {
        await mkdir(path.join(dir, 'Folder.gba'));

        for (const filePath of [
            path.join(dir, 'Folder.gba'),
            path.join(dir, 'Missing.gba'),
            'relative/Tetris.gb',
        ]) {
            expect(await staging.stage(filePath)).toEqual({
                ok: false,
                reason: 'not-a-file',
            });
        }
        // The system error is logged to help diagnose access problems
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Missing.gba: ENOENT')
        );
    });

    it('resolves tokens by kind until they are released', async () => {
        const romPath = await file('Tetris.gb');
        const result = await staging.stage(romPath);
        if (!result.ok) {
            throw new Error('expected the ROM to be staged');
        }
        const { token } = result.file;

        expect(staging.get(token, 'rom')).toEqual({
            path: romPath,
            kind: 'rom',
            platform: 'gb',
        });
        expect(staging.get(token, 'save')).toBeUndefined();
        expect(staging.get(42, 'rom')).toBeUndefined();

        staging.release(token, undefined);
        expect(staging.get(token, 'rom')).toBeUndefined();
    });
});
