/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-refresh'],
  ignorePatterns: ['dist', 'dist-*', 'node_modules', '*.config.js', '*.config.ts'],
  rules: {
    // Large app: unused vars / hook deps are tracked in IDE; enabling as errors breaks CI noise ratio
    '@typescript-eslint/no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react-refresh/only-export-components': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // `catch {}` for JSON/localStorage is intentional
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Switch steps often use `case 'x': const foo = ...` — valid in TS/strict mode with blocks optional in practice
    'no-case-declarations': 'off',
  },
  overrides: [
    {
      files: ['**/*.d.ts'],
      rules: {
        // Ambient globals use `declare var` per TypeScript handbook
        'no-var': 'off',
      },
    },
  ],
}
