# Configurable BPMN JSON Compression Design

## Goal

Add a flexible compression configuration system for the BPMN XML to JSON converter.

The converter should support built-in presets and user-defined JSON config files. A user must be able to create a new config or edit an exported preset to control:

- which fields are included or excluded from the final JSON;
- which output optimizations are applied;
- whether JSON is pretty-printed or minified.

## Current Baseline

The current converter has one implicit output format. It already excludes layout noise and applies one hardcoded optimization for extension mappings:

```json
{
  "extensions": {
    "camunda:In": ["source->target"],
    "camunda:Out": ["sourceExpression->target"]
  }
}
```

Current committed example metrics:

| Example | Source BPMN | Compact JSON | Ratio | Reduction |
| --- | ---: | ---: | ---: | ---: |
| `loan-application-process` | 4,855 bytes | 3,006 bytes | 1.62x | 38.1% |
| `risk-check-process` | 2,872 bytes | 1,597 bytes | 1.80x | 44.4% |

## User-Facing CLI

Default behavior remains stable:

```bash
npx tsx src/cli.ts input.bpmn -o output.json
```

This uses the `base` preset.

Preset selection:

```bash
npx tsx src/cli.ts input.bpmn -o output.json --preset max
```

External config:

```bash
npx tsx src/cli.ts input.bpmn -o output.json --config compression.json
```

Config export:

```bash
npx tsx src/cli.ts --print-config base > compression.base.json
npx tsx src/cli.ts --print-config max > compression.max.json
```

When `--config` is provided, it may either define a complete config or extend a preset:

```json
{
  "extends": "max",
  "fields": {
    "exclude": ["definitions", "collaborations", "elements.incoming", "elements.outgoing"]
  },
  "optimizations": {
    "compactServiceTaskImplementation": true,
    "compactSameNameMappings": true
  },
  "output": {
    "pretty": true
  }
}
```

## Config Shape

```ts
type CompressionPresetName = 'base' | 'max';

type CompressionConfig = {
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
```

Config paths are stable JSON paths over the projected compact model, not raw BPMN XML paths.

Examples:

- `definitions`
- `collaborations`
- `processes.type`
- `elements.incoming`
- `elements.outgoing`
- `flows.type`
- `flows.condition.type`

## Presets

### `base`

`base` is the default preset and preserves the current output shape as closely as possible.

It keeps:

- `definitions`;
- `collaborations`;
- process `id`, `name`, `type`;
- element `id`, `type`, `name`, `incoming`, `outgoing`;
- sequence flow `id`, `type`, `sourceRef`, `targetRef`, `name`, `condition`;
- service task implementation under `execution`;
- call activity `calledElement`;
- compact extension mappings.

It applies:

- `compactMappings: true`;
- `compactSameNameMappings: false`;
- `output.pretty: true`.

### `max`

`max` prioritizes output size while keeping enough information for process and implementation analysis.

It excludes or rewrites:

- `definitions`;
- `collaborations`;
- `incoming` and `outgoing`, because graph connectivity is already represented by flows;
- `bpmn:` prefixes in `type`;
- `sourceRef` / `targetRef` key names, rewritten as `from` / `to`;
- `calledElement`, rewritten as `call`;
- service task implementation, rewritten as `impl`;
- same-name mappings, rewritten as one token instead of `source->target`;
- condition objects, simplified where possible.

It applies:

- `compactMappings: true`;
- `compactSameNameMappings: true`;
- `compactServiceTaskImplementation: true`;
- `compactTypes: true`;
- `compactFlowRefs: true`;
- `compactCallActivity: true`;
- `compactConditions: true`;
- `omitIncomingOutgoing: true`;
- `omitDefinitions: true`;
- `output.pretty: true` by default.

`max` keeps pretty JSON by default so examples remain readable. Users can set `"pretty": false` for minified output.

## Optimization Semantics

### `compactMappings`

Group extension mappings by type:

```json
{
  "extensions": {
    "camunda:In": ["source->target"],
    "camunda:Out": ["sourceExpression->target"]
  }
}
```

### `compactSameNameMappings`

When source and target are the same, write the name once:

```json
{
  "extensions": {
    "camunda:In": ["applicationId", "amount->loanAmount"]
  }
}
```

