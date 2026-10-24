import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeJsonAtomic } from './write-json-atomic';

describe('writeJsonAtomic', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'gutty-os-test-'));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it('writes pretty-printed JSON, creating missing folders', async () => {
        const filePath = path.join(dir, 'nested', 'data.json');

        await writeJsonAtomic(filePath, { a: 1 });

        expect(await readFile(filePath, 'utf8')).toBe('{\n    "a": 1\n}\n');
    });

    it('replaces an existing file and leaves no temp files behind', async () => {
        const filePath = path.join(dir, 'data.json');

        await writeJsonAtomic(filePath, { version: 1 });
        await writeJsonAtomic(filePath, { version: 2 });

        expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual({
            version: 2,
        });
        expect(await readdir(dir)).toEqual(['data.json']);
    });
});
