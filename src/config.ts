import { readFile } from 'node:fs/promises';
import {
  isOptimizationId,
  OPTIMIZATION_IDS,
  type OptimizationId
} from './optimizations/ids.js';

export const PRESET_NAMES = ['base', 'optimized'] as const;

export type CompressionPresetName = typeof PRESET_NAMES[number];

export type CompressionConfig = {
  extends?: CompressionPresetName;
  fields?: {
    exclude?: string[];
  };
  optimizations?: {
    enabled?: OptimizationId[];
  };
  output?: {
    pretty?: boolean;
  };
};

export const BUILT_IN_PRESETS: Record<CompressionPresetName, CompressionConfig> = {
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

export function getPresetConfig(name: string): CompressionConfig {
  if (!isCompressionPresetName(name)) {
    throw new Error(`Unknown compression preset: ${name}`);
  }

  return cloneConfig(BUILT_IN_PRESETS[name]);
}

export function resolveCompressionConfig(input?: unknown): CompressionConfig {
  if (input === undefined) {
    return getPresetConfig('base');
  }

  if (!isRecord(input)) {
    throw new Error('Compression config must be an object');
  }

  const config = input as CompressionConfig;
  const base = config.extends ? getPresetConfig(config.extends) : getPresetConfig('base');
  return validateConfig(mergeConfig(base, config));
}

export async function loadCompressionConfig(path: string): Promise<CompressionConfig> {
  const raw = await readFile(path, 'utf8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid compression config JSON: ${message}`);
  }

  return resolveCompressionConfig(parsed);
}

function mergeConfig(base: CompressionConfig, override: CompressionConfig): CompressionConfig {
  return cleanConfig({
    fields: mergeNested(base.fields, override.fields),
    optimizations: mergeNested(base.optimizations, override.optimizations),
    output: mergeNested(base.output, override.output)
  });
}

function mergeNested<T extends Record<string, unknown>>(base?: T, override?: T): T | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    ...(override ?? {})
  } as T;
}

function cleanConfig(config: CompressionConfig): CompressionConfig {
  return JSON.parse(JSON.stringify(config)) as CompressionConfig;
}

function cloneConfig(config: CompressionConfig): CompressionConfig {
  return cleanConfig(config);
}

function validateConfig(config: CompressionConfig): CompressionConfig {
  const enabled = config.optimizations?.enabled ?? [];

  for (const id of enabled) {
    if (typeof id !== 'string' || !isOptimizationId(id)) {
      throw new Error(`Unknown optimization id: ${String(id)}`);
    }
  }

  return config;
}

function isCompressionPresetName(value: string): value is CompressionPresetName {
  return PRESET_NAMES.includes(value as CompressionPresetName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
