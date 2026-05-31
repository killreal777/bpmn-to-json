# BPMN XML to Compact JSON Converter Design

## Goal

Build a local deterministic TypeScript CLI that converts a BPMN XML file into compact JSON for later agent processing.

The converter implements only this stage:

```text
BPMN XML -> compact JSON
```

It does not generate Markdown, index RAG content, visualize graphs, or call an LLM at runtime.

## Inputs and Outputs

The CLI accepts one BPMN/XML input path and one output path:

```bash
npx tsx src/cli.ts input.bpmn -o output.json
```

The output is pretty-printed JSON. It is stable across repeated runs for the same input and excludes visual diagram layout data.

## Recommended Approach

Use an explicit projection over the `bpmn-moddle` object model.

`bpmn-moddle` parses XML into BPMN objects. The converter then manually projects only semantic and execution-related information into a compact JSON shape. This keeps the output understandable and avoids dumping the whole XML/model structure.

Rejected alternatives:

- Recursive object sanitizer: faster to start, but likely to leak XML/model noise and look like a mechanical serialization.
- Minimal business graph only: compact, but would drop execution details such as delegates, called elements, scripts, business rule metadata, and extension mappings.

## Architecture

The project stays intentionally small:

```text
package.json
tsconfig.json
src/
  cli.ts
  convert.ts
test/
  fixtures/
  convert.test.ts
docs/
  bpmn-examples/
```

`src/cli.ts` handles command-line arguments, file reads, conversion calls, file writes, and process exit codes.

`src/convert.ts` creates `BpmnModdle`, calls `fromXML`, walks the BPMN model, builds the compact JSON projection, prunes empty values, and applies stable ordering.

Tests are intentionally minimal and exist to support test-first implementation:

- basic process structure is projected;
- Camunda execution details and extension mappings are preserved;
- BPMNDI/DC/DI layout details are excluded;
- repeated conversions are deterministic.

Manual smoke acceptance still follows `docs/REQUIREMENTS.md`.

## JSON Shape

The output uses a stable high-level structure:

```json
{
  "definitions": {
    "id": "Definitions_LoanApplication"
  },
  "collaborations": [
    {
      "id": "Collaboration_LoanApplication",
      "participants": [
        {
          "id": "Participant_LoanApplication",
          "name": "Loan application process",
          "processRef": "loan-application-process"
        }
      ]
    }
  ],
  "processes": [
    {
      "id": "loan-application-process",
      "name": "Loan application process",
      "elements": [
        {
          "id": "SaveApplication",
          "type": "bpmn:ServiceTask",
          "name": "Save application",
          "incoming": ["Flow_Start_To_Save"],
          "outgoing": ["Flow_Save_To_Risk"],
          "execution": {
            "camunda:asyncBefore": true,
            "camunda:delegateExpression": "${saveApplicationDelegate}"
          }
        }
      ],
      "flows": [
        {
          "id": "Flow_Start_To_Save",
          "sourceRef": "StartLoanApplication",
          "targetRef": "SaveApplication"
        }
      ]
    }
  ],
  "warnings": []
}
```

The final output omits empty arrays and objects. The example keeps `warnings` to show where parser warnings go if present; if there are no warnings, the field may be omitted.

## Included Information

The converter includes information that helps understand process flow or execution behavior:

- definitions id;
- collaborations and participants;
- processes;
- flow elements such as events, tasks, gateways, subprocesses, call activities, data objects, and data stores;
- sequence flows with source, target, name, and condition expression;
- incoming and outgoing flow ids;
- documentation text;
- event definitions such as timer, message, signal, error, escalation, and conditional definitions;
- implementation attributes for service tasks, user tasks, script tasks, business rule tasks, send tasks, receive tasks, and call activities;
- `calledElement` for call activities;
- scripts and script formats;
- Camunda and other extension attributes that affect execution;
- extension elements such as `camunda:in`, `camunda:out`, input/output mappings, listeners, fields, forms, and task assignment metadata when present in the parsed model.

## Excluded Information

The converter excludes fields that are layout-only, XML/editor noise, or not useful for this MVP:

- `BPMNDiagram`, `BPMNPlane`, `BPMNShape`, `BPMNEdge`;
- `Bounds`, `waypoint`, coordinates, width, height, labels used only for drawing;
- `bpmndi`, `dc`, and `di` namespace/layout structures;
- schema location and namespace noise;
- library internals such as `$parent`;
- circular object references;
- `targetNamespace`;
- `isExecutable`;
- Camunda history TTL such as `camunda:historyTimeToLive`.

## Projection Rules

Sequence flows are stored in `flows`. Other process flow elements are stored in `elements`.

Object references are normalized to ids. For example, `sourceRef` and `targetRef` become string ids instead of nested objects.

Execution-related attributes are grouped under `execution` when they are not core BPMN graph fields.

Extension elements are represented as compact typed objects:

```json
{
  "type": "camunda:In",
  "source": "applicationId",
  "target": "applicationId"
}
```

The projection keeps unknown extension fields only when they are primitive values or id references. It does not recursively serialize arbitrary moddle objects.

## Determinism and Cleanup

The converter produces deterministic JSON by:

- sorting arrays by `id`, then `type`, then `name`;
- sorting object keys before serialization;
- omitting `undefined`, `null`, empty strings, empty arrays, and empty objects;
- never including cyclic references;
- never including layout-only model branches.

## Error Handling

CLI errors are plain and actionable:

- missing input or output path exits non-zero and prints usage;
- unreadable input file exits non-zero;
- BPMN parse failure exits non-zero and prints the parse error;
- output write failure exits non-zero.

Non-fatal `bpmn-moddle` warnings are included in JSON when present and may also be printed by the CLI.

## Acceptance

The MVP is accepted when:

- `npx tsx src/cli.ts docs/bpmn-examples/loan-application-process.bpmn -o <output>` creates valid JSON;
- the same works for `docs/bpmn-examples/risk-check-process.bpmn`;
- output contains process elements and sequence flows;
- output preserves Camunda delegates, async flags, call activity `calledElement`, and `camunda:in/out` mappings from the examples;
- output does not contain layout strings such as `BPMNDiagram`, `BPMNShape`, `Bounds`, `waypoint`, `dc:`, `di:`, `width`, or `height`;
- two conversions of the same input produce identical files;
- a short acceptance report is written in the format requested by `docs/REQUIREMENTS.md`.
