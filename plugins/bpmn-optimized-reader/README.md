# BPMN Optimized Reader

Installable agent package for reading BPMN files through optimized compact JSON.

This directory is the canonical install root:

```text
plugins/bpmn-optimized-reader
```

It contains:

- `qwen-extension.json` for Qwen Code `/extensions install`;
- `.claude-plugin/plugin.json` for Claude Code `/plugins`;
- `skills/bpmn-optimized-reader` with the agent skill;
- `skills/bpmn-optimized-reader/assets/bpmn-to-json` with the compiled converter and npm lockfile.

## Qwen Code

From Qwen Code, install this package by using the GitHub URL for this subdirectory:

```text
/extensions install https://github.com/killreal777/bpmn-to-json/tree/main/plugins/bpmn-optimized-reader
```

Equivalent CLI form:

```bash
qwen extensions install https://github.com/killreal777/bpmn-to-json/tree/main/plugins/bpmn-optimized-reader
```

## Claude Code

From Claude Code `/plugins`, install the plugin from this same subdirectory URL:

```text
https://github.com/killreal777/bpmn-to-json/tree/main/plugins/bpmn-optimized-reader
```

If your Claude Code UI installs from a repository marketplace instead, add this repository as the marketplace and choose `bpmn-optimized-reader`; the marketplace entry points to `./plugins/bpmn-optimized-reader`.

## First Use

The skill invokes the bundled wrapper:

```bash
bash skills/bpmn-optimized-reader/scripts/convert-bpmn-optimized.sh input.bpmn -o tmp/input.optimized.json
```

On first use, the wrapper may run `npm ci --omit=dev` inside:

```text
skills/bpmn-optimized-reader/assets/bpmn-to-json
```

Runtime conversion remains local and deterministic. No LLM or network calls are made during BPMN conversion.

## Rebuild Package

From the repository root:

```bash
npm run build:skill
```

This refreshes `skills/` content and the compiled converter inside this package.
