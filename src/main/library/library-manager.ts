import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { Game } from '@shared/game';
import type { ImportResult } from '@shared/import';
import type { LaunchResult } from '@shared/launch';
import type {
    ChooseFolderResult,
    LibraryLocation,
    MoveLibraryProgress,
    MoveLibraryResult,
} from '@shared/library-location';

import { getLaunchCommand } from '../emulator/emulators';
import { GameSession } from '../emulator/game-session';
import { saveSettings, type Settings } from '../settings/settings';

import type { StagedEntry } from './import-staging';
import { initLibrary } from './init-library';
import { ensureLibraryFolders } from './library-folders';
import { LibraryService } from './library-service';
import { checkDestination, moveLibrary } from './move-library';

/** "/Users/player/gutty-os" -> "~/gutty-os" */
export const toDisplayPath = (folder: string, homeDir: string) =>
    folder === homeDir || folder.startsWith(`${homeDir}${path.sep}`)
        ? `~${folder.slice(homeDir.length)}`
        : folder;

/**
 * Owns the settings and the active library. Moving the library never runs
 * at the same time as an import or a game being played.
 */
export class LibraryManager {
    private moving = false;
    /** Folders picked in the dialog, by token, until the move is confirmed */
    private readonly pendingFolders = new Map<string, string>();

    private constructor(
        private readonly userDataDir: string,
        private readonly homeDir: string,
        private settings: Settings,
        private library: LibraryService,
        private readonly session: GameSession
    ) {}

    static async start(
        userDataDir: string,
        homeDir: string,
        session = new GameSession()
    ) {
        const { settings, folders } = await initLibrary(userDataDir, homeDir);

        return new LibraryManager(
            userDataDir,
            homeDir,
            settings,
            await LibraryService.open(folders),
            session
        );
    }

    getGames() {
        return this.library.getGames();
    }

    getLocation(): LibraryLocation {
        return {
            displayPath: toDisplayPath(this.settings.libraryPath, this.homeDir),
        };
    }

    importGame(rom: StagedEntry, save?: StagedEntry): Promise<ImportResult> {
        if (this.moving) {
            return Promise.resolve({ status: 'error', reason: 'busy' });
        }
        return this.library.importGame(rom, save);
    }

    /**
     * Starts the game in its emulator. Once the emulator quits, `onExit` gets
     * the game with its stats updated (undefined if they couldn't be saved).
     */
    launchGame(
        id: string,
        onExit: (game: Game | undefined) => void
    ): Promise<LaunchResult> {
        if (this.moving) {
            return Promise.resolve({ ok: false, reason: 'busy' });
        }
        const files = this.library.getPlayFiles(id);
        if (!files) {
            return Promise.resolve({ ok: false, reason: 'game-not-found' });
        }
        const command = getLaunchCommand(files.platform, {
            settings: this.settings,
            romPath: files.romPath,
            savesDir: files.savesDir,
            statesDir: files.statesDir,
            baseEnv: process.env,
        });
        // The library can't move while playing, so this is still the same one
        const library = this.library;

        return this.session.start(id, command, ({ startedAt, endedAt }) => {
            library.recordPlay(id, startedAt, endedAt).then(onExit, (error) => {
                console.error('Could not save the play time:', error);
                onExit(undefined);
            });
        });
    }

    /** Validates a folder picked as the new location and hands out a token */
    async stageFolder(folder: string): Promise<ChooseFolderResult> {
        const reason = await checkDestination(
            this.settings.libraryPath,
            folder
        );
        if (reason) {
            return { ok: false, reason };
        }
        const token = randomUUID();
        this.pendingFolders.set(token, folder);

        return {
            ok: true,
            token,
            displayPath: toDisplayPath(folder, this.homeDir),
        };
    }

    async moveTo(
        token: unknown,
        onProgress?: (progress: MoveLibraryProgress) => void
    ): Promise<MoveLibraryResult> {
        const destination =
            typeof token === 'string'
                ? this.pendingFolders.get(token)
                : undefined;
        if (!destination) {
            return { ok: false, reason: 'folder-not-found' };
        }
        if (this.moving || this.library.isImporting || this.session.isRunning) {
            return { ok: false, reason: 'busy' };
        }
        // Take the lock before anything async, so no import can sneak in
        this.moving = true;
        try {
            return await this.moveLocked(destination, onProgress);
        } finally {
            this.moving = false;
        }
    }

    private async moveLocked(
        destination: string,
        onProgress?: (progress: MoveLibraryProgress) => void
    ): Promise<MoveLibraryResult> {
        // The folder may have changed since it was picked
        const problem = await checkDestination(
            this.settings.libraryPath,
            destination
        );
        if (problem) {
            return {
                ok: false,
                reason:
                    problem === 'not-empty' ? 'not-empty' : 'folder-not-found',
            };
        }

        const settings: Settings = {
            ...this.settings,
            libraryPath: destination,
        };
        let oldFilesLeft: boolean;
        try {
            ({ oldFilesLeft } = await moveLibrary({
                from: this.settings.libraryPath,
                to: destination,
                onProgress,
                commit: () => saveSettings(this.userDataDir, settings),
            }));
        } catch (error) {
            console.error('Could not move the library:', error);
            return { ok: false, reason: 'failed' };
        }
        this.settings = settings;
        this.pendingFolders.clear();

        try {
            this.library = await LibraryService.open(
                await ensureLibraryFolders(destination)
            );
        } catch (error) {
            console.error('Could not open the moved library:', error);
            return { ok: false, reason: 'reload-failed' };
        }
        return { ok: true, location: this.getLocation(), oldFilesLeft };
    }
}
