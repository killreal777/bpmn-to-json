# Base and Optimized BPMN Compression Modes Design

## Goal

Refine the converter into two named modes:

- `base`: a stable BPMN JSON projection that removes only clearly unnecessary data.
- `optimized`: a RAG-oriented representation produced by applying configurable optimizations to the base JSON model.

The converter remains local and deterministic. Runtime conversion must not use network calls, LLM calls, or full moddle serialization.

## Mode Names

CLI and config preset names are lowercase:

```text
base
optimized
```

Documentation may refer to them as Base and Optimized.

`base` remains the default preset.

## Base Mode

Base mode maps BPMN XML through `bpmn-moddle` into an explicit JSON model. It is not a raw moddle dump. It keeps information that explains process structure and execution behavior, and removes data that is known to be irrelevant for this project.

Base mode removes:

- BPMNDI/DI/DC layout data;
- diagram elements such as `BPMNDiagram`, `BPMNPlane`, `BPMNShape`, and `BPMNEdge`;
- coordinates, `Bounds`, waypoints, width, and height;
- cyclic moddle references such as `$parent`;
- XML namespace and editor metadata;
- exporter metadata such as `exporter` and `exporterVersion`;
- `targetNamespace`;
- `isExecutable`, because project BPMN files always use executable processes;
- `documentation`, because documentation is not authored in this workflow;
- `camunda:historyTimeToLive`, because it is not used by this project.

Base mode keeps:

- `definitions.id`;
- collaborations and participants;
- processes;
- flow elements;
- sequence flows;
- incoming and outgoing flow ids;
- gateway conditions;
- event definitions when present;
- execution-related Camunda attributes;
- `camunda:asyncBefore`, `camunda:asyncAfter`, and `camunda:exclusive`;
- call activity `calledElement`;
- extension elements, especially `camunda:In` and `camunda:Out`.

The existing compact representation for simple `camunda:In` and `camunda:Out` mappings remains acceptable in Base mode:

```json
{
  "extensions": {
    "camunda:In": ["source->target"],
    "camunda:Out": ["sourceExpression->target"]
  }
}
```

## Optimized Mode

Optimized mode does not parse BPMN independently. It takes the Base JSON model and applies a typed optimization pipeline:

```text
BPMN XML -> BaseJsonModel -> Optimization[] -> OptimizedJsonModel
```

Optimized mode is not a full CSV export. It stays JSON, but individual repeated structures may use CSV-like strings where JSON keys are boilerplate and do not add useful semantic load for RAG chunks.

Examples of targeted optimizations:

- element `meta` strings for repeated element attributes such as name and implementation;
- compact sequence flow representation;
- optional graph links such as `next` on elements when that is better than a separate `flows` block;
- compact call activity mappings while preserving variables passed through `camunda:In` and `camunda:Out`;
- compact condition representation;
- compact execution and implementation representation.

Each optimization is evaluated and committed separately.

## Typed Optimization Registry

Optimizations are function objects, not classes. They have no internal mutable state.

Each optimization lives in its own file and exports an object with a typed id and an `apply` function:

```ts
export type Optimization = {
  id: OptimizationId;
  apply: (model: BpmnJsonModel, context: OptimizationContext) => BpmnJsonModel;
};
```

Optimization ids are defined once as constants:

```ts
export const OPTIMIZATION_IDS = {
  elementMeta: 'elementMeta',
  compactFlows: 'compactFlows',
  compactCallMappings: 'compactCallMappings',
  compactConditions: 'compactConditions'
} as const;

export type OptimizationId =
  typeof OPTIMIZATION_IDS[keyof typeof OPTIMIZATION_IDS];
```

Optimization modules use the constants instead of raw string literals:

```ts
export const elementMetaOptimization = {
  id: OPTIMIZATION_IDS.elementMeta,
  apply(model) {
    return model;
  }
} satisfies Optimization;
```

The registry maps typed ids to optimization objects:

