// rollup.config.cjs
const fs = require('fs');
const typescript = require('rollup-plugin-typescript2');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

// Types/JS for the main library entry
const tsMain = typescript({
    tsconfig: './tsconfig.json',
    useTsconfigDeclarationDir: true,
    clean: true,
    tsconfigOverride: {
        // keep tests/demos out of declaration emit
        exclude: ['node_examples', 'examples', 'tests', 'public'],
        compilerOptions: {
            rootDir: 'src',
            declaration: true,
            declarationDir: './dist',
            declarationMap: false,
        },
    },
});

// JS-only for the worker (don’t overwrite dist/index.d.ts)
const tsWorker = typescript({
    tsconfig: './tsconfig.json',
    clean: true,
    tsconfigOverride: {
        exclude: ['node_examples', 'examples', 'tests', 'public'],
        compilerOptions: {
            rootDir: 'src',
            declaration: false,
            emitDeclarationOnly: false,
        },
    },
});

module.exports = [
    // ❶ Main library bundle (UMD + ESM)
    {
        input: 'src/index.ts',
        output: [
            { file: pkg.main, format: 'umd', name: 'astermind', sourcemap: true }, // dist/astermind.umd.js
            { file: pkg.module, format: 'esm', sourcemap: true },                    // dist/astermind.esm.js
        ],
        plugins: [
            nodeResolve({ browser: true }),
            commonjs(),
            tsMain,
        ],
        // external: [], // add externals here if you want a “pure” bundle
    },

    // ❷ Browser worker bundle (ESM file you load with new Worker(...))
    {
        input: 'src/core/ELMWorker.ts',
        output: {
            file: 'dist/workers/elm-worker.js',
            format: 'esm',
            sourcemap: true,
        },
        plugins: [
            nodeResolve({ browser: true }),
            commonjs(),
            tsWorker,
        ],
    },
];
