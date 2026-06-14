# BPMN Optimized Reader Repository Design

## Goal

Create a standalone sibling repository named `bpmn-optimized-reader` that can
be installed directly as an agent plugin or extension. Keep the converter
source in `bpmn-to-json`, while shipping a compiled, autonomous converter
inside the reader repository.

## Repository Structure

The repository root is the plugin root, following the layout used by
`obra/superpowers`. It must not contain a second nested plugin copy.

```text
bpmn-optimized-reader/
|-- .codex-plugin/
|   `-- plugin.json
|-- .claude-plugin/
|   `-- plugin.json
|-- skills/
|   `-- bpmn-optimized-reader/
|       |-- SKILL.md
|       |-- assets/
|       |   `-- bpmn-to-json/
|       |       |-- dist/
|       |       |-- package.json
|       |       `-- package-lock.json
|       |-- references/
|       |   |-- evaluation.md
|       |   `-- optimized-format.md
|       `-- scripts/
|           |-- bpmn-metrics.sh
|           `-- convert-bpmn-optimized.sh
|-- tests/
|   `-- smoke.ps1
|-- .gitignore
|-- LICENSE
|-- README.md
`-- qwen-extension.json
```

Platform manifests point directly to `./skills/`. There is no
`plugins/bpmn-optimized-reader/` directory and no duplicate `SKILL.md`.

## Converter Packaging

`bpmn-to-json` remains the source repository for converter behavior. The new
repository contains compiled JavaScript plus the production package manifest
and lockfile under:

```text
skills/bpmn-optimized-reader/assets/bpmn-to-json
```

Conversion is local and deterministic. Runtime conversion makes no network or
LLM calls. Dependency installation may be required once after installing the
extension, using the bundled lockfile.

The initial repository is populated from the currently generated plugin
package in `bpmn-to-json`. Future converter releases are copied into this
repository explicitly; no Git submodule or runtime dependency on the sibling
checkout is introduced.

## Agent Workflow

When the skill receives a BPMN reading or analysis task, it:

1. Runs the bundled converter with the `optimized` preset.
2. Reads the compact JSON rather than raw BPMN XML.
3. Decodes compact fields using `references/optimized-format.md`.
4. Answers from the compact process graph.

If conversion fails, the wrapper returns the converter error and does not
silently analyze stale output.

## Platform Support

The initial repository supports the same three harnesses already represented
in `bpmn-to-json`:

- Codex through `.codex-plugin/plugin.json`;
- Claude Code through `.claude-plugin/plugin.json`;
- Qwen Code through `qwen-extension.json`.

Additional harness-specific packaging is outside the initial scope.

## Documentation

`README.md` explains:

- what the extension does;
- the distinction between `bpmn-to-json` and `bpmn-optimized-reader`;
- repository-based installation for each supported harness;
- local development and smoke-test commands;
- how to refresh the embedded converter from `bpmn-to-json`.

## Verification

The repository includes a Windows-friendly smoke test that verifies:

- required manifests and skill files exist;
- manifest names agree on `bpmn-optimized-reader`;
- the bundled converter processes a minimal BPMN fixture;
- output is valid optimized JSON;
- two conversions of the same input are byte-identical;
- optimized output contains no BPMN DI/layout or namespace noise.

Before completion, validate the Codex plugin manifest with the plugin creator
validator and run the smoke test from the new repository root.

## Git Boundary

Create `C:\Users\killr\ubuntu\projects\bpmn-optimized-reader` as an independent
Git repository. Its initial commit contains only extension files and embedded
runtime assets.

After the standalone repository passes validation, remove all plugin and skill
packaging from `bpmn-to-json`:

```text
.codex-plugin/
.claude-plugin/
plugins/
skills/
qwen-extension.json
scripts/build-bpmn-skill.mjs
```

Also remove the `build:skill` script from `package.json` and refresh
`package-lock.json` if npm changes its root package metadata.

Do not remove converter functionality or converter documentation. In
particular, keep:

- `src/`, including optimized projection code;
- `test/`;
- `docs/bpmn-examples/`;
- `docs/json-examples/`;
- compression and optimized-preset documentation;
- converter scripts unrelated to plugin packaging.

The cleanup happens only after the new repository contains and successfully
tests the migrated extension, so there is always one working copy during the
transition.