```ts
export const OPTIMIZATION_REGISTRY = {
  [OPTIMIZATION_IDS.elementMeta]: elementMetaOptimization,
  [OPTIMIZATION_IDS.compactFlows]: compactFlowsOptimization,
  [OPTIMIZATION_IDS.compactCallMappings]: compactCallMappingsOptimization,
  [OPTIMIZATION_IDS.compactConditions]: compactConditionsOptimization
} satisfies Record<OptimizationId, Optimization>;
```

Built-in profiles use typed optimization ids:

```ts
export const OPTIMIZED_PROFILE = [
  OPTIMIZATION_IDS.elementMeta,
  OPTIMIZATION_IDS.compactFlows,
  OPTIMIZATION_IDS.compactCallMappings,
  OPTIMIZATION_IDS.compactConditions
] satisfies readonly OptimizationId[];
```

External JSON config files may still name optimizations with strings, because JSON cannot carry TypeScript constants or functions. Those strings are validated at the config boundary against `OPTIMIZATION_REGISTRY`. Inside TypeScript code, optimizations are referenced through constants and typed ids.

## Config Shape

The converter keeps configurable profiles. The built-in `optimized` profile lists the enabled optimizations in order. A custom config may extend a profile and override the enabled optimization ids.

The config shape is:

```ts
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
```

An external config file may look like this:

```json
{
  "extends": "optimized",
  "optimizations": {
    "enabled": ["elementMeta", "compactFlows"]
  },
  "output": {
    "pretty": true
  }
}
```

The pipeline order is the order of the enabled optimization ids after config resolution.

## Branch Strategy

Implementation is split into two feature branches.

First branch:

```text
feature/base-mode
```

This branch implements Base mode semantics:

- keep `base` as the default preset;
- align Base field exclusion with this spec;
- remove `documentation`;
- keep `camunda:asyncBefore`, `camunda:asyncAfter`, and `camunda:exclusive`;
- rename the old `max` preset surface to `optimized` where needed for mode naming;
- update focused tests and documentation.

After this branch is complete, it should be merged into `main`.

Second branch:

```text
feature/optimized-mode
```

This branch must be created from updated `main` after `feature/base-mode` has been merged.

The second branch introduces Optimized mode incrementally:

- one commit for the typed optimization registry and pipeline;
- one commit per optimization module;
- each optimization has focused tests;
- documentation and example metrics are updated when committed examples are regenerated.

Potential optimization commits:

```text
feat: add optimized element meta
feat: compact optimized flows
feat: compact optimized call mappings
feat: compact optimized conditions
feat: compact optimized execution
```

## Testing

Base mode tests should verify that the projection:

- keeps structural BPMN data;
- removes layout/editor/documentation/unused runtime data;
- keeps async/exclusive Camunda attributes;
- remains deterministic.

Optimized mode tests should verify each optimization independently:

- input Base JSON fixture or converted BPMN;
- output after one enabled optimization;
- output after the built-in optimized profile;
- invalid optimization ids are rejected at config resolution.

Full verification before completion remains:

```bash
npm test
npm run typecheck
```

Converter behavior smoke verification remains:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json --preset optimized
diff tmp/loan-1.json tmp/loan-2.json
rg "BPMNDiagram|BPMNPlane|BPMNShape|BPMNEdge|Bounds|waypoint|bpmndi|dc:|di:|width|height|targetNamespace|isExecutable|historyTimeToLive" tmp/*.json
```

The `rg` command should find no matches for excluded fields.

## Open Design Decisions For Optimized Mode

The Optimized branch should decide these optimizations one at a time:

- whether graph connectivity is better represented by compact `flows` strings or by `next` links on elements;
- exact CSV field order for element `meta`;
- exact CSV field order for flow strings;
- exact compact syntax for call activity variable mappings;
- whether each optimization belongs in the default `optimized` profile or remains opt-in.

These decisions should be made before implementing each corresponding optimization commit.
