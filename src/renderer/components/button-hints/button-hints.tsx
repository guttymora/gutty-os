import styles from './button-hints.module.css';

type Hint = {
    button: 'a' | 'b' | 'x' | 'y' | 'select';
    label: string;
};

const HINTS: Hint[] = [
    { button: 'a', label: 'Play' },
    { button: 'b', label: 'Back' },
    { button: 'x', label: 'Search' },
    { button: 'y', label: 'Random' },
    { button: 'select', label: 'Options' },
];

export const ButtonHints = () => (
    <footer className={styles.hints}>
        <ul className={styles.list}>
            {HINTS.map(({ button, label }) => (
                <li key={button} className={styles.hint}>
                    <span className={styles.button} data-button={button}>
                        {button}
                    </span>
                    {label}
                </li>
            ))}
        </ul>
    </footer>
);
