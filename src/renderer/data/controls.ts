export type ControlId = 'a' | 'b' | 'x' | 'y' | 'options';

type Control = {
    /** Action shown in the hint bar */
    label: string;
    /** Glyph shown in the hint bar */
    glyph: string;
    /** KeyboardEvent.key values that trigger the control (lowercase letters) */
    keys: string[];
};

// Keyboard mapping. Handlers are wired in Phase 2 (keyboard & gamepad).
export const CONTROLS: Record<ControlId, Control> = {
    a: { label: 'Play', glyph: 'A', keys: ['a', 'Enter'] },
    b: { label: 'Back', glyph: 'B', keys: ['b', 'Backspace'] },
    x: { label: 'Search', glyph: 'X', keys: ['x'] },
    y: { label: 'Random', glyph: 'Y', keys: ['y'] },
    options: { label: 'Options', glyph: 'Tab', keys: ['Tab'] },
};
