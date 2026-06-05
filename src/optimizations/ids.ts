export const OPTIMIZATION_IDS = {
  compactElementMeta: 'compactElementMeta',
  compactCallMappings: 'compactCallMappings',
  compactFlows: 'compactFlows',
  compactConditions: 'compactConditions',
  omitRedundantGraphRefs: 'omitRedundantGraphRefs',
  omitTopLevelMetadata: 'omitTopLevelMetadata',
  stripNamespacePrefixes: 'stripNamespacePrefixes'
} as const;

export type OptimizationId = typeof OPTIMIZATION_IDS[keyof typeof OPTIMIZATION_IDS];

export const OPTIMIZATION_ID_VALUES = Object.values(OPTIMIZATION_IDS) as OptimizationId[];

export function isOptimizationId(value: string): value is OptimizationId {
  return OPTIMIZATION_ID_VALUES.includes(value as OptimizationId);
}
