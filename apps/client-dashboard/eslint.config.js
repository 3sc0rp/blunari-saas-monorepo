import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**/*"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Change from error to warning
      "react-hooks/exhaustive-deps": "warn", // Ensure this is warning, not error
      // Soft guard: disallow obvious demo literals when TENANT_HARDEN=1 (CI can set env and use alternate config if desired)
      ...(process.env.TENANT_HARDEN === '1'
        ? {
            'no-restricted-syntax': [
              'error',
              {
                selector: "Literal[value=/demo|placeholder|sample|owner@example.com|dev-jwt-secret/i]",
                message: 'Remove demo/test/placeholder artifacts from production source.'
              }
            ]
          }
        : {})
    },
  },
);
