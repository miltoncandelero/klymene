module.exports = {
    root: true,
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
    },
    extends: [
        "@killabunnies/eslint-config",
        "plugin:jest/recommended",
        "plugin:jest/style"
    ],
    rules: {
        // ...
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-import-type-side-effects": "error"
    },
}