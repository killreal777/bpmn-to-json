export const PRESET_NAMES = ['base', 'max'] as const;

export type CompressionPresetName = typeof PRESET_NAMES[number];

export type CompressionConfig = {
  extends?: CompressionPresetName;
  fields?: {
    include?: string[];
    exclude?: string[];
  };
  optimizations?: {
    compactMappings?: boolean;
    compactSameNameMappings?: boolean;
    compactServiceTaskImplementation?: boolean;
    compactTypes?: boolean;
    compactFlowRefs?: boolean;
    compactCallActivity?: boolean;
    compactConditions?: boolean;
    omitIncomingOutgoing?: boolean;
    omitDefinitions?: boolean;
  };
  output?: {
    pretty?: boolean;
  };
};

export const BUILT_IN_PRESETS: Record<CompressionPresetName, CompressionConfig> = {
  base: {
    optimizations: {
      compactMappings: true,
      compactSameNameMappings: false,
      compactServiceTaskImplementation: false,
      compactTypes: false,
      compactFlowRefs: false,
      compactCallActivity: false,
      compactConditions: false,
      omitIncomingOutgoing: false,
      omitDefinitions: false
    },
    output: {
      pretty: true
    }
  },
  max: {
    fields: {
      exclude: ['collaborations']
    },
    optimizations: {
      compactMappings: true,
      compactSameNameMappings: true,
      compactServiceTaskImplementation: true,
      compactTypes: true,
      compactFlowRefs: true,
      compactCallActivity: true,
      compactConditions: true,
      omitIncomingOutgoing: true,
      omitDefinitions: true
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
  return mergeConfig(base, config);
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

function isCompressionPresetName(value: string): value is CompressionPresetName {
  return PRESET_NAMES.includes(value as CompressionPresetName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
