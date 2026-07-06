import { execFile } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const rootSkill = 'skills/bpmn-optimized-reader';
const rootConverterAsset = `${rootSkill}/assets/bpmn-to-json`;
const packageRoot = 'plugins/bpmn-optimized-reader';
const packagedSkill = `${packageRoot}/skills/bpmn-optimized-reader`;
const converterAsset = `${packagedSkill}/assets/bpmn-to-json`;

describe('installable agent package', () => {
  it('is self-contained for Qwen Code and Claude Code installation from the repository root', async () => {
    const qwenExtension = JSON.parse(await readFile('qwen-extension.json', 'utf8')) as {
      name: string;
      skills: string;
    };
    const claudePlugin = JSON.parse(await readFile('.claude-plugin/plugin.json', 'utf8')) as {
      name: string;
      skills: string;
    };

    expect(qwenExtension).toMatchObject({
      name: 'bpmn-optimized-reader',
      skills: 'skills'
    });
    expect(claudePlugin).toMatchObject({
      name: 'bpmn-optimized-reader',
      skills: './skills/'
    });
    await expect(readFile(`${rootSkill}/SKILL.md`, 'utf8')).resolves.toContain('BPMN Optimized Reader');
    await expect(readFile(`${rootConverterAsset}/dist/cli.js`, 'utf8')).resolves.toContain('preset');
    await expect(readFile(`${rootConverterAsset}/dist/metrics.js`, 'utf8')).resolves.toContain('formatMetricsReport');
    await expect(readFile(`${rootConverterAsset}/package-lock.json`, 'utf8')).resolves.toContain('bpmn-moddle');
  });

  it('declares the plugin package as the marketplace install target', async () => {
    const marketplace = JSON.parse(await readFile('.agents/plugins/marketplace.json', 'utf8')) as {
      plugins: Array<{
        name: string;
        source: { source: string; path: string };
        policy: { installation: string; authentication: string };
        category: string;
      }>;
    };

    expect(marketplace.plugins).toContainEqual({
      name: 'bpmn-optimized-reader',
      source: {
        source: 'local',
        path: './plugins/bpmn-optimized-reader'
      },
      policy: {
        installation: 'AVAILABLE',
        authentication: 'ON_INSTALL'
      },
      category: 'Productivity'
    });
  });

  it('declares a root Claude marketplace plugin for Qwen marketplace-style installs', async () => {
    const marketplace = JSON.parse(await readFile('.claude-plugin/marketplace.json', 'utf8')) as {
      name: string;
      owner: { name: string };
      plugins: Array<{
        name: string;
        description: string;
        source: string;
      }>;
    };

    expect(marketplace).toMatchObject({
      name: 'bpmn-to-json',
      owner: {
        name: 'killreal777'
      }
    });
    expect(marketplace.plugins).toContainEqual({
      name: 'bpmn-optimized-reader',
      description: 'Read BPMN files through optimized compact JSON.',
      source: './'
    });
  });

  it('is self-contained for Qwen Code and Claude Code installation from the plugin directory', async () => {
    const qwenExtension = JSON.parse(await readFile(`${packageRoot}/qwen-extension.json`, 'utf8')) as {
      name: string;
      skills: string;
    };
    const claudePlugin = JSON.parse(await readFile(`${packageRoot}/.claude-plugin/plugin.json`, 'utf8')) as {
      name: string;
      skills: string;
    };

    expect(qwenExtension).toMatchObject({
      name: 'bpmn-optimized-reader',
      skills: 'skills'
    });
    expect(claudePlugin).toMatchObject({
      name: 'bpmn-optimized-reader',
      skills: './skills/'
    });
    await expect(readFile(`${packagedSkill}/SKILL.md`, 'utf8')).resolves.toContain('BPMN Optimized Reader');
    await expect(readFile(`${converterAsset}/dist/cli.js`, 'utf8')).resolves.toContain('preset');
    await expect(readFile(`${converterAsset}/dist/metrics.js`, 'utf8')).resolves.toContain('formatMetricsReport');
    await expect(readFile(`${converterAsset}/package-lock.json`, 'utf8')).resolves.toContain('bpmn-moddle');
  });

  it('runs the bundled converter from the package assets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bpmn-plugin-package-'));
    const output = join(dir, 'loan.optimized.json');

    await execFileAsync('node', [
      `${converterAsset}/dist/cli.js`,
      'docs/bpmn-examples/loan-application-process.bpmn',
      '-o',
      output,
      '--preset',
      'optimized'
    ]);

    const json = await readFile(output, 'utf8');

    expect(json).toContain('"meta"');
    expect(json).toContain('saveApplicationDelegate');
    expect(json).not.toMatch(/(?:camunda|camunca|bpmn):/i);
    expect(json).not.toContain('BPMNDiagram');
  });

  it('documents repository-root installation as the supported Qwen Code install path', async () => {
    const readme = await readFile('README.md', 'utf8');

    expect(readme).toContain('/extensions install');
    expect(readme).toContain('killreal777/bpmn-to-json:bpmn-optimized-reader');
    expect(readme).not.toContain('/tree/main/plugins/bpmn-optimized-reader');
  });

  it('documents repository-root installation as the supported plugin package path', async () => {
    const readme = await readFile(`${packageRoot}/README.md`, 'utf8');

    expect(readme).toContain('https://github.com/killreal777/bpmn-to-json');
    expect(readme).toContain('/plugins');
    expect(readme).not.toContain('/tree/main/plugins/bpmn-optimized-reader');
  });
});
