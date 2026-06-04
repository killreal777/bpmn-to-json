import { OPTIMIZATION_REGISTRY } from './registry.js';
import type { BpmnJsonModel } from './types.js';
import type { OptimizationId } from './ids.js';

export function applyOptimizations(model: BpmnJsonModel, enabled: readonly OptimizationId[] = []): BpmnJsonModel {
  return enabled.reduce((current, id) => {
    const optimization = OPTIMIZATION_REGISTRY[id];
    return optimization.apply(current, { id });
  }, model);
}
