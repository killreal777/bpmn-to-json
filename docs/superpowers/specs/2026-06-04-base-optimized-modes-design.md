# Base and Optimized BPMN Compression Modes Design

## Goal

Refine the converter into two named modes:

- `base`: a stable BPMN JSON projection that removes only clearly unnecessary data.
- `optimized`: a compact representation for RAG and agentic development, produced by applying configurable optimizations to the base JSON model.

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

Base mode maps BPMN XML through `bpmn-moddle` into an explicit JSON model. It is not a raw moddle dump, but it also must not optimize the data shape. Base mode only removes keys and structures that are known to be irrelevant for this project.

Base mode must not:

- compact values into CSV-like strings;
- rename keys for compression;
- move information between graph structures;
- compact `camunda:In` or `camunda:Out` variable mappings;
- collapse execution attributes into short fields such as `impl`;
- omit meaningful keys only because they are verbose.

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

In Base mode, extension elements should remain structured JSON objects after excluded keys are removed. Compact mapping strings such as `"source->target"` are Optimized-mode behavior, not Base-mode behavior.

## Optimized Mode

Optimized mode does not parse BPMN independently. It takes the Base JSON model and applies a typed optimization pipeline:

```text
BPMN XML -> BaseJsonModel -> Optimization[] -> OptimizedJsonModel
```

Optimized mode is intended for two related uses:

- building RAG inputs where chunks should contain as much useful BPMN meaning as possible;
- agentic development workflows where the BPMN model needs to fit into context without wasting tokens on repetitive JSON boilerplate.

Optimized mode is not a full CSV export. It stays JSON, but individual repeated structures may use CSV-like strings where JSON keys are boilerplate and do not add useful semantic load for RAG chunks or agent context.

The default Optimized profile uses these optimizations in order:

1. `compactElementMeta`
2. `compactCallMappings`
3. `compactFlows`
4. `compactConditions`
5. `omitRedundantGraphRefs`
6. `omitTopLevelMetadata`

Each optimization is evaluated and committed separately.

### `compactElementMeta`

Repeated element keys are compressed into one CSV-like `meta` string:

```text
meta = id,type,name,extra...
```

Examples:

```json
{
  "elements": [
    { "meta": "SaveApplication,ServiceTask,Save application,impl=${saveApplicationDelegate}" },
    { "meta": "CallRiskCheck,CallActivity,Run risk check,call=risk-check" },
    { "meta": "StartLoanApplication,StartEvent" }
  ]
}
```

The `id`, `type`, and `name` keys are omitted from optimized elements when their values are present in `meta`.

Implementation details such as service task delegate expression and call activity target are also represented in `meta` as `impl=...` and `call=...`. Separate optimized keys such as `impl` and `call` should not be emitted by default.

### `compactCallMappings`

Camunda call activity mappings drop the `camunda:` boilerplate and use short keys:

```json
{
  "meta": "CallRiskCheck,CallActivity,Run risk check,call=risk-check",
  "in": [
    "applicationId",
    "applicantName->clientId",
    "clientId->applicantName",
    "amount->loanAmount"
  ],
  "out": [
    "riskScore"
  ]
}
```

Mapping syntax:

- same source and target: `name`;
- different source and target: `source->target`;
- source expression and target: `sourceExpression->target`;
- `camunda:In` becomes `in`;
- `camunda:Out` becomes `out`.

### `compactFlows`

Sequence flows are represented as strings:

```json
{
  "flows": [
    "StartLoanApplication,SaveApplication",
    "Gateway_1,Task_Approve,approved,riskScore < 50"
  ]
}
```

Flow field order:

```text
from,to,name,condition
```

`flow.id` is omitted by default in Optimized mode because process understanding primarily depends on `from`, `to`, label, and condition.

### `compactConditions`

Flow conditions are compacted before or during flow string generation:

- no language: `conditionBody`;
- with language: `conditionBody@language`.

Example:

```text
Gateway_1,Task_Approve,approved,riskScore < 50@feel
```

### `omitRedundantGraphRefs`

Optimized mode omits element-level `incoming` and `outgoing` arrays by default because graph connectivity is represented by compact `flows`.

### `omitTopLevelMetadata`

Optimized mode omits `definitions` and `collaborations` by default. These structures are useful in Base mode but usually add little value to compact RAG and agent-development context.

The default Optimized profile intentionally keeps `flows` rather than replacing graph connectivity with `next` links. A `next` representation may be considered later as a separate design decision, but it is not part of the first optimized implementation.

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
  compactElementMeta: 'compactElementMeta',
  compactCallMappings: 'compactCallMappings',
  compactFlows: 'compactFlows',
  compactConditions: 'compactConditions',
  omitRedundantGraphRefs: 'omitRedundantGraphRefs',
  omitTopLevelMetadata: 'omitTopLevelMetadata'
} as const;

export type OptimizationId =
  typeof OPTIMIZATION_IDS[keyof typeof OPTIMIZATION_IDS];
```

Optimization modules use the constants instead of raw string literals:

```ts
export const compactElementMetaOptimization = {
  id: OPTIMIZATION_IDS.compactElementMeta,
  apply(model) {
    return model;
  }
} satisfies Optimization;
```

The registry maps typed ids to optimization objects:

```ts
export const OPTIMIZATION_REGISTRY = {
  [OPTIMIZATION_IDS.compactCallMappings]: compactCallMappingsOptimization,
  [OPTIMIZATION_IDS.compactElementMeta]: compactElementMetaOptimization,
  [OPTIMIZATION_IDS.compactFlows]: compactFlowsOptimization,
  [OPTIMIZATION_IDS.compactConditions]: compactConditionsOptimization,
  [OPTIMIZATION_IDS.omitRedundantGraphRefs]: omitRedundantGraphRefsOptimization,
  [OPTIMIZATION_IDS.omitTopLevelMetadata]: omitTopLevelMetadataOptimization
} satisfies Record<OptimizationId, Optimization>;
```

Built-in profiles use typed optimization ids:

```ts
export const OPTIMIZED_PROFILE = [
  OPTIMIZATION_IDS.compactElementMeta,
  OPTIMIZATION_IDS.compactCallMappings,
  OPTIMIZATION_IDS.compactFlows,
  OPTIMIZATION_IDS.compactConditions,
  OPTIMIZATION_IDS.omitRedundantGraphRefs,
  OPTIMIZATION_IDS.omitTopLevelMetadata
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
    "enabled": ["compactElementMeta", "compactFlows"]
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
- remove Base-mode compact mapping behavior for `camunda:In` and `camunda:Out`;
- keep Base-mode execution attributes as structured fields instead of compact aliases;
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
feat: compact optimized call mappings
feat: compact optimized flows
feat: compact optimized conditions
feat: omit optimized graph refs
feat: omit optimized top-level metadata
```

## Testing

Base mode tests should verify that the projection:

- keeps structural BPMN data;
- removes layout/editor/documentation/unused runtime data;
- keeps async/exclusive Camunda attributes;
- keeps extension elements and variable mappings as structured JSON, not compact strings;
- does not emit optimized aliases such as `impl`, `meta`, `next`, or compact flow strings;
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

## Deferred Optimized Decisions

The first optimized implementation does not replace compact `flows` with element-level `next` links. That option remains deferred because it changes graph ownership and can make edge labels and conditions harder to represent.

Future optimized work may also compare alternative CSV escaping rules if BPMN values contain commas. The first implementation should use a deterministic escaping strategy rather than silently producing ambiguous CSV-like strings.
