import { CONTROLS, type ControlId } from '@data/controls';

import styles from './button-hints.module.css';

const HINT_ORDER: ControlId[] = ['a', 'b', 'x', 'y', 'options'];

export const ButtonHints = () => (
    <footer className={styles.hints}>
        <ul className={styles.list}>
            {HINT_ORDER.map((id) => (
                <li key={id} className={styles.hint}>
                    <kbd className={styles.button} data-button={id}>
                        {CONTROLS[id].glyph}
                    </kbd>
                    {CONTROLS[id].label}
                </li>
            ))}
        </ul>
    </footer>
);
