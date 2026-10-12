import { useCallback, useState } from 'react';

import { SplashScreen } from '@components/splash-screen/splash-screen';
import { WindowBar } from '@components/window-bar/window-bar';

import styles from './app.module.css';

export const App = () => {
    const [showSplash, setShowSplash] = useState(true);
    const hideSplash = useCallback(() => setShowSplash(false), []);

    return (
        <div className={styles.app}>
            <WindowBar title="GuttyOS" />
            <div className={styles.content}>
                {showSplash && <SplashScreen onFinish={hideSplash} />}
                <main className={styles.main}>
                    <h1>GuttyOS</h1>
                </main>
            </div>
        </div>
    );
};
