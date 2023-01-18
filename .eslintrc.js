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
    ]
}