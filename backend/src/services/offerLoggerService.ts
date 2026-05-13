import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd().endsWith('backend')
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

const logsDir = path.join(rootDir, 'logs');

function currentLogPath() {
  return path.join(logsDir, `collect-offers-${new Date().toISOString().slice(0, 10)}.log`);
}

export async function logOfferCollector(message: string, meta?: unknown) {
  await mkdir(logsDir, { recursive: true });
  const line = JSON.stringify({
    at: new Date().toISOString(),
    message,
    meta
  });

  await appendFile(currentLogPath(), `${line}\n`, 'utf8');
}
