import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { type Platform, PLATFORM_IDS } from '@shared/game';

type PlatformFolders = Record<Platform, string>;

export type LibraryFolders = {
    root: string;
    roms: PlatformFolders;
    saves: PlatformFolders;
    states: PlatformFolders;
};

const platformFolders = (parent: string): PlatformFolders =>
    Object.fromEntries(
        PLATFORM_IDS.map((platform) => [platform, path.join(parent, platform)])
    ) as PlatformFolders;

/**
 * Library layout:
 *   <root>/roms/{gb,gbc,gba}    game files
 *   <root>/saves/{gb,gbc,gba}   battery saves (.sav)
 *   <root>/states/{gb,gbc,gba}  mGBA save states
 */
export const getLibraryFolders = (root: string): LibraryFolders => ({
    root,
    roms: platformFolders(path.join(root, 'roms')),
    saves: platformFolders(path.join(root, 'saves')),
    states: platformFolders(path.join(root, 'states')),
});

/** Creates any missing library folders. Existing files are never touched. */
export const ensureLibraryFolders = async (root: string) => {
    const folders = getLibraryFolders(root);
    const all = [folders.roms, folders.saves, folders.states].flatMap((group) =>
        Object.values(group)
    );

    await Promise.all(all.map((dir) => mkdir(dir, { recursive: true })));

    return folders;
};
