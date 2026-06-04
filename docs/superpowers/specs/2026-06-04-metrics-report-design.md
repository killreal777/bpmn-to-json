# BPMN Metrics Report Design

## Goal

Add a lightweight console report command that measures converter efficiency for a BPMN file on demand.

The command should let the user quickly test a BPMN schema and see current compression metrics for every available preset without regenerating documentation tables manually.

## User-Facing Command

Add a new npm script:

```bash
npm run metrics -- path/to/process.bpmn
```

The script runs all presets from `PRESET_NAMES`.

The command prints a console report and does not write converted JSON files to `tmp/` or any other output directory.

## Output Format

The default output is a terminal-friendly text table:

```text
Input: docs/bpmn-examples/loan-application-process.bpmn
Source BPMN: 4,855 bytes

Preset      Output bytes  Ratio   Reduction
base        3,536         1.37x   27.2%
optimized   1,318         3.68x   72.9%
```

The values are:

- source BPMN size in UTF-8 bytes;
- converted output size in UTF-8 bytes;
- ratio as `source / output`;
- reduction as `1 - output / source`.

The report is console-first. It does not need to generate a Markdown file. If documentation needs the values, the console output can be copied manually or the command can be extended by a separate feature.

## Architecture

Create a separate CLI entrypoint:

```text
src/metrics.ts
```

This keeps the existing conversion CLI focused on converting BPMN to one output file. Metrics reporting is a different workflow and should not complicate `src/cli.ts` argument handling.

Data flow:

```text
read BPMN XML
  -> for each PRESET_NAMES entry
  -> convertBpmnToJson(xml, { preset })
  -> serialize with the preset output formatting
  -> measure output bytes
  -> calculate ratio and reduction
  -> print table
```

The script uses existing project code:

- `PRESET_NAMES` and `getPresetConfig` from `src/config.ts`;
- `convertBpmnToJson` from `src/convert.ts`.

It should not duplicate conversion logic or call the existing CLI through a shell command.

## Error Handling

If no BPMN path is provided, print usage and exit non-zero:

```text
Usage:
  npm run metrics -- <input.bpmn>
```

If the input file cannot be read or conversion fails, print the error message and exit non-zero.

## Testing

Add focused tests for:

- report generation includes every preset from `PRESET_NAMES`;
- byte metrics, ratio, and reduction are calculated from UTF-8 byte lengths;
- the CLI prints usage when no input path is passed;
- the CLI report for a fixture includes the input path, source size, preset names, ratios, and reductions.

The implementation should keep tests deterministic and should not depend on generated files in `tmp/`.

## Branch Strategy

Implementation should happen in a separate feature branch:

```text
feature/metrics-report
```

This feature is independent from `feature/base-mode` and `feature/optimized-mode`, except that preset names displayed by the report should follow whatever names exist in `PRESET_NAMES` at implementation time.

## Verification

Before claiming completion, run:

```bash
npm test
npm run typecheck
npm run metrics -- docs/bpmn-examples/loan-application-process.bpmn
```
