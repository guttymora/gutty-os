import { constants } from 'node:fs';
import { copyFile, rename, rm, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

import type { Platform } from '@shared/game';
import type { ImportResult, ImportWarning } from '@shared/import';

import { hashFile } from './hash-file';
import { SAVE_EXTENSION } from './import-staging';
import { type LibraryData, type LibraryRecord, toGame } from './library-file';
import type { LibraryFolders } from './library-folders';

type ImportGameInput = {
    folders: LibraryFolders;
    library: LibraryData;
    rom: { path: string; platform: Platform };
    save?: { path: string };
    now?: Date;
};

type ImportGameOutput = {
    /** A new object when the library changed, the same one otherwise */
    library: LibraryData;
    result: ImportResult;
};

const exists = async (filePath: string) =>
    stat(filePath).then(
        () => true,
        () => false
    );

/** library.json stores paths relative to the library, with "/" separators */
const toLibraryPath = (root: string, filePath: string) =>
    path.relative(root, filePath).split(path.sep).join('/');

/**
 * Picks a name not used by a ROM or a save of that platform:
 * "Tetris", then "Tetris (2)", "Tetris (3)"...
 */
const findFreeName = async (
    folders: LibraryFolders,
    platform: Platform,
    baseName: string,
    romExtension: string
) => {
    for (let copy = 1; ; copy++) {
        const name = copy === 1 ? baseName : `${baseName} (${copy})`;
        const taken =
            (await exists(
                path.join(folders.roms[platform], `${name}${romExtension}`)
            )) ||
            (await exists(
                path.join(folders.saves[platform], `${name}${SAVE_EXTENSION}`)
            ));
        if (!taken) {
            return name;
        }
    }
};

/**
 * Moves a file safely, even across drives: copy next to the destination,
 * check the copy's hash, rename it into place, then delete the original.
 * Returns whether the original could be deleted.
 */
const moveVerified = async (
    source: string,
    destination: string,
    expectedHash: string
) => {
    const tempPath = `${destination}.importing`;
    await copyFile(source, tempPath, constants.COPYFILE_EXCL);
    try {
        if ((await hashFile(tempPath)) !== expectedHash) {
            throw new Error(`Copy of ${source} does not match the original`);
        }
        await rename(tempPath, destination);
    } catch (error) {
        await rm(tempPath, { force: true });
        throw error;
    }

    return unlink(source).then(
        () => true,
        () => false
    );
};

/**
 * Adds one game (and optionally its save) to the library:
 * 1. Hash the ROM; if it's already in the library, stop (nothing is moved).
 * 2. Move the ROM to roms/<platform>/ and the save to saves/<platform>/,
 *    named after the ROM so mGBA finds it.
 * 3. Return the library with the new (or restored) entry.
 */
export const importGame = async ({
    folders,
    library,
    rom,
    save,
    now = new Date(),
}: ImportGameInput): Promise<ImportGameOutput> => {
    const id = await hashFile(rom.path);
    const existing = library.games[id];

    if (existing && !existing.missing) {
        return {
            library,
            result: { status: 'duplicate', game: toGame(id, existing) },
        };
    }

    const romExtension = path.extname(rom.path).toLowerCase();
    // A game coming back keeps its old name, so its save still matches
    const name = existing
        ? path.basename(existing.file, path.extname(existing.file))
        : await findFreeName(
              folders,
              rom.platform,
              path.basename(rom.path, path.extname(rom.path)),
              romExtension
          );
    const romDestination = path.join(
        folders.roms[rom.platform],
        `${name}${romExtension}`
    );
    const saveDestination = path.join(
        folders.saves[rom.platform],
        `${name}${SAVE_EXTENSION}`
    );

    const warnings: ImportWarning[] = [];
    if (!(await moveVerified(rom.path, romDestination, id))) {
        warnings.push('original-not-removed');
    }

    if (save) {
        if (await exists(saveDestination)) {
            // Never overwrite a save that is already in the library
            warnings.push('existing-save-kept');
        } else {
            try {
                const saveHash = await hashFile(save.path);
                if (
                    !(await moveVerified(save.path, saveDestination, saveHash))
                ) {
                    warnings.push('save-original-not-removed');
                }
            } catch (error) {
                console.error('Could not import the save file:', error);
                warnings.push('save-not-imported');
            }
        }
    }

    const romStats = await stat(romDestination);
    const record: LibraryRecord = {
        ...(existing ?? {
            title: name,
            addedAt: now.toISOString(),
            playTimeMinutes: 0,
            isFavorite: false,
            rating: 0,
        }),
        platform: rom.platform,
        file: toLibraryPath(folders.root, romDestination),
        size: romStats.size,
        modifiedAt: romStats.mtime.toISOString(),
        missing: false,
    };

    return {
        library: { ...library, games: { ...library.games, [id]: record } },
        result: { status: 'added', game: toGame(id, record), warnings },
    };
};
