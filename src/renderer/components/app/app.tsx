import { TitleBar } from '@components/title-bar/title-bar';

import styles from './app.module.css';

export const App = () => {
    return (
        <div className={styles.app}>
            <TitleBar title="GuttyOS" />
            <main className={styles.content}>
                <h1>GuttyOS</h1>
            </main>
        </div>
    );
};
