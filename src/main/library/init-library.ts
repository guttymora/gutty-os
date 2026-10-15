import { loadSettings } from '../settings/settings';

import { ensureLibraryFolders } from './library-folders';

/**
 * Startup step: reads the settings (creating them on first launch) and makes
 * sure the library folder structure exists, without asking the user.
 */
export const initLibrary = async (userDataDir: string, homeDir: string) => {
    const settings = await loadSettings(userDataDir, homeDir);
    const folders = await ensureLibraryFolders(settings.libraryPath);

    return { settings, folders };
};
