import { readFile } from 'node:fs/promises';
import { isOptimizationId, OPTIMIZATION_IDS } from './optimizations/ids.js';
export const PRESET_NAMES = ['base', 'optimized'];
export const BUILT_IN_PRESETS = {
    base: {
        optimizations: {
            enabled: []
        },
        output: {
            pretty: true
        }
    },
    optimized: {
        optimizations: {
            enabled: [
                OPTIMIZATION_IDS.compactElementMeta,
                OPTIMIZATION_IDS.compactCallMappings,
                OPTIMIZATION_IDS.compactFlows,
                OPTIMIZATION_IDS.compactConditions,
                OPTIMIZATION_IDS.omitRedundantGraphRefs,
                OPTIMIZATION_IDS.omitTopLevelMetadata,
                OPTIMIZATION_IDS.stripNamespacePrefixes
            ]
        },
        output: {
            pretty: true
        }
    }
};
export function getPresetConfig(name) {
    if (!isCompressionPresetName(name)) {
        throw new Error(`Unknown compression preset: ${name}`);
    }
    return cloneConfig(BUILT_IN_PRESETS[name]);
}
export function resolveCompressionConfig(input) {
    if (input === undefined) {
        return getPresetConfig('base');
    }
    if (!isRecord(input)) {
        throw new Error('Compression config must be an object');
    }
    const config = input;
    const base = config.extends ? getPresetConfig(config.extends) : getPresetConfig('base');
    return validateConfig(mergeConfig(base, config));
}
export async function loadCompressionConfig(path) {
    const raw = await readFile(path, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid compression config JSON: ${message}`);
    }
    return resolveCompressionConfig(parsed);
}
function mergeConfig(base, override) {
    return cleanConfig({
        fields: mergeNested(base.fields, override.fields),
        optimizations: mergeNested(base.optimizations, override.optimizations),
        output: mergeNested(base.output, override.output)
    });
}
function mergeNested(base, override) {
    if (!base && !override) {
        return undefined;
    }
    return {
        ...(base ?? {}),
        ...(override ?? {})
    };
}
function cleanConfig(config) {
    return JSON.parse(JSON.stringify(config));
}
function cloneConfig(config) {
    return cleanConfig(config);
}
function validateConfig(config) {
    const enabled = config.optimizations?.enabled ?? [];
    for (const id of enabled) {
        if (typeof id !== 'string' || !isOptimizationId(id)) {
            throw new Error(`Unknown optimization id: ${String(id)}`);
        }
    }
    return config;
}
function isCompressionPresetName(value) {
    return PRESET_NAMES.includes(value);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
