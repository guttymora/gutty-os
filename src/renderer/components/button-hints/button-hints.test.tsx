// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ButtonHints } from './button-hints';

describe('ButtonHints', () => {
    it('shows each controller button with its action', () => {
        render(<ButtonHints />);

        expect(
            screen.getAllByRole('listitem').map((item) => item.textContent)
        ).toEqual(['aPlay', 'bBack', 'xSearch', 'yRandom', 'selectOptions']);
    });
});
