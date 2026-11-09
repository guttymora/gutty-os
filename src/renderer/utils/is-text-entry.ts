// Inputs that take clicks or arrows but no typing, so shortcuts still apply
const NON_TEXT_INPUT_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
]);

/**
 * True when keys pressed on `target` are typed into it: text inputs,
 * textareas, selects (letters jump to options) and editable content.
 */
export const isTextEntry = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target.isContentEditable) {
        return true;
    }
    if (target instanceof HTMLInputElement) {
        return !NON_TEXT_INPUT_TYPES.has(target.type);
    }

    return (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    );
};
