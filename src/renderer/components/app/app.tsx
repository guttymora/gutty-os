import { useCallback, useState } from 'react';

import { Clock } from '@components/clock/clock';
import { LibraryScreen } from '@components/library-screen/library-screen';
import { OptionsPanel } from '@components/options-panel/options-panel';
import { SplashScreen } from '@components/splash-screen/splash-screen';
import { WindowBar } from '@components/window-bar/window-bar';
import { MOCK_GAMES } from '@data/mock-games';
import { useUiStore } from '@stores/ui-store';

import styles from './app.module.css';

export const App = () => {
    const [showSplash, setShowSplash] = useState(true);
    const hideSplash = useCallback(() => setShowSplash(false), []);
    const isOptionsOpen = useUiStore((state) => state.isOptionsOpen);

    return (
        <div className={styles.app}>
            <WindowBar title="GuttyOS • GAMES" trailing={<Clock />} />
            <main className={styles.content}>
                {showSplash && <SplashScreen onFinish={hideSplash} />}
                <LibraryScreen games={MOCK_GAMES} />
                {isOptionsOpen && <OptionsPanel />}
            </main>
        </div>
    );
};
