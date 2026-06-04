import { readFile } from 'node:fs/promises';
import {
  getPresetConfig,
  PRESET_NAMES,
  type CompressionPresetName
} from './config.js';
import { convertBpmnToJson } from './convert.js';

export type PresetMetrics = {
  preset: CompressionPresetName;
  outputBytes: number;
  ratio: number;
  reduction: number;
};

export type MetricsReport = {
  inputPath: string;
  sourceBytes: number;
  rows: PresetMetrics[];
};

const USAGE = [
  'Usage:',
  '  npm run metrics -- <input.bpmn>'
].join('\n');

export function calculateMetrics(sourceBytes: number, outputBytes: number): Omit<PresetMetrics, 'preset'> {
  return {
    outputBytes,
    ratio: sourceBytes / outputBytes,
    reduction: (1 - outputBytes / sourceBytes) * 100
  };
}

export async function createMetricsReport(inputPath: string, xml: string): Promise<MetricsReport> {
  const sourceBytes = Buffer.byteLength(xml, 'utf8');
  const rows: PresetMetrics[] = [];

  for (const preset of PRESET_NAMES) {
    const config = getPresetConfig(preset);
    const json = await convertBpmnToJson(xml, { config });
    const jsonText = config.output?.pretty === false
      ? JSON.stringify(json)
      : JSON.stringify(json, null, 2);
    const metrics = calculateMetrics(sourceBytes, Buffer.byteLength(`${jsonText}\n`, 'utf8'));

    rows.push({
      preset,
      ...metrics
    });
  }

  return {
    inputPath,
    sourceBytes,
    rows
  };
}

export function formatMetricsReport(report: MetricsReport): string {
  const rows = report.rows.map((row) => [
    row.preset,
    formatInteger(row.outputBytes),
    `${row.ratio.toFixed(2)}x`,
    `${row.reduction.toFixed(1)}%`
  ]);

  const table = formatTable([
    ['Preset', 'Output bytes', 'Ratio', 'Reduction'],
    ...rows
  ]);

  return [
    `Input: ${report.inputPath}`,
    `Source BPMN: ${formatInteger(report.sourceBytes)} bytes`,
    '',
    table
  ].join('\n');
}

async function main(args: string[]): Promise<void> {
  const inputPath = args[0];

  if (!inputPath || inputPath.startsWith('-')) {
    throw new Error(USAGE);
  }

  const xml = await readFile(inputPath, 'utf8');
  const report = await createMetricsReport(inputPath, xml);
  process.stdout.write(`${formatMetricsReport(report)}\n`);
}

function formatTable(rows: string[][]): string {
  const widths = rows[0].map((_, columnIndex) => Math.max(
    ...rows.map((row) => row[columnIndex].length)
  ));

  return rows
    .map((row) => row
      .map((cell, columnIndex) => columnIndex === 0
        ? cell.padEnd(widths[columnIndex])
        : cell.padStart(widths[columnIndex]))
      .join('  '))
    .join('\n');
}

function formatInteger(value: number): string {
  return value.toLocaleString('en-US');
}

if (process.argv[1]?.endsWith('metrics.ts')) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
