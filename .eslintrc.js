module.exports = {
    root: true,
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
    parser: "@typescript-eslint/parser",
    // parserOptions: {
    //     tsconfigRootDir: __dirname,
    //     project: ["./tsconfig.json"],
    // },
    plugins: ["@typescript-eslint", "prettier"],
    env: {
        node: true,
        es6: true,
    },
    rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            },
        ],
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-invalid-this": "error",
        "prettier/prettier": "error",
        "no-case-declarations": "off",
    },
    // overrides: [
    //     {
    //         files: ["**/__tests__/**/*.{test,spec}.ts"],
    //         plugins: ["jest"],
    //         extends: ["plugin:jest/recommended"],
    //         env: {
    //             jest: true,
    //         },
    //         rules: {
    //             "@typescript-eslint/no-non-null-assertion": "off",
    //             "@typescript-eslint/no-empty-function": "off",
    //         },
    //     },
    // ],
};
