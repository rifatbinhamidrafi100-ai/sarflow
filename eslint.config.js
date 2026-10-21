import tseslint from 'typescript-eslint';

// Correctness baseline for the existing codebase; TypeScript remains the type checker.
export default [
  { ignores: ['node_modules/**', 'dist/**', 'artifacts/**', '.venv*/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['{src,server,shared,tests,api}/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    rules: {
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': ['error', 'always'],
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'error',
      'no-sparse-arrays': 'error',
      'no-unsafe-finally': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
];
