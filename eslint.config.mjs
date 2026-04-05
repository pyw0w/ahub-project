import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"]
  },
  {
    files: ["**/*.ts", "**/*.mts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error"
    }
  },
  {
    files: ["scripts/**/*.mjs", "*.config.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
);
