import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashFile } from './hash-file';

describe('hashFile', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it('returns the SHA-1 of the file contents', async () => {
        const filePath = path.join(dir, 'game.gba');
        // Bigger than one 64 KiB read chunk
        const contents = Buffer.alloc(200 * 1024, 7);
        await writeFile(filePath, contents);

        expect(await hashFile(filePath)).toBe(
            createHash('sha1').update(contents).digest('hex')
        );
    });

    it('gives the same hash for the same contents under any name', async () => {
        await writeFile(path.join(dir, 'Emerald.gba'), 'same-bytes');
        await writeFile(path.join(dir, 'Emerald (copy).gba'), 'same-bytes');

        expect(await hashFile(path.join(dir, 'Emerald.gba'))).toBe(
            await hashFile(path.join(dir, 'Emerald (copy).gba'))
        );
    });

    it('rejects when the file cannot be read', async () => {
        await expect(hashFile(path.join(dir, 'nope.gba'))).rejects.toThrow();
    });
});
