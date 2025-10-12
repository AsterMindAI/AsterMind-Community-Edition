// © 2025 AsterMind LLC – All Rights Reserved.
// Patent Pending US 63/897,713
// Presets.ts — Reusable configuration presets for ELM (updated for new ELMConfig union)

import type { TextConfig } from '../core/ELMConfig';

/**
 * NOTE:
 * - These are TEXT presets (token-mode). They set `useTokenizer: true`.
 * - If you need char-level, create an inline config where `useTokenizer: false`
 *   and pass it directly to ELM (numeric presets generally need an explicit inputSize).
 */

/** English token-level preset */
export const EnglishTokenPreset: TextConfig = {
    useTokenizer: true,
    categories: [],
    hiddenUnits: 120,
    activation: 'relu',
    maxLen: 20,
    charSet: 'abcdefghijklmnopqrstuvwxyz',
    tokenizerDelimiter: /[\s,.;!?()\[\]{}"']+/,
    log: {
        modelName: 'EnglishTokenPreset',
        verbose: false,
        toFile: false,
        level: 'info',
    },
    weightInit: 'xavier',
};

/** Russian token-level preset */
export const RussianTokenPreset: TextConfig = {
    useTokenizer: true,
    categories: [],
    hiddenUnits: 120,
    activation: 'relu',
    maxLen: 20,
    charSet: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
    tokenizerDelimiter: /[\s,.;!?()\[\]{}"']+/,
    log: {
        modelName: 'RussianTokenPreset',
        verbose: false,
        toFile: false,
        level: 'info',
    },
    weightInit: 'xavier',
};

/** Emoji + Latin hybrid token-level preset */
export const EmojiHybridTokenPreset: TextConfig = {
    useTokenizer: true,
    categories: [],
    hiddenUnits: 120,
    activation: 'relu',
    maxLen: 25,
    charSet: 'abcdefghijklmnopqrstuvwxyz😀😁😂🤣😃😄😅😆😉😊',
    tokenizerDelimiter: /[\s,.;!?()\[\]{}"']+/,
    log: {
        modelName: 'EmojiHybridTokenPreset',
        verbose: false,
        toFile: false,
        level: 'info',
    },
    weightInit: 'xavier',
};

/**
 * Helper to make a language-specific token preset on the fly
 */
export function makeTokenPreset(opts: Partial<TextConfig> & Pick<TextConfig, 'maxLen'>): TextConfig {
    return {
        useTokenizer: true,
        categories: [],
        hiddenUnits: 120,
        activation: 'relu',
        charSet: opts.charSet ?? 'abcdefghijklmnopqrstuvwxyz',
        tokenizerDelimiter: opts.tokenizerDelimiter ?? /[\s,.;!?()\[\]{}"']+/,
        weightInit: 'xavier',
        log: {
            modelName: opts.log?.modelName ?? 'TokenPreset',
            verbose: opts.log?.verbose ?? false,
            toFile: opts.log?.toFile ?? false,
            level: opts.log?.level ?? 'info',
        },
        // required
        maxLen: opts.maxLen,
    };
}
