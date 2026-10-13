import { app, BrowserWindow } from 'electron';

import type { Game } from '@shared/game';

import { registerLibraryIpc } from './main/ipc/library';
import { registerWindowControls } from './main/ipc/window-controls';
import { initLibrary } from './main/library/init-library';
import { loadLibrary, toGames } from './main/library/library-file';
import { createMainWindow } from './main/windows/main-window';

app.whenReady().then(async () => {
    let games: Game[] = [];
    try {
        const { folders } = await initLibrary(
            app.getPath('userData'),
            app.getPath('home')
        );
        games = toGames(await loadLibrary(folders.root));
    } catch (error) {
        // The UI can still open; library errors get surfaced in a later stage
        console.error('Could not prepare the game library:', error);
    }

    registerWindowControls();
    registerLibraryIpc(() => games);
    createMainWindow();

    // On macOS it's common to re-create a window when the dock icon is
    // clicked and there are no other windows open.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// On macOS apps stay active until the user quits explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
