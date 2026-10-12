import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { configs as tseslintConfigs } from 'typescript-eslint';

export default defineConfig(
    globalIgnores(['.vite/', 'out/', 'coverage/']),
    js.configs.recommended,
    tseslintConfigs.recommended,
    importX.recommended,
    importX.typescript,
    importX.electron,
    reactHooks.configs.flat.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        settings: {
            'import-x/resolver-next': [createTypeScriptImportResolver()],
        },
        rules: {
            'import-x/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        ['sibling', 'index'],
                    ],
                    pathGroups: [
                        {
                            pattern: '@{assets,components,data,shared,stores,styles,utils}/**',
                            group: 'internal',
                        },
                    ],
                    pathGroupsExcludedImportTypes: ['builtin'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
            // Force aliases over deep relative imports (../../components)
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['../../*'],
                            message:
                                'Use a path alias (e.g. @components/...) instead of deep relative imports.',
                        },
                    ],
                },
            ],
        },
    },
    // Must stay last: turns off rules that conflict with Prettier
    prettier
);
