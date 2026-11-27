import tseslint from "typescript-eslint";
import inteiro from "./packages/eslint-plugin/index.js";
export default [
  {
    files: ["packages/react/src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { inteiro },
    rules: { "inteiro/prefer-tokens": "error" },
  },
];
