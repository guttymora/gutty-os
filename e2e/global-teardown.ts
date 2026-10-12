import { rmSync } from 'node:fs';
import path from 'node:path';

// `test:e2e` packages the app to get a production build; the packaged copy in
// out/ isn't needed afterwards, so remove it whether the tests passed or not.
export default function globalTeardown() {
    rmSync(path.resolve(__dirname, '..', 'out'), {
        recursive: true,
        force: true,
    });
}
