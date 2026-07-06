import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceSkillDir = resolve(repoRoot, 'skills/bpmn-optimized-reader');
const pluginRoot = resolve(repoRoot, 'plugins/bpmn-optimized-reader');
const packagedSkillDir = resolve(pluginRoot, 'skills/bpmn-optimized-reader');
const skillConverterDir = resolve(sourceSkillDir, 'assets/bpmn-to-json');
const distDir = resolve(skillConverterDir, 'dist');

await mkdir(skillConverterDir, { recursive: true });
await rm(distDir, { recursive: true, force: true });
await rm(resolve(skillConverterDir, 'node_modules'), { recursive: true, force: true });

const sourceFiles = [
  ...await tsFiles(resolve(repoRoot, 'src')),
  ...await tsFiles(resolve(repoRoot, 'src/optimizations'))
].map((path) => path.slice(repoRoot.length + 1));

execFileSync('npx', [
  'tsc',
  '--outDir',
  distDir,
  '--rootDir',
  'src',
  '--module',
  'NodeNext',
  '--moduleResolution',
  'NodeNext',
  '--target',
  'ES2022',
  '--strict',
  '--esModuleInterop',
  '--forceConsistentCasingInFileNames',
  '--skipLibCheck',
  ...sourceFiles
], {
  cwd: repoRoot,
  stdio: 'inherit'
});

await cp(resolve(repoRoot, 'package.json'), resolve(skillConverterDir, 'package.json'));
await cp(resolve(repoRoot, 'package-lock.json'), resolve(skillConverterDir, 'package-lock.json'));

await rm(packagedSkillDir, { recursive: true, force: true });
await mkdir(dirname(packagedSkillDir), { recursive: true });
await cp(sourceSkillDir, packagedSkillDir, { recursive: true });
await rm(resolve(packagedSkillDir, 'assets/bpmn-to-json/node_modules'), { recursive: true, force: true });

console.log(`Built BPMN optimized reader assets into ${skillConverterDir}`);
console.log(`Synced BPMN optimized reader package into ${pluginRoot}`);

async function tsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => resolve(dir, entry.name))
    .sort();
}
