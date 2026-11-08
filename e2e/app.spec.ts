import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
    createUserDataDir,
    getFakeMgbaLogPath,
    getTestLibraryPath,
    launchApp,
    type LaunchedApp,
    removeUserDataDir,
    skipSplash,
} from './launch-app';

let userDataDir: string;
let launched: LaunchedApp;

test.beforeEach(async () => {
    userDataDir = createUserDataDir();
    launched = await launchApp(userDataDir);
});

test.afterEach(async () => {
    await launched.app.close();
    removeUserDataDir(userDataDir);
});

test.describe('window', () => {
    test('opens a frameless 960x720 window locked to 4:3', async () => {
        const { app } = launched;

        // The window is created hidden and shown on ready-to-show, which can
        // land after domcontentloaded: wait for it instead of reading once
        await expect
            .poll(() =>
                app.evaluate(({ BrowserWindow }) =>
                    BrowserWindow.getAllWindows()[0].isVisible()
                )
            )
            .toBe(true);

        const bounds = await app.evaluate(({ BrowserWindow, screen }) => {
            const window = BrowserWindow.getAllWindows()[0];

            return {
                size: window.getSize(),
                contentSize: window.getContentSize(),
                minimumSize: window.getMinimumSize(),
                workArea: screen.getPrimaryDisplay().workAreaSize,
            };
        });

        const [width, height] = bounds.contentSize;
        if (bounds.workArea.width >= 960 && bounds.workArea.height >= 720) {
            expect(bounds.contentSize).toEqual([960, 720]);
        } else {
            // Small screens (e.g. CI runners): macOS shrinks the window to
            // fit, keeping the 4:3 ratio
            expect(width).toBeLessThanOrEqual(bounds.workArea.width);
            expect(height).toBeLessThanOrEqual(bounds.workArea.height);
            expect(width / height).toBeCloseTo(4 / 3, 2);
        }
        // Frameless: no native title bar, so the window is all content
        expect(bounds.size).toEqual(bounds.contentSize);
        expect(bounds.minimumSize).toEqual([640, 480]);
    });

    test('shows the splash, then the library', async () => {
        const { window } = launched;

        await expect(
            window.getByRole('img', { name: 'GuttyOS' })
        ).toBeVisible();
        await skipSplash(window);

        await expect(
            window.getByRole('navigation', { name: 'Platforms' })
        ).toBeVisible();
        await expect(window.getByText('GuttyOS • GAMES')).toBeVisible();
    });
});

test.describe('game library folder', () => {
    test('creates the library folders on first launch', async () => {
        const library = getTestLibraryPath(userDataDir);

        await expect
            .poll(() =>
                ['roms', 'saves', 'states'].flatMap((kind) =>
                    ['gb', 'gbc', 'gba'].filter(
                        (platform) =>
                            !existsSync(path.join(library, kind, platform))
                    )
                )
            )
            .toEqual([]);
    });
});

test.describe('adding a game', () => {
    test('moves a chosen ROM and its save into the library', async () => {
        const { app, window } = launched;
        await skipSplash(window);
        const downloads = path.join(userDataDir, 'Downloads');
        mkdirSync(downloads);
        const romPath = path.join(downloads, 'Homebrew Quest.gb');
        writeFileSync(romPath, 'homebrew-rom-bytes');
        writeFileSync(path.join(downloads, 'Homebrew Quest.sav'), 'progress');
        // Answer the native file dialog with the ROM
        await app.evaluate(({ dialog }, filePath) => {
            dialog.showOpenDialog = async () => ({
                canceled: false,
                filePaths: [filePath],
            });
        }, romPath);

        await window.getByRole('button', { name: /Add a game/ }).click();
        await window.getByRole('button', { name: 'Choose ROM' }).click();
        // The save next to the ROM is picked up automatically
        await expect(window.getByText('Homebrew Quest.sav')).toBeVisible();
        await window.getByRole('button', { name: 'Add game' }).click();

        // The dialog closes and the new game is selected
        await expect(
            window.getByRole('dialog', { name: 'Add a game' })
        ).toBeHidden();
        await expect(
            window
                .getByRole('region', { name: 'Game details' })
                .getByRole('heading')
        ).toHaveText('Homebrew Quest');
        const library = getTestLibraryPath(userDataDir);
        expect(existsSync(romPath)).toBe(false);
        expect(
            readFileSync(
                path.join(library, 'roms/gb/Homebrew Quest.gb'),
                'utf8'
            )
        ).toBe('homebrew-rom-bytes');
        expect(
            readFileSync(
                path.join(library, 'saves/gb/Homebrew Quest.sav'),
                'utf8'
            )
        ).toBe('progress');
    });
});

test.describe('library folder', () => {
    test('moves the library to an empty folder from Options', async () => {
        const { app, window } = launched;
        await skipSplash(window);
        const newFolder = path.join(userDataDir, 'New Library');
        mkdirSync(newFolder);
        await app.evaluate(({ dialog }, folder) => {
            dialog.showOpenDialog = async () => ({
                canceled: false,
                filePaths: [folder],
            });
        }, newFolder);

        await window.keyboard.press('Tab');
        await window.getByRole('button', { name: 'Change…' }).click();
        await window.getByRole('button', { name: 'Move my library' }).click();

        await expect(window.getByRole('status')).toHaveText('Library moved');
        await expect(window.getByText(newFolder)).toBeVisible();
        expect(existsSync(path.join(newFolder, 'library.json'))).toBe(true);
        expect(existsSync(getTestLibraryPath(userDataDir))).toBe(false);
        // The games are still listed, now read from the new folder
        await window.keyboard.press('Escape');
        await expect(
            window
                .getByRole('region', { name: 'Games' })
                .getByRole('button', { name: /Super Mario Land/ })
        ).toBeVisible();
    });
});

