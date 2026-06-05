import { compactCallMappingsOptimization } from './compact-call-mappings.js';
import { compactConditionsOptimization } from './compact-conditions.js';
import { compactElementMetaOptimization } from './compact-element-meta.js';
import { compactFlowsOptimization } from './compact-flows.js';
import { OPTIMIZATION_IDS, type OptimizationId } from './ids.js';
import { omitRedundantGraphRefsOptimization } from './omit-redundant-graph-refs.js';
import { omitTopLevelMetadataOptimization } from './omit-top-level-metadata.js';
import { stripNamespacePrefixesOptimization } from './strip-namespace-prefixes.js';
import type { Optimization } from './types.js';

export const OPTIMIZATION_REGISTRY: Record<OptimizationId, Optimization> = {
  [OPTIMIZATION_IDS.compactElementMeta]: compactElementMetaOptimization,
  [OPTIMIZATION_IDS.compactCallMappings]: compactCallMappingsOptimization,
  [OPTIMIZATION_IDS.compactFlows]: compactFlowsOptimization,
  [OPTIMIZATION_IDS.compactConditions]: compactConditionsOptimization,
  [OPTIMIZATION_IDS.omitRedundantGraphRefs]: omitRedundantGraphRefsOptimization,
  [OPTIMIZATION_IDS.omitTopLevelMetadata]: omitTopLevelMetadataOptimization,
  [OPTIMIZATION_IDS.stripNamespacePrefixes]: stripNamespacePrefixesOptimization
};
