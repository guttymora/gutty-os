import { constants } from 'node:fs';
import {
    copyFile,
    mkdir,
    readdir,
    realpath,
    rm,
    rmdir,
    stat,
    unlink,
    utimes,
} from 'node:fs/promises';
import path from 'node:path';

import type {
    ChooseFolderErrorReason,
    MoveLibraryProgress,
} from '@shared/library-location';

import { hashFile } from './hash-file';
import { LIBRARY_FILE_NAME } from './library-file';

/** What gets moved: everything GuttyOS manages inside the library folder */
const LIBRARY_ENTRIES = ['roms', 'saves', 'states', LIBRARY_FILE_NAME];

/** Files Finder may create in a brand-new folder; they don't make it "used" */
const IGNORED_FILES = new Set(['.DS_Store']);

const isInside = (parent: string, child: string) => {
    const relative = path.relative(parent, child);
    return (
        relative !== '' &&
        !relative.startsWith('..') &&
        !path.isAbsolute(relative)
    );
};

/**
 * Checks a folder picked as the new library location. It must be an empty
 * folder, and neither inside nor around the current library.
 */
export const checkDestination = async (
    currentRoot: string,
    destination: string
): Promise<ChooseFolderErrorReason | undefined> => {
    let resolved: string;
    try {
        if (!(await stat(destination)).isDirectory()) {
            return 'not-a-folder';
        }
        resolved = await realpath(destination);
    } catch {
        return 'not-a-folder';
    }
    // The current library may not exist (e.g. a drive that's gone)
    const current = await realpath(currentRoot).catch(() => currentRoot);

    if (resolved === current) {
        return 'same-folder';
    }
    if (isInside(current, resolved)) {
        return 'inside-library';
    }
    if (isInside(resolved, current)) {
        return 'contains-library';
    }
    const entries = await readdir(resolved);
    if (entries.some((entry) => !IGNORED_FILES.has(entry))) {
        return 'not-empty';
    }
    return undefined;
};

/** Every file and folder to move, as paths relative to the library root */
const listLibrary = async (root: string) => {
    const files: string[] = [];
    const folders: string[] = [];
    const walk = async (relative: string) => {
        const absolute = path.join(root, relative);
        const stats = await stat(absolute).catch(() => null);
        if (stats?.isFile()) {
            files.push(relative);
        } else if (stats?.isDirectory()) {
            folders.push(relative);
            for (const entry of await readdir(absolute)) {
                if (!IGNORED_FILES.has(entry)) {
                    await walk(path.join(relative, entry));
                }
            }
        }
    };
    for (const entry of LIBRARY_ENTRIES) {
        await walk(entry);
    }
    return { files, folders };
};

/** Copies a file keeping its dates, and checks the copy matches */
const copyVerified = async (source: string, destination: string) => {
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination, constants.COPYFILE_EXCL);
    const stats = await stat(source);
    // Same dates, so the rescan in the new folder trusts the files
    await utimes(destination, stats.atime, stats.mtime);
    const [sourceHash, copyHash] = await Promise.all([
        hashFile(source),
        hashFile(destination),
    ]);
    if (sourceHash !== copyHash) {
        throw new Error(`Copy of ${source} does not match the original`);
    }
};

/** Removes empty folders from the deepest up; keeps any that aren't empty */
const removeEmptyFolders = async (root: string, folders: string[]) => {
    const deepestFirst = [...folders].sort(
        (a, b) => b.split(path.sep).length - a.split(path.sep).length
    );
    for (const folder of [...deepestFirst, '.']) {
        // Finder may have left a .DS_Store behind
        await rm(path.join(root, folder, '.DS_Store'), { force: true });
        await rmdir(path.join(root, folder)).catch(() => undefined);
    }
};

type MoveLibraryInput = {
    from: string;
    to: string;
    onProgress?: (progress: MoveLibraryProgress) => void;
    /** Runs after every file is copied and verified, before old ones go */
    commit: () => Promise<void>;
};

/**
 * Moves the library to a new (empty) folder without risking any file:
 * 1. Copy every file and verify each copy's hash. If anything fails, the
 *    copies are removed and the old library is left untouched.
 * 2. `commit()` (e.g. save the new path in settings.json).
 * 3. Delete the old files and their now-empty folders.
 * Returns whether some old files couldn't be deleted.
 */
export const moveLibrary = async ({
    from,
    to,
    onProgress,
    commit,
}: MoveLibraryInput) => {
    const { files, folders } = await listLibrary(from);
    const total = files.length;
    onProgress?.({ done: 0, total });

    try {
        for (const [index, file] of files.entries()) {
            await copyVerified(path.join(from, file), path.join(to, file));
            onProgress?.({ done: index + 1, total });
        }
        await commit();
    } catch (error) {
        // Undo: the destination was empty, so remove what was copied into it
        await Promise.all(
            LIBRARY_ENTRIES.map((entry) =>
                rm(path.join(to, entry), { recursive: true, force: true })
            )
        );
        throw error;
    }

    let oldFilesLeft = false;
    for (const file of files) {
        await unlink(path.join(from, file)).catch(() => {
            oldFilesLeft = true;
        });
    }
    await removeEmptyFolders(from, folders);

    return { oldFilesLeft };
};