### `compactServiceTaskImplementation`

For service-task-like elements, replace the verbose execution object with one `impl` field when there is exactly one implementation source:

```json
{
  "type": "ServiceTask",
  "impl": "${saveApplicationDelegate}"
}
```

Supported implementation sources, in priority order:

1. `camunda:delegateExpression`
2. `camunda:class`
3. `camunda:expression`
4. `camunda:topic`

If more implementation fields are present, keep `execution` to avoid losing information.

### `compactTypes`

Remove the `bpmn:` prefix from BPMN types:

```json
{ "type": "ServiceTask" }
```

Non-BPMN extension types keep their prefix.

### `compactFlowRefs`

For sequence flows, rewrite:

```json
{ "sourceRef": "A", "targetRef": "B" }
```

to:

```json
{ "from": "A", "to": "B" }
```

### `compactCallActivity`

Rewrite:

```json
{ "calledElement": "risk-check" }
```

to:

```json
{ "call": "risk-check" }
```

### `compactConditions`

For condition expressions:

- if only `body` exists, write the body as a string;
- if `language` exists, write `{ "body": "...", "lang": "..." }`;
- omit `type` when it is the default `bpmn:FormalExpression`.

### `omitIncomingOutgoing`

Remove `incoming` and `outgoing` from flow elements. This is safe when sequence flows are preserved.

### `omitDefinitions`

Remove top-level `definitions`.

## Architecture

Keep the converter small, but split config concerns out of the projection code:

```text
src/
  cli.ts
  config.ts
  convert.ts
```

`src/config.ts` owns:

- built-in presets;
- config loading from JSON;
- `extends` merge behavior;
- config validation;
- print/export helpers.

`src/convert.ts` owns:

- BPMN parsing;
- semantic projection;
- applying config fields and optimizations;
- stable cleanup and sorting.

`src/cli.ts` owns:

- parsing `--preset`;
- parsing `--config`;
- parsing `--print-config`;
- output pretty/minified selection.

## Field Filtering

Projection happens first. Field filtering happens after optimizations so it can filter final output keys.

Filtering rules:

- `exclude` removes matching keys recursively by simple path;
- paths such as `elements.incoming` match `incoming` inside any `elements` array;
- `include` is reserved for an allow-list mode, but MVP implementation may focus on `exclude` if tests cover it explicitly;
- unknown field paths are accepted and simply do not match anything.

## Error Handling

CLI errors:

- unknown preset exits non-zero;
- unreadable config file exits non-zero;
- invalid JSON config exits non-zero;
- config that is not a JSON object exits non-zero;
- `--print-config` with unknown preset exits non-zero.

## Testing

Add focused tests for:

- default/base preset preserves current output behavior;
- `max` applies service task, mapping, flow, call, type, condition, and field optimizations;
- custom config can extend `max` and override options;
- custom config can exclude fields;
- `--print-config max` prints valid JSON;
- output remains deterministic.

Follow TDD for each behavior.

## Metrics

Update `README.md` and `docs/ACCEPTANCE.md` with separate metrics for:

- `base`;
- `max`;
- optionally `max` minified, if implemented in CLI output.

Metrics must include source BPMN bytes, output JSON bytes, ratio, and reduction percentage.

## Backlog

1. Add `CompressionConfig` types and built-in presets in `src/config.ts`.
2. Add config resolution: preset, external JSON config, `extends`, merge, validation.
3. Update `convertBpmnToJson(xml, options?)` to accept config or preset.
4. Add CLI flags `--preset`, `--config`, and `--print-config`.
5. Keep `base` as default and preserve current output.
6. Implement `compactSameNameMappings`.
7. Implement `compactServiceTaskImplementation`.
8. Implement `compactTypes`.
9. Implement `compactFlowRefs`.
10. Implement `compactCallActivity`.
11. Implement `compactConditions`.
12. Implement `omitIncomingOutgoing` and `omitDefinitions`.
13. Implement field `exclude` filtering.
14. Regenerate JSON examples for `base` and `max`.
15. Update README and acceptance report with metrics for each preset.
16. Verify tests, typecheck, CLI smoke, determinism, and forbidden-string scan.
