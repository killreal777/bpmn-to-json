---
name: bpmn-optimized-reader
description: Use when an agent needs to inspect, understand, summarize, validate, or reason about BPMN files or BPMN XML. Convert BPMN to the bundled optimized JSON format first, then analyze the compact representation. Also use when evaluating whether optimized BPMN reading improves agent performance.
---

# BPMN Optimized Reader

## Core Workflow

When asked to read or analyze a BPMN file:

1. Convert the BPMN XML to optimized JSON with the bundled converter:

```bash
bash skills/bpmn-optimized-reader/scripts/convert-bpmn-optimized.sh path/to/file.bpmn -o tmp/file.optimized.json
```

2. Read the optimized JSON, not the raw XML, unless conversion fails or the user explicitly asks for raw XML.
3. Decode compact fields using `references/optimized-format.md`.
4. Answer from the converted JSON and mention the generated JSON path when useful.

The converter is local and deterministic. It does not call an LLM or network during conversion. The installable plugin package includes the compiled converter under this skill's `assets/` directory. On first use in a fresh environment, wrappers may run `npm ci --omit=dev` inside the skill asset directory to install Node dependencies from the bundled lockfile.

## Bundled Converter

The skill carries or builds a compiled converter in:

```text
assets/bpmn-to-json
```

Use these wrappers:

```bash
# Convert BPMN to optimized JSON
bash scripts/convert-bpmn-optimized.sh input.bpmn -o output.optimized.json

# Print byte compression metrics for base and optimized presets
bash scripts/bpmn-metrics.sh input.bpmn
```

Resolve script paths relative to this skill directory. When installed as a Codex plugin, Claude Code plugin, or Qwen Code extension, the plugin root is the parent directory that contains `skills/`.

## Reading Guidance

Treat optimized JSON as a graph:

- `processes[].elements[]` are BPMN nodes.
- `processes[].flows[]` are directed edges.
- `meta` starts with `type,id,name,...`.
- `in` and `out` on call activities describe variable mappings.
- `flows` strings describe `from,to,name,condition`.

For path analysis, build adjacency from `flows`, find start events by `meta` type `StartEvent`, and traverse to `EndEvent`. Include gateway labels and conditions when present.

## References

Read only when needed:

- `references/optimized-format.md`: exact compact JSON grammar and decoding rules.
- `references/evaluation.md`: benchmark prompts and metrics for comparing agent performance with and without this skill.
