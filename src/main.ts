import { app, BrowserWindow } from 'electron';

import { registerImportIpc } from './main/ipc/import';
import { registerLibraryIpc } from './main/ipc/library';
import { registerWindowControls } from './main/ipc/window-controls';
import { ImportStaging } from './main/library/import-staging';
import { initLibrary } from './main/library/init-library';
import { LibraryService } from './main/library/library-service';
import { createMainWindow } from './main/windows/main-window';

app.whenReady().then(async () => {
    let library: LibraryService | undefined;
    try {
        const { folders } = await initLibrary(
            app.getPath('userData'),
            app.getPath('home')
        );
        library = await LibraryService.open(folders);
    } catch (error) {
        // The UI can still open; library errors get surfaced in a later stage
        console.error('Could not prepare the game library:', error);
    }

    registerWindowControls();
    registerLibraryIpc(() => library?.getGames() ?? []);
    registerImportIpc({
        staging: new ImportStaging(),
        getLibrary: () => library,
    });
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
