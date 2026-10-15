import { useCallback, useEffect, useState } from 'react';

import { Clock } from '@components/clock/clock';
import { LibraryScreen } from '@components/library-screen/library-screen';
import { OptionsPanel } from '@components/options-panel/options-panel';
import { SplashScreen } from '@components/splash-screen/splash-screen';
import { WindowBar } from '@components/window-bar/window-bar';
import { CONTROLS } from '@data/controls';
import { useKeyPress } from '@hooks/use-key-press';
import { useLibraryStore } from '@stores/library-store';
import { useUiStore } from '@stores/ui-store';

import styles from './app.module.css';

export const App = () => {
    const [showSplash, setShowSplash] = useState(true);
    const hideSplash = useCallback(() => setShowSplash(false), []);
    const isOptionsOpen = useUiStore((state) => state.isOptionsOpen);
    const openOptions = useUiStore((state) => state.openOptions);
    const isAddGameOpen = useUiStore((state) => state.isAddGameOpen);
    const games = useLibraryStore((state) => state.games);
    const libraryStatus = useLibraryStore((state) => state.status);
    const loadGames = useLibraryStore((state) => state.loadGames);

    useEffect(() => {
        void loadGames();
    }, [loadGames]);

    // Files dropped outside a drop zone would make the window open them
    useEffect(() => {
        const preventFileDrop = (event: DragEvent) => event.preventDefault();
        window.addEventListener('dragover', preventFileDrop);
        window.addEventListener('drop', preventFileDrop);

        return () => {
            window.removeEventListener('dragover', preventFileDrop);
            window.removeEventListener('drop', preventFileDrop);
        };
    }, []);

    // Tab opens options once the splash is gone and no dialog is open
    useKeyPress(
        CONTROLS.options.keys,
        openOptions,
        !showSplash && !isOptionsOpen && !isAddGameOpen
    );

    return (
        <div className={styles.app}>
            <WindowBar title="GuttyOS • GAMES" trailing={<Clock />} />
            <main className={styles.content}>
                {showSplash && <SplashScreen onFinish={hideSplash} />}
                <LibraryScreen games={games} status={libraryStatus} />
                {isOptionsOpen && <OptionsPanel />}
            </main>
        </div>
    );
};
