# BPMN to JSON

Local deterministic CLI converter for transforming BPMN XML into compact JSON.

The converter is designed for the first stage of this pipeline:

```text
BPMN XML -> compact JSON -> Markdown description -> RAG knowledge base
```

This repository implements only `BPMN XML -> compact JSON`.

## What It Keeps

The Base JSON projection keeps information that helps understand process structure and execution behavior:

- processes, collaborations, participants;
- flow elements such as events, tasks, gateways, call activities, and subprocess-like elements;
- sequence flows with source and target ids;
- incoming and outgoing flow ids;
- gateway conditions;
- Camunda execution details such as `camunda:delegateExpression` and `camunda:asyncBefore`;
- call activity `calledElement`;
- structured extension elements grouped by type, for example `camunda:In: [{ "source": "x", "target": "y" }]`.

The Optimized preset starts from Base JSON and applies typed optimizations:

- element identity is packed into a compact `meta` string;
- sequence flows are packed as `from,to,name,condition` strings;
- call activity mappings use compact `in` and `out` arrays;
- redundant graph references and top-level metadata are omitted.

## What It Drops

The converter does not serialize the full BPMN moddle object model. It intentionally excludes:

- BPMNDI/DI/DC layout data;
- diagram shapes, edges, bounds, waypoints, coordinates, width, height;
- XML namespace noise and editor-only metadata;
- cyclic moddle references such as `$parent`;
- documentation text;
- `targetNamespace`, `isExecutable`, and `camunda:historyTimeToLive`.

## Requirements

- Node.js 20+ is recommended.
- `npm`
- `jq` is optional, used only for manual JSON validation examples.

## Install

```bash
npm install
```

## Usage

Run the CLI directly with `tsx`:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan.json
```

Or through the npm script:

```bash
npm run convert -- docs/bpmn-examples/risk-check-process.bpmn -o tmp/risk.json
```

Validate the result:

```bash
jq . tmp/loan.json >/dev/null
```

Choose a compression preset:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan.optimized.json --preset optimized
```

Export a preset as a starting point for a custom config:

```bash
npx tsx src/cli.ts --print-config optimized > compression.optimized.json
```

Use an editable config file:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan.custom.json --config compression.optimized.json
```

Example custom config:

```json
{
  "extends": "optimized",
  "fields": {
    "exclude": ["definitions", "collaborations", "elements.incoming", "elements.outgoing"]
  },
  "optimizations": {
    "enabled": ["compactElementMeta", "compactCallMappings", "compactFlows"]
  },
  "output": {
    "pretty": true
  }
}
```

## Example Files

Input BPMN examples:

- `docs/bpmn-examples/loan-application-process.bpmn`
- `docs/bpmn-examples/risk-check-process.bpmn`
- `test/fixtures/simple-linear.bpmn`
- `test/fixtures/gateway-condition.bpmn`

Generated JSON examples:

- `docs/json-examples/base/loan-application-process.json`
- `docs/json-examples/base/risk-check-process.json`
- `docs/json-examples/optimized/loan-application-process.json`
- `docs/json-examples/optimized/risk-check-process.json`

Regenerate them with:

```bash
mkdir -p docs/json-examples/base docs/json-examples/optimized
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/base/loan-application-process.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/base/risk-check-process.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/optimized/loan-application-process.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/optimized/risk-check-process.json --preset optimized
```

## Compression Metrics

Current example outputs:

| Example | Source BPMN | Compact JSON | Ratio | Reduction |
| --- | ---: | ---: | ---: | ---: |
| `loan-application-process` / `base` | 4,855 bytes | 3,536 bytes | 1.37x | 27.2% |
| `loan-application-process` / `optimized` | 4,855 bytes | 1,318 bytes | 3.68x | 72.9% |
| `risk-check-process` / `base` | 2,872 bytes | 1,638 bytes | 1.75x | 43.0% |
| `risk-check-process` / `optimized` | 2,872 bytes | 611 bytes | 4.70x | 78.7% |

Recalculate metrics with:

```bash
npm run metrics -- docs/bpmn-examples/loan-application-process.bpmn
npm run metrics -- docs/bpmn-examples/risk-check-process.bpmn
```

## Development

Run tests:

```bash
npm test
```

Run TypeScript type checking:

```bash
npm run typecheck
```

Run the smoke acceptance commands:

```bash
npx tsx src/cli.ts test/fixtures/simple-linear.bpmn -o tmp/simple-1.json
npx tsx src/cli.ts test/fixtures/gateway-condition.bpmn -o tmp/gateway-1.json
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json --preset optimized
diff tmp/loan-1.json tmp/loan-2.json
```

Acceptance notes are in `docs/ACCEPTANCE.md`.

## Runtime Constraints

Runtime conversion is local and deterministic:

- no LLM calls;
- no network calls;
- no nondeterministic ordering;
- same input produces the same JSON output.
