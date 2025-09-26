/** Strict ESLint overlay for client-dashboard (run via npm run lint:client-strict) */
module.exports = {
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'error'
  },
  overrides: [
    { files: ['**/__tests__/**'], rules: { 'no-console': 'off', '@typescript-eslint/no-explicit-any': 'off' } }
  ]
};