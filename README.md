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
- Camunda execution details such as `camunda:asyncBefore`, `camunda:asyncAfter`, `camunda:exclusive`, `camunda:delegateExpression`;
- call activity `calledElement`;
- compact extension mappings such as `camunda:In` and `camunda:Out`.

## What It Drops

The converter does not serialize the full BPMN moddle object model. It intentionally excludes:

- BPMNDI/DI/DC layout data;
- diagram shapes, edges, bounds, waypoints, coordinates, width, height;
- XML namespace noise and editor-only metadata;
- cyclic moddle references such as `$parent`;
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

## Example Files

Input BPMN examples:

- `docs/bpmn-examples/loan-application-process.bpmn`
- `docs/bpmn-examples/risk-check-process.bpmn`
- `test/fixtures/simple-linear.bpmn`
- `test/fixtures/gateway-condition.bpmn`

Generated JSON examples:

- `docs/json-examples/loan-application-process.json`
- `docs/json-examples/risk-check-process.json`

Regenerate them with:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o docs/json-examples/loan-application-process.json
npx tsx src/cli.ts docs/bpmn-examples/risk-check-process.bpmn -o docs/json-examples/risk-check-process.json
```

## Compression Metrics

Current example outputs:

| Example | Source BPMN | Compact JSON | Ratio | Reduction |
| --- | ---: | ---: | ---: | ---: |
| `loan-application-process` | 4,855 bytes | 4,150 bytes | 1.17x | 14.5% |
| `risk-check-process` | 2,872 bytes | 2,036 bytes | 1.41x | 29.1% |

Recalculate metrics with:

```bash
node --input-type=module - <<'NODE'
import { statSync } from 'node:fs';

const pairs = [
  ['loan-application-process', 'docs/bpmn-examples/loan-application-process.bpmn', 'docs/json-examples/loan-application-process.json'],
  ['risk-check-process', 'docs/bpmn-examples/risk-check-process.bpmn', 'docs/json-examples/risk-check-process.json']
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
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json
diff tmp/loan-1.json tmp/loan-2.json
```

Acceptance notes are in `docs/ACCEPTANCE.md`.

## Runtime Constraints

Runtime conversion is local and deterministic:

- no LLM calls;
- no network calls;
- no nondeterministic ordering;
- same input produces the same JSON output.
