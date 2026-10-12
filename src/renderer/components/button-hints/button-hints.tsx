import { CONTROLS, type ControlId } from '@data/controls';

import styles from './button-hints.module.css';

const HINT_ORDER: ControlId[] = ['a', 'b', 'x', 'y', 'options'];

type ButtonHintsProps = {
    /** Hints with a handler can also be clicked */
    onPress?: Partial<Record<ControlId, () => void>>;
};

export const ButtonHints = ({ onPress = {} }: ButtonHintsProps) => (
    <footer className={styles.hints}>
        <ul className={styles.list}>
            {HINT_ORDER.map((id) => {
                const content = (
                    <>
                        <kbd className={styles.button} data-button={id}>
                            {CONTROLS[id].glyph}
                        </kbd>
                        {CONTROLS[id].label}
                    </>
                );
                const handler = onPress[id];

                return (
                    <li key={id}>
                        {handler ? (
                            <button
                                type="button"
                                className={styles.hint}
                                onClick={handler}
                            >
                                {content}
                            </button>
                        ) : (
                            <span className={styles.hint}>{content}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    </footer>
);