test.describe('library', () => {
    test('filters by platform and shows the selected game', async () => {
        const { window } = launched;
        await skipSplash(window);
        const games = window.getByRole('region', { name: 'Games' });
        const details = window.getByRole('region', { name: 'Game details' });

        await window
            .getByRole('navigation', { name: 'Platforms' })
            .getByRole('button', { name: 'GB Color' })
            .click();

        // Game rows only, not the "Add a game" item at the top
        await expect(
            games.getByRole('button').filter({ hasNotText: 'Add a game' })
        ).toHaveCount(3);
        await expect(details.getByRole('heading')).toHaveText(
            'Pokémon Crystal'
        );

        await games.getByRole('button', { name: /Wario Land 3/ }).click();
        await expect(details.getByRole('heading')).toHaveText('Wario Land 3');
    });
});

test.describe('playing a game', () => {
    test('starts mGBA with the controller fix and comes back when it quits', async () => {
        const { app, window } = launched;
        await skipSplash(window);
        const libraryPath = getTestLibraryPath(userDataDir);

        // Advance Wars is selected first
        await window.keyboard.press('a');

        await expect(window.getByRole('status')).toHaveText(
            /Playing Advance Wars/
        );
        await expect
            .poll(() => existsSync(getFakeMgbaLogPath(userDataDir)))
            .toBe(true);
        expect(
            readFileSync(getFakeMgbaLogPath(userDataDir), 'utf8').split('\n')
        ).toEqual([
            '0',
            '-C',
            `savegamePath=${path.join(libraryPath, 'saves/gba')}`,
            '-C',
            `savestatePath=${path.join(libraryPath, 'states/gba')}`,
            path.join(libraryPath, 'roms/gba/Advance Wars.gba'),
            '',
        ]);

        // The fake mGBA quits after a second
        await expect(window.getByRole('status')).toHaveCount(0, {
            timeout: 10_000,
        });
        expect(
            await app.evaluate(({ BrowserWindow }) =>
                BrowserWindow.getAllWindows()[0].isMinimized()
            )
        ).toBe(false);
        const library = JSON.parse(
            readFileSync(path.join(libraryPath, 'library.json'), 'utf8')
        );
        const advanceWars = Object.values(library.games).find(
            (game) => (game as { title: string }).title === 'Advance Wars'
        ) as { lastPlayedAt: string };
        expect(Date.now() - Date.parse(advanceWars.lastPlayedAt)).toBeLessThan(
            60_000
        );
    });
});

test.describe('options and palettes', () => {
    test('opens with Tab, switches palette and closes with Escape', async () => {
        const { window } = launched;
        await skipSplash(window);
        const html = window.locator('html');
        const dialog = window.getByRole('dialog', { name: 'Options' });

        await expect(html).toHaveAttribute('data-palette', 'escarcha');

        await window.keyboard.press('Tab');
        await expect(dialog).toBeVisible();

        await dialog.getByRole('radio', { name: 'Pocket' }).click();
        await expect(html).toHaveAttribute('data-palette', 'pocket');

        await window.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
    });

    test('keeps the chosen palette after a restart', async () => {
        const { window } = launched;
        await skipSplash(window);
        await window.keyboard.press('Tab');
        await window.getByRole('radio', { name: 'Sorbete' }).click();

        // Only restart once the palette is applied and saved
        await expect(window.locator('html')).toHaveAttribute(
            'data-palette',
            'sorbete'
        );
        await expect
            .poll(() =>
                window.evaluate(() => JSON.stringify({ ...localStorage }))
            )
            .toContain('sorbete');
        await launched.app.close();

        launched = await launchApp(userDataDir);

        await expect(launched.window.locator('html')).toHaveAttribute(
            'data-palette',
            'sorbete'
        );
    });
});

test.describe('window controls', () => {
    const getWindowState = (app: LaunchedApp['app']) =>
        app.evaluate(({ BrowserWindow }) => {
            const [window] = BrowserWindow.getAllWindows();

            return window
                ? {
                      count: BrowserWindow.getAllWindows().length,
                      minimized: window.isMinimized(),
                      fullScreen: window.isFullScreen(),
                      maximized: window.isMaximized(),
                  }
                : { count: 0 };
        });

    test('minimize button minimizes the window', async () => {
        const { app, window } = launched;
        await skipSplash(window);

        await window.getByRole('button', { name: 'Minimize window' }).click();

        await expect
            .poll(async () => (await getWindowState(app)).minimized)
            .toBe(true);
    });

    test('maximize button toggles full screen on macOS / maximize elsewhere', async () => {
        const { app, window } = launched;
        await skipSplash(window);
        const maximize = window.getByRole('button', {
            name:
                process.platform === 'darwin'
                    ? 'Toggle full screen'
                    : 'Maximize window',
        });
        const isEnlarged = async () => {
            const state = await getWindowState(app);

            return process.platform === 'darwin'
                ? state.fullScreen
                : state.maximized;
        };

        await maximize.click();
        await expect.poll(isEnlarged, { timeout: 10_000 }).toBe(true);

        await maximize.click();
        await expect.poll(isEnlarged, { timeout: 10_000 }).toBe(false);
    });

    test('close button closes the window', async () => {
        const { app, window } = launched;
        await skipSplash(window);
        const close = window.getByRole('button', { name: 'Close window' });

        if (process.platform !== 'darwin') {
            // Elsewhere closing the last window quits the app
            const appClosed = app.waitForEvent('close');
            await close.click();
            await appClosed;
            return;
        }

        // macOS keeps the app running with no windows
        await close.click();
        await expect
            .poll(async () => (await getWindowState(app)).count)
            .toBe(0);
    });
});
