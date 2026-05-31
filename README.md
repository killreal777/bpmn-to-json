# BPMN to JSON

Local deterministic CLI converter for transforming BPMN XML into compact JSON.

The converter is designed for the first stage of this pipeline:

```text
BPMN XML -> compact JSON -> Markdown description -> RAG knowledge base
```

This repository implements only `BPMN XML -> compact JSON`.

## What It Keeps

The JSON projection keeps information that helps understand process structure and execution behavior:

- processes, collaborations, participants;
- flow elements such as events, tasks, gateways, call activities, and subprocess-like elements;
- sequence flows with source and target ids;
- incoming and outgoing flow ids;
- gateway conditions;
- documentation text when present;
- compact Camunda execution details such as `camunda:delegateExpression`;
- call activity `calledElement`;
- compact extension mappings grouped by type, for example `camunda:In: ["source->target"]`.

## What It Drops

The converter does not serialize the full BPMN moddle object model. It intentionally excludes:

- BPMNDI/DI/DC layout data;
- diagram shapes, edges, bounds, waypoints, coordinates, width, height;
- XML namespace noise and editor-only metadata;
- cyclic moddle references such as `$parent`;
- `targetNamespace`, `isExecutable`, and `camunda:historyTimeToLive`.
- compression-oriented execution flags: `camunda:asyncBefore`, `camunda:asyncAfter`, and `camunda:exclusive`.

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
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan.max.json --preset max
```

Export a preset as a starting point for a custom config:

```bash
npx tsx src/cli.ts --print-config max > compression.max.json
```

Use an editable config file:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan.custom.json --config compression.max.json
```

Example custom config:

```json
{
  "extends": "max",
  "fields": {
    "exclude": ["definitions", "collaborations", "elements.incoming", "elements.outgoing"]
  },
  "optimizations": {
    "compactTypes": true,
    "compactServiceTaskImplementation": true,
    "compactSameNameMappings": true
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
- `docs/json-examples/max/loan-application-process.json`
- `docs/json-examples/max/risk-check-process.json`

Regenerate them with:

```bash
mkdir -p docs/json-examples/base docs/json-examples/max
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/base/loan-application-process.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/base/risk-check-process.json --preset base
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/max/loan-application-process.json --preset max
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/max/risk-check-process.json --preset max
```

## Compression Metrics

Current example outputs:

| Example | Source BPMN | Compact JSON | Ratio | Reduction |
| --- | ---: | ---: | ---: | ---: |
| `loan-application-process` / `base` | 4,855 bytes | 3,006 bytes | 1.62x | 38.1% |
| `loan-application-process` / `max` | 4,855 bytes | 1,843 bytes | 2.63x | 62.0% |
| `risk-check-process` / `base` | 2,872 bytes | 1,597 bytes | 1.80x | 44.4% |
| `risk-check-process` / `max` | 2,872 bytes | 872 bytes | 3.29x | 69.6% |

Recalculate metrics with:

```bash
node --input-type=module - <<'NODE'
import { statSync } from 'node:fs';

const pairs = [
  ['loan base', 'docs/bpmn-examples/loan-application-process.bpmn', 'docs/json-examples/base/loan-application-process.json'],
  ['loan max', 'docs/bpmn-examples/loan-application-process.bpmn', 'docs/json-examples/max/loan-application-process.json'],
  ['risk base', 'docs/bpmn-examples/risk-check-process.bpmn', 'docs/json-examples/base/risk-check-process.json'],
  ['risk max', 'docs/bpmn-examples/risk-check-process.bpmn', 'docs/json-examples/max/risk-check-process.json']
];

for (const [name, input, output] of pairs) {
  const source = statSync(input).size;
  const json = statSync(output).size;
  const ratio = source / json;
  const reduction = (1 - json / source) * 100;
  console.log(`${name}: ${source} -> ${json} bytes, ${ratio.toFixed(2)}x, ${reduction.toFixed(1)}% reduction`);
}
NODE
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
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json --preset max
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json --preset max
diff tmp/loan-1.json tmp/loan-2.json
```

Acceptance notes are in `docs/ACCEPTANCE.md`.

## Runtime Constraints

Runtime conversion is local and deterministic:

- no LLM calls;
- no network calls;
- no nondeterministic ordering;
- same input produces the same JSON output.
