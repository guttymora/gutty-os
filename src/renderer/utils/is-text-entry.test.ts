// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { isTextEntry } from './is-text-entry';

const input = (type: string) => {
    const element = document.createElement('input');
    element.type = type;
    return element;
};

describe('isTextEntry', () => {
    it.each(['text', 'search', 'email', 'password', 'number', 'url', 'date'])(
        'is true for a %s input',
        (type) => {
            expect(isTextEntry(input(type))).toBe(true);
        }
    );

    it.each(['checkbox', 'radio', 'button', 'submit', 'range', 'file'])(
        'is false for a %s input',
        (type) => {
            expect(isTextEntry(input(type))).toBe(false);
        }
    );

    it('is true for textareas and selects', () => {
        expect(isTextEntry(document.createElement('textarea'))).toBe(true);
        expect(isTextEntry(document.createElement('select'))).toBe(true);
    });

    it('is true for editable content', () => {
        const editable = document.createElement('div');
        // jsdom doesn't compute isContentEditable; Chromium does
        Object.defineProperty(editable, 'isContentEditable', { value: true });

        expect(isTextEntry(editable)).toBe(true);
    });

    it('is false for other elements and non-elements', () => {
        expect(isTextEntry(document.createElement('button'))).toBe(false);
        expect(isTextEntry(document.createElement('div'))).toBe(false);
        expect(isTextEntry(window)).toBe(false);
        expect(isTextEntry(null)).toBe(false);
    });
});
