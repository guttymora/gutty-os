import type { Game } from '@shared/game';
import type { ImportResult } from '@shared/import';

import { importGame } from './import-game';
import type { StagedEntry } from './import-staging';
import {
    type LibraryData,
    loadLibrary,
    saveLibrary,
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

    getGames(): Game[] {
        return toGames(this.library);
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
