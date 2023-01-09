module.exports = {
    root: true,
    parserOptions: {
        tsconfigRootDir: "./",
        project: ['./tsconfig.json', './tsconfig.test.json']
    },
    extends: [
        "@killabunnies/eslint-config",
        "plugin:jest/recommended",
        "plugin:jest/style"
    ]
}