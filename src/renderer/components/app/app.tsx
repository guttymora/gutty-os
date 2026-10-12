import { useCallback, useState } from 'react';

import { Clock } from '@components/clock/clock';
import { LibraryScreen } from '@components/library-screen/library-screen';
import { SplashScreen } from '@components/splash-screen/splash-screen';
import { WindowBar } from '@components/window-bar/window-bar';
import { MOCK_GAMES } from '@data/mock-games';

import styles from './app.module.css';

export const App = () => {
    const [showSplash, setShowSplash] = useState(true);
    const hideSplash = useCallback(() => setShowSplash(false), []);

    return (
        <div className={styles.app}>
            <WindowBar title="GuttyOS • GAMES" trailing={<Clock />} />
            <main className={styles.content}>
                {showSplash && <SplashScreen onFinish={hideSplash} />}
                <LibraryScreen games={MOCK_GAMES} />
            </main>
        </div>
    );
};
