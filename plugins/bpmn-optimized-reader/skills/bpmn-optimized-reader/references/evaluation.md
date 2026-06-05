# BPMN Reading Evaluation

Use these tasks to compare agent behavior with raw BPMN XML versus optimized JSON.

## Recommended Metrics

Measure:

- input bytes or estimated tokens consumed before answering;
- answer latency or number of agent turns;
- path recall: expected token paths found / total expected paths;
- edge accuracy: incorrect or missing sequence flows;
- gateway condition accuracy;
- call activity mapping accuracy, especially `source` vs `sourceExpression`;
- execution-detail accuracy: delegates, `external`, `asyncBefore`;
- hallucinated elements, flows, or variables.

## Benchmark Prompt: Token Paths

```text
Analyze this BPMN process. Enumerate every possible token path from each start event to each end event.

For each path include:
- element ids and names in order;
- sequence flow labels;
- gateway conditions;
- called processes;
- service task delegate/topic values;
- variables passed into and out of every call activity.

Do not skip alternate gateway branches. If a condition is an expression, preserve it exactly.
```

## Benchmark Prompt: Call Activity Variables

```text
Find every call activity in this BPMN. For each one, report:
- activity id and name;
- called process key;
- all input mappings;
- all output mappings;
- whether each mapping uses source, sourceExpression, or variables="all".
```

## Benchmark Prompt: Execution Semantics

```text
List every executable task-like element. For each one, report:
- id, type, and name;
- delegate expression, class, expression, external topic, or called process;
- asyncBefore/asyncAfter/exclusive flags if present;
- incoming and outgoing logical flow inferred from sequence flows.
```

## Comparison Method

Run each prompt twice:

1. Raw XML mode: give the agent only the BPMN XML.
2. Skill mode: let the agent use this skill and the optimized JSON.

Score both answers against the same expected facts. Prefer exact-match scoring for ids, conditions, and variable mappings.
