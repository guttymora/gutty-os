import { PALETTES, type PaletteColors } from '@data/palettes';
import { useThemeStore } from '@stores/theme-store';
import { useUiStore } from '@stores/ui-store';

import styles from './options-panel.module.css';

// A few colors that identify each palette at a glance
const SWATCH_KEYS: (keyof PaletteColors)[] = [
    'surface',
    'buttonAFill',
    'buttonBFill',
    'buttonXFill',
    'buttonYFill',
    'platformGbc',
];

export const OptionsPanel = () => {
    const paletteId = useThemeStore((state) => state.paletteId);
    const setPalette = useThemeStore((state) => state.setPalette);
    const closeOptions = useUiStore((state) => state.closeOptions);

    return (
        <div className={styles.backdrop} onClick={closeOptions}>
            <section
                className={styles.panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="options-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className={styles.header}>
                    <h2 id="options-title" className={styles.title}>
                        Options
                    </h2>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={closeOptions}
                    >
                        Close
                    </button>
                </header>

                <h3 id="palette-label" className={styles.sectionTitle}>
                    Color palette
                </h3>
                <div
                    className={styles.palettes}
                    role="radiogroup"
                    aria-labelledby="palette-label"
                >
                    {PALETTES.map(({ id, name, colors }) => (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={id === paletteId}
                            className={styles.palette}
                            onClick={() => setPalette(id)}
                        >
                            <span className={styles.paletteName}>{name}</span>
                            <span
                                className={styles.swatches}
                                aria-hidden="true"
                            >
                                {SWATCH_KEYS.map((key) => (
                                    <span
                                        key={key}
                                        className={styles.swatch}
                                        style={{
                                            background: colors[key],
                                            borderColor: colors.line,
                                        }}
                                    />
                                ))}
                            </span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};
