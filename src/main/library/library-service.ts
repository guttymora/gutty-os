import path from 'node:path';

import type { Game } from '@shared/game';
import type { ImportResult } from '@shared/import';

import { importGame } from './import-game';
import type { StagedEntry } from './import-staging';
import {
    type LibraryData,
    loadLibrary,
    saveLibrary,
    toGame,
    toGames,
} from './library-file';
import type { LibraryFolders } from './library-folders';
import { hasChanges, type RescanReport, rescanLibrary } from './rescan-library';

const REPORT_LABELS: Record<keyof RescanReport, string> = {
    added: 'Added from the library folder',
    renamed: 'Renamed',
    missing: 'Missing (file not found)',
    restored: 'Back in the library',
    savesMoved: 'Saves moved into saves/',
    saveConflicts: 'Saves left in place (one already exists)',
    misplaced: 'In the wrong platform folder (ignored)',
    duplicates: 'Duplicate copies (ignored)',
};

const logReport = (report: RescanReport) => {
    for (const [key, files] of Object.entries(report)) {
        if (files.length > 0) {
            console.info(
                `Library rescan — ${REPORT_LABELS[key as keyof RescanReport]}: ${files.join(', ')}`
            );
        }
    }
};

/**
 * Holds the library in memory; the main process is the only writer of
 * library.json. Imports run one at a time.
 */
export class LibraryService {
    private importing = false;

    private constructor(
        private readonly folders: LibraryFolders,
        private library: LibraryData
    ) {}

    /** Loads library.json and brings it in line with the files on disk */
    static async open(folders: LibraryFolders) {
        const service = new LibraryService(
            folders,
            await loadLibrary(folders.root)
        );
        await service.rescan();
        return service;
    }

    /** Re-reads roms/ and saves library.json if anything changed */
    async rescan(): Promise<RescanReport> {
        const { library, report } = await rescanLibrary({
            folders: this.folders,
            library: this.library,
        });
        if (library !== this.library) {
            await saveLibrary(this.folders.root, library);
            this.library = library;
        }
        if (hasChanges(report)) {
            logReport(report);
        }
        return report;
    }

    get isImporting() {
        return this.importing;
    }

    getGames(): Game[] {
        return toGames(this.library);
    }

    /** Where a game's ROM and its saves are; undefined if it can't be played */
    getPlayFiles(id: string) {
        const record = this.library.games[id];
        if (!record || record.missing) {
            return undefined;
        }

        return {
            platform: record.platform,
            romPath: path.join(this.folders.root, ...record.file.split('/')),
            savesDir: this.folders.saves[record.platform],
            statesDir: this.folders.states[record.platform],
        };
    }

    /** Adds a finished session to the game's stats and saves library.json */
    async recordPlay(
        id: string,
        startedAt: Date,
        endedAt: Date
    ): Promise<Game | undefined> {
        const record = this.library.games[id];
        if (!record) {
            return undefined;
        }
        const minutes = Math.round(
            Math.max(0, endedAt.getTime() - startedAt.getTime()) / 60_000
        );
        const updated = {
            ...record,
            lastPlayedAt: endedAt.toISOString(),
            playTimeMinutes: record.playTimeMinutes + minutes,
        };
        const library = {
            ...this.library,
            games: { ...this.library.games, [id]: updated },
        };
        await saveLibrary(this.folders.root, library);
        this.library = library;

        return toGame(id, updated);
    }

    async importGame(
        rom: StagedEntry,
        save?: StagedEntry
    ): Promise<ImportResult> {
        if (this.importing) {
            return { status: 'error', reason: 'busy' };
        }
        if (rom.kind !== 'rom' || !rom.platform) {
            return { status: 'error', reason: 'file-not-found' };
        }

        this.importing = true;
        try {
            const { library, result } = await importGame({
                folders: this.folders,
                library: this.library,
                rom: { path: rom.path, platform: rom.platform },
                save: save ? { path: save.path } : undefined,
            });
            if (library !== this.library) {
                await saveLibrary(this.folders.root, library);
                this.library = library;
            }
            return result;
        } catch (error) {
            console.error('Could not import the game:', error);
            return { status: 'error', reason: 'failed' };
        } finally {
            this.importing = false;
        }
    }
}
