// eslint.config.js
const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                exports: 'writable',
                process: 'readonly',
                console: 'readonly',
                __dirname: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                // Dipakai multiSiteService.js buat narik data Subcont (built-in
                // Node 18+, gak butuh dependency tambahan kayak axios/node-fetch).
                fetch: 'readonly',
                AbortController: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off', // logger.js sendiri sengaja masih pakai console di beberapa util kecil
        },
    },
    {
        ignores: ['node_modules/**', 'migrations/**'],
    },
];