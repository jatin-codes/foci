import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Express identifies error handlers by arity, so unused parameters must stay: prefix them with "_".
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Type-aware linting, for the one rule that needs it: deprecated APIs are invisible
    // to the compiler and easy to reintroduce, so let the linter refuse them.
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['vitest.config.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: { document: 'readonly', window: 'readonly', fetch: 'readonly' },
    },
    rules: {
      // The client talks to the server over HTTP only; the contract comes from shared/.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/server/**'], message: 'The client must not import server code.' },
          ],
        },
      ],
    },
  },
  {
    files: ['server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/client/**'], message: 'The server must not import client code.' },
          ],
        },
      ],
    },
  },
  {
    // Both halves import the contract, so it may depend on neither of them, nor on any package.
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.\\/)',
              message: 'shared/ holds the contract only: no packages, no server or client code.',
            },
          ],
        },
      ],
    },
  },
);
