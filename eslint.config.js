import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase',
              message:
                'Import supabase only from src/api/* or src/stores/authStore.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/api/**/*.{ts,tsx}', 'src/stores/authStore.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
