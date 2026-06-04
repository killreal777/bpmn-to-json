import type { OptimizationId } from './ids.js';

export type BpmnJsonModel = Record<string, unknown>;

export type OptimizationContext = {
  id: OptimizationId;
};

export type Optimization = {
  id: OptimizationId;
  apply: (model: BpmnJsonModel, context: OptimizationContext) => BpmnJsonModel;
};
