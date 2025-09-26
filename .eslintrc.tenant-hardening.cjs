/**
 * Additional ESLint ruleset: tenant hardening
 * Enforces that no demo/test placeholder strings or insecure dev secrets appear in production code.
 * Intended to be merged in CI only (not during local dev unless explicitly enabled).
 */
module.exports = {
  rules: {
    // Disallow obvious placeholder tokens in source (except tests & docs handled via overrides below)
    'no-restricted-syntax': [
      'error',
      {
        selector: "Literal[value=/demo|placeholder|sample|owner@example.com|dev-jwt-secret/i]",
        message: 'Remove demo/test/placeholder artifacts from production source.'
      }
    ]
  },
  overrides: [
    {
      files: [
        '**/__tests__/**',
        '**/tests/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.spec.tsx',
        '**/*.test.tsx'
      ],
      rules: {
        // Allow literals in tests
        'no-restricted-syntax': 'off'
      }
    },
    {
      files: ['**/*.md', '**/docs/**'],
      rules: {
        'no-restricted-syntax': 'off'
      }
    }
  ]
};
