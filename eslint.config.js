import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Express detects error handlers by arity, so unused parameters must stay.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
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
    files: ['client/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/server/**'], message: 'The client must not import server code.' },
            {
              regex: '^\\.\\./',
              message: 'Import from another folder through @api, @components, @hooks or @shared.',
            },
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
