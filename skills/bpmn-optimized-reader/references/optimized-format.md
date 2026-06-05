# Optimized BPMN JSON Format

## Element `meta`

Format:

```text
type,id,name,...
```

The string is CSV-like: quoted fields may contain commas or quotes.

Common examples:

```text
StartEvent,StartLoanApplication
ServiceTask,SaveApplication,Save application,saveApplicationDelegate,asyncBefore
ServiceTask,ExternalRiskCheck,External risk check,riskCheckDelegate,external,asyncBefore
CallActivity,CallRiskCheck,Run risk check,risk-check,asyncBefore
```

Decode fields:

- field 1: BPMN element type without namespace, e.g. `ServiceTask`;
- field 2: element id;
- field 3: optional element name;
- remaining fields: compact execution/call details.

Known remaining fields:

- `asyncBefore`: original `camunda:asyncBefore=true`;
- `external`: original `camunda:type="external"`;
- value ending in `Delegate` on a task: delegate/topic bean value;
- extra value on `CallActivity`: called process key (`calledElement`).

## Call Activity Mappings

`camunda:In` becomes `in`; `camunda:Out` becomes `out`.

Mapping strings:

```text
var                    # source=var target=var
source->target         # source mapping with different target
=expr->target          # sourceExpression mapping
*                      # variables="all"
```

The leading `=` is semantically important: it means expression, not a source variable name.

## Flows

Sequence flows are strings:

```text
from,to,name,condition
```

Trailing empty fields are omitted.

Examples:

```text
StartEvent_1,Task_1
Gateway_1,Task_Approve,approved,riskScore < 50@feel
Gateway_1,Task_Reject,rejected,riskScore >= 50
```

Condition format:

```text
body
body@language
```

## Omitted Data

Optimized JSON intentionally omits:

- top-level `definitions`;
- top-level `collaborations`;
- element `incoming` and `outgoing`;
- BPMNDI/DI/DC layout data;
- namespace prefixes `camunda:`, `camunca:`, and `bpmn:` in final keys and string values.

Use `flows` as the source of graph truth.
