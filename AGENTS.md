# AGENTS.md

Instructions for agents working in this repository.

## Project Goal

Build and maintain a local deterministic converter:

```text
BPMN XML -> compact JSON
```

Do not add Markdown generation, RAG indexing, visualization, batch mode, profiles, or LLM-based runtime decisions unless explicitly requested.

## Runtime Rules

- Runtime conversion must be local and deterministic.
- Do not use network calls during conversion.
- Do not use an LLM during conversion.
- Do not serialize the full `bpmn-moddle` object model with `JSON.stringify(definitions)`.
- Always project BPMN data explicitly into compact JSON.

## Documentation Lookup

Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service.

Steps:

1. Resolve library:

```bash
npx ctx7@latest library <name> "<user's question>"
```

2. Pick the best `/org/project` match.
3. Fetch docs:

```bash
npx ctx7@latest docs <libraryId> "<user's question>"
```

Use this especially for `bpmn-moddle`, `camunda-bpmn-moddle`, TypeScript, Node.js, Vitest, and `tsx` API or configuration questions.

Do not use ctx7 for business-logic debugging, code review, refactoring, or writing scripts from scratch.

If ctx7 fails with a quota error, tell the user and suggest `npx ctx7@latest login` or setting `CONTEXT7_API_KEY`.

## JSON Projection Rules

Keep information that explains process flow or execution behavior:

- definitions id;
- collaborations and participants;
- processes;
- flow elements;
- sequence flows;
- incoming and outgoing flow ids;
- gateway conditions;
- event definitions when present;
- execution-related Camunda attributes;
- call activity `calledElement`;
- extension elements such as `camunda:In` and `camunda:Out`.

Exclude:

- `BPMNDiagram`, `BPMNPlane`, `BPMNShape`, `BPMNEdge`;
- `Bounds`, `waypoint`, coordinates, width, height;
- BPMNDI/DI/DC layout structures;
- XML namespace/editor noise;
- `$parent` and cyclic moddle references;
- `targetNamespace`;
- `isExecutable`;
- `camunda:historyTimeToLive`.

Compression decision: preserve explicit async/exclusive execution attributes in Base JSON. In Optimized JSON, pack `camunda:asyncBefore="true"` into element `meta` as `asyncBefore`; do not require Camunda/BPMN namespace prefixes in optimized output.

Represent simple extension mappings compactly:

```json
{
  "extensions": {
    "camunda:In": ["source->target"],
    "camunda:Out": ["sourceExpression->target"]
  }
}
```

## Development Workflow

- Keep the architecture small: `src/cli.ts` for CLI and `src/convert.ts` for conversion/projection.
- Keep compression config logic in `src/config.ts`.
- Prefer focused tests in `test/convert.test.ts`.
- Use existing BPMN examples in `docs/bpmn-examples` and fixtures in `test/fixtures`.
- Do not commit generated `tmp/` output.
- If example JSON files are intentionally regenerated, update `docs/json-examples`.
- Preserve `base` as the default preset unless the user explicitly requests a breaking default change.
- Commit and push incrementally by usable feature when working on the compression backlog.

## Verification

Before claiming completion, run:

```bash
npm test
npm run typecheck
```

For converter behavior, also run:

```bash
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-1.json --preset optimized
npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o tmp/loan-2.json --preset optimized
diff tmp/loan-1.json tmp/loan-2.json
rg "BPMNDiagram|BPMNPlane|BPMNShape|BPMNEdge|Bounds|waypoint|bpmndi|dc:|di:|width|height|targetNamespace|isExecutable|historyTimeToLive|camunda:|bpmn:|Camunda:|Bpmn:|BPMN:" tmp/loan-1.json tmp/loan-2.json
```

The `rg` command should find no matches.

## Reports

README and acceptance reports should include compression metrics for committed examples:

- source BPMN size in bytes;
- compact JSON size in bytes;
- ratio as `source / json`;
- reduction as `1 - json / source`.

When JSON examples are regenerated, update the metric tables in `README.md` and `docs/ACCEPTANCE.md` for both `base` and `optimized`.
