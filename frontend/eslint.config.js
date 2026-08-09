// eslint.config.js
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        // vite.config.js jalan di Node (bukan browser) saat build/dev -
        // butuh globals Node (__dirname, process, dst), beda sama kode di
        // src/ yang jalan di browser. Dipisah biar globals.browser di bawah
        // gak nutupin __dirname yang emang valid di sini (Vite bundle
        // config file secara CJS, __dirname otomatis kesedia meski
        // package.json punya "type": "module").
        files: ['vite.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ['src/**/*.{js,jsx}'],
        plugins: {
            react,
            'react-hooks': reactHooks,
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
            },
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off', // project ini tidak pakai PropTypes (tidak ada di dependencies)
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    {
        ignores: ['node_modules/**', 'dist/**', 'build/**'],
    },
];