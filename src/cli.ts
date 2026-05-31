import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { convertBpmnToJson } from './convert.js';

type CliArgs = {
  input: string;
  output: string;
};

const USAGE = 'Usage: npx tsx src/cli.ts <input.bpmn> -o <output.json>';

async function main(args: string[]): Promise<void> {
  const { input, output } = parseArgs(args);
  const xml = await readFile(input, 'utf8');
  const json = await convertBpmnToJson(xml);

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

function parseArgs(args: string[]): CliArgs {
  const input = args.find((arg) => !arg.startsWith('-'));
  const outputFlagIndex = args.findIndex((arg) => arg === '-o' || arg === '--output');
  const output = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : undefined;

  if (!input || !output || output.startsWith('-')) {
    throw new Error(USAGE);
  }

  return { input, output };
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
