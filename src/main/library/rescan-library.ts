import { readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

import { type Platform, PLATFORM_IDS } from '@shared/game';

import { hashFile } from './hash-file';
import { ROM_EXTENSIONS, SAVE_EXTENSION } from './import-staging';
import type { LibraryData, LibraryRecord } from './library-file';
import type { LibraryFolders } from './library-folders';

/** What a rescan changed, by file name (for logs and, later, the UI) */
export type RescanReport = {
    /** ROMs copied into roms/ by hand, now registered */
    added: string[];
    /** Known ROMs found under a new name (their saves follow them) */
    renamed: string[];
    /** Known ROMs whose file is gone (stats kept for when it comes back) */
    missing: string[];
    /** Missing ROMs whose file is back */
    restored: string[];
    /** Saves mGBA left next to a ROM, moved into saves/ */
    savesMoved: string[];
    /** Saves that couldn't be moved because one already exists */
    saveConflicts: string[];
    /** ROMs in the wrong platform folder (e.g. a .gb in roms/gba) */
    misplaced: string[];
    /** Second copies of a ROM that is already in the library */
    duplicates: string[];
};

type RescanInput = {
    folders: LibraryFolders;
    library: LibraryData;
    now?: Date;
};

/** mGBA save states sit next to the save, named <rom>.ss0 to <rom>.ss9 */
const STATE_EXTENSIONS = Array.from({ length: 10 }, (_, slot) => `.ss${slot}`);

const createReport = (): RescanReport => ({
    added: [],
    renamed: [],
    missing: [],
    restored: [],
    savesMoved: [],
    saveConflicts: [],
    misplaced: [],
    duplicates: [],
});

export const hasChanges = (report: RescanReport) =>
    Object.values(report).some((entries) => entries.length > 0);

const exists = (filePath: string) =>
    stat(filePath).then(
        () => true,
        () => false
    );

const listFiles = async (dir: string) => {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        // Skip hidden files (.DS_Store, ._ AppleDouble) and unfinished imports
        return entries
            .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
            .map((entry) => entry.name)
            .filter((name) => !name.endsWith('.importing'));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

const baseName = (file: string) => path.basename(file, path.extname(file));

/** Moves a file unless the destination is already taken */
const moveIfFree = async (from: string, to: string) => {
    if (!(await exists(from))) {
        return 'nothing-to-move';
    }
    if (await exists(to)) {
        return 'taken';
    }
    await rename(from, to);
    return 'moved';
};

/**
 * A renamed ROM takes its save and save states along. Returns the files that
 * stayed behind because the new name was already taken.
 */
const moveGameData = async (
    folders: LibraryFolders,
    from: { platform: Platform; name: string },
    to: { platform: Platform; name: string }
) => {
    const leftBehind: string[] = [];
    for (const [group, extensions] of [
        [folders.saves, [SAVE_EXTENSION]],
        [folders.states, STATE_EXTENSIONS],
    ] as const) {
        for (const extension of extensions) {
            const source = path.join(
                group[from.platform],
                `${from.name}${extension}`
            );
            const result = await moveIfFree(
                source,
                path.join(group[to.platform], `${to.name}${extension}`)
            );
            if (result === 'taken') {
                leftBehind.push(path.relative(folders.root, source));
            }
        }
    }
    return leftBehind;
};

/**
 * Brings library.json in line with what is in roms/:
 * - Files whose path, size and date match their entry are trusted (no hash).
 * - Other ROMs are hashed: a known hash is a renamed game, a new one a game
 *   copied in by hand.
 * - Entries whose file is gone are marked missing, never deleted.
 * - Saves mGBA wrote next to a ROM are moved into saves/.
 */
export const rescanLibrary = async ({
    folders,
    library,
    now = new Date(),
}: RescanInput) => {
    const report = createReport();
    const games: Record<string, LibraryRecord> = { ...library.games };
    const idByFile = new Map(
        Object.entries(games).map(([id, record]) => [record.file, id])
    );
    const found = new Set<string>();
    let changed = false;
    const update = (id: string, record: LibraryRecord) => {
        games[id] = record;
        changed = true;
    };

    for (const platform of PLATFORM_IDS) {
        const romsDir = folders.roms[platform];
        const files = await listFiles(romsDir);
        const romNames = new Set<string>();

        for (const name of files) {
            const extension = path.extname(name).toLowerCase();
            const romPlatform = ROM_EXTENSIONS[extension];
            if (!romPlatform) {
                continue;
            }
            const file = `roms/${platform}/${name}`;
            if (romPlatform !== platform) {
                report.misplaced.push(file);
                continue;
            }
            romNames.add(baseName(name));

            const romPath = path.join(romsDir, name);
            const stats = await stat(romPath);
            const fingerprint = {
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
            };

            // Unchanged file: trust the entry without hashing
            const knownId = idByFile.get(file);
            const known = knownId ? games[knownId] : undefined;
            if (
                knownId &&
                known &&
                !found.has(knownId) &&
                known.size === fingerprint.size &&
                known.modifiedAt === fingerprint.modifiedAt
            ) {
                found.add(knownId);
                if (known.missing) {
                    update(knownId, { ...known, missing: false });
                    report.restored.push(file);
                }
                continue;
            }

            const id = await hashFile(romPath);
            if (found.has(id)) {
                report.duplicates.push(file);
                continue;
            }
            found.add(id);

            const existing = games[id];
            if (!existing) {
                update(id, {
                    platform,
                    file,
                    title: baseName(name),
                    addedAt: now.toISOString(),
                    ...fingerprint,
                    playTimeMinutes: 0,
                    isFavorite: false,
                    rating: 0,
                    missing: false,
                });
                report.added.push(file);
                continue;
            }

            if (existing.file !== file) {
                const leftBehind = await moveGameData(
                    folders,
                    {
                        platform: existing.platform,
                        name: baseName(existing.file),
                    },
                    { platform, name: baseName(name) }
                );
                report.saveConflicts.push(...leftBehind);
                report.renamed.push(file);
            } else if (existing.missing) {
                report.restored.push(file);
            }
            // Same game, maybe with a new name or a new date on disk
            update(id, {
                ...existing,
                platform,
                file,
                ...fingerprint,
                missing: false,
            });
        }

        // Saves mGBA wrote next to a ROM (e.g. when opened outside GuttyOS)
        for (const name of files) {
            if (
                path.extname(name).toLowerCase() !== SAVE_EXTENSION ||
                !romNames.has(baseName(name))
            ) {
                continue;
            }
            const moved = await moveIfFree(
                path.join(romsDir, name),
                path.join(
                    folders.saves[platform],
                    `${baseName(name)}${SAVE_EXTENSION}`
                )
            );
            report[moved === 'moved' ? 'savesMoved' : 'saveConflicts'].push(
                `roms/${platform}/${name}`
            );
        }
    }

    for (const [id, record] of Object.entries(games)) {
        if (!found.has(id) && !record.missing) {
            update(id, { ...record, missing: true });
            report.missing.push(record.file);
        }
    }

    return {
        /** A new object only when library.json needs saving */
        library: changed ? { ...library, games } : library,
        report,
    };
};
