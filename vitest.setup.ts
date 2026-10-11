import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';

// vitest.config.mts doesn't enable `test.globals`, so Testing Library's
// automatic afterEach-cleanup detection has nothing to hook into — wire it
// up explicitly. cleanup() is a no-op for node-env tests.
afterEach(() => {
    cleanup();
});
