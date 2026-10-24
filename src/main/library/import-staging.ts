import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import type { Platform } from '@shared/game';
import type { ImportFileKind, StagedFile, StageResult } from '@shared/import';

export const ROM_EXTENSIONS: Record<string, Platform> = {
    '.gb': 'gb',
    '.gbc': 'gbc',
    '.gba': 'gba',
};
export const SAVE_EXTENSION = '.sav';

/** The largest GBA cartridge is 32 MiB */
export const MAX_ROM_BYTES = 32 * 1024 * 1024;
/** GBA saves top out at 128 KiB; leave room for extra emulator data */
export const MAX_SAVE_BYTES = 1024 * 1024;

export type StagedEntry = {
    path: string;
    kind: ImportFileKind;
    platform?: Platform;
};

const kindOf = (filePath: string) => {
    const extension = path.extname(filePath).toLowerCase();
    if (extension in ROM_EXTENSIONS) {
        return { kind: 'rom' as const, platform: ROM_EXTENSIONS[extension] };
    }
    if (extension === SAVE_EXTENSION) {
        return { kind: 'save' as const };
    }
    return null;
};

const statFile = async (filePath: string) => {
    try {
        const stats = await stat(filePath);
        return stats.isFile() ? stats : null;
    } catch (error) {
        // e.g. EPERM when macOS hasn't granted access to an external drive
        console.warn(
            `Can't read ${filePath}: ${(error as NodeJS.ErrnoException).code}`
        );
        return null;
    }
};

/**
 * Validates files the user picked or dropped and hands out opaque tokens, so
 * the renderer never sends file paths when importing.
 */
export class ImportStaging {
    private readonly entries = new Map<string, StagedEntry>();

    /** Validates a file; optionally requires a given kind (rom or save) */
    async stage(
        filePath: string,
        expectedKind?: ImportFileKind
    ): Promise<StageResult> {
        if (!path.isAbsolute(filePath)) {
            return { ok: false, reason: 'not-a-file' };
        }
        const type = kindOf(filePath);
        if (!type || (expectedKind && type.kind !== expectedKind)) {
            console.warn(`Not a ${expectedKind ?? 'ROM or save'}: ${filePath}`);
            return { ok: false, reason: 'unsupported' };
        }
        const stats = await statFile(filePath);
        if (!stats) {
            return { ok: false, reason: 'not-a-file' };
        }
        if (stats.size === 0) {
            return { ok: false, reason: 'empty' };
        }
        const maxBytes = type.kind === 'rom' ? MAX_ROM_BYTES : MAX_SAVE_BYTES;
        if (stats.size > maxBytes) {
            return { ok: false, reason: 'too-large' };
        }

        const file = this.add({ path: filePath, ...type });
        if (type.kind !== 'rom') {
            return { ok: true, file };
        }

        // Offer the save that sits next to the ROM, as mGBA would use it
        const siblingSave = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, path.extname(filePath))}${SAVE_EXTENSION}`
        );
        const saveStats = await statFile(siblingSave);
        const suggestedSave =
            saveStats && saveStats.size > 0 && saveStats.size <= MAX_SAVE_BYTES
                ? this.add({ path: siblingSave, kind: 'save' })
                : undefined;

        return { ok: true, file, suggestedSave };
    }

    /** Returns the staged file for a token if it has the right kind */
    get(token: unknown, kind: ImportFileKind): StagedEntry | undefined {
        if (typeof token !== 'string') {
            return undefined;
        }
        const entry = this.entries.get(token);

        return entry?.kind === kind ? entry : undefined;
    }

    /** Forgets tokens once their files have been imported */
    release(...tokens: unknown[]) {
        for (const token of tokens) {
            if (typeof token === 'string') {
                this.entries.delete(token);
            }
        }
    }

    private add(entry: StagedEntry): StagedFile {
        const token = randomUUID();
        this.entries.set(token, entry);

        return {
            token,
            name: path.basename(entry.path),
            kind: entry.kind,
            platform: entry.platform,
        };
    }
}
