import { WindowBar } from '@components/window-bar/window-bar';

import styles from './app.module.css';

export const App = () => {
    return (
        <div className={styles.app}>
            <WindowBar title="GuttyOS" />
            <main className={styles.content}>
                <h1>GuttyOS</h1>
            </main>
        </div>
    );
};
