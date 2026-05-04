import fs from 'fs';
import path from 'path';
import type { ILogger } from './ILogger';

const logDir = path.resolve('./logs');
const logFile = path.join(logDir, 'app.log');

const MAX_LOG_SIZE = process.env.MAX_LOG_SIZE
  ? parseInt(process.env.MAX_LOG_SIZE, 10)
  : 10 * 1024 * 1024;

const LOG_BACKUP_COUNT = process.env.LOG_BACKUP_COUNT
  ? parseInt(process.env.LOG_BACKUP_COUNT, 10)
  : 5;

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

let currentSize = 0;

function timestamp(): string {
  const now = new Date();
  return `[${now.toISOString().replace('T', ' ').replace('Z', '')}]`;
}

function getLogFiles(): number[] {
  if (!fs.existsSync(logDir)) return [];

  return fs
    .readdirSync(logDir)
    .map((f) => {
      const match = f.match(/^app\.log\.(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
}

function rotateQueue(): void {
  const files = getLogFiles().reverse();

  if (files.length > 0 && files[0] >= LOG_BACKUP_COUNT) {
    fs.unlinkSync(path.join(logDir, `app.log.${files[0]}`));
    files.shift();
  }

  for (const n of files) {
    fs.renameSync(
      path.join(logDir, `app.log.${n}`),
      path.join(logDir, `app.log.${n + 1}`),
    );
  }

  if (fs.existsSync(logFile)) {
    fs.renameSync(logFile, path.join(logDir, 'app.log.1'));
  }

  currentSize = 0;
}

function rotateOnStartup(): void {
  if (fs.existsSync(logFile)) {
    const stats = fs.statSync(logFile);
    if (stats.size > 0) rotateQueue();
    else currentSize = stats.size;
  }
}

function writeToFile(level: string, message: string): void {
  const line = `${timestamp()} [${level}] ${message}\n`;
  const lineSize = Buffer.byteLength(line, 'utf8');

  if (currentSize + lineSize > MAX_LOG_SIZE) rotateQueue();

  fs.appendFileSync(logFile, line, 'utf8');
  currentSize += lineSize;
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
    .join(' ');
}

export class ConsoleLogger implements ILogger {
  constructor() {
    rotateOnStartup();
  }

  public log(message: string, ...args: unknown[]): void {
    const msg = formatArgs([message, ...args]);
    process.stdout.write(`${timestamp()} [LOG] ${msg}\n`);
    writeToFile('LOG', msg);
  }

  public info(message: string, ...args: unknown[]): void {
    const msg = formatArgs([message, ...args]);
    process.stdout.write(`${timestamp()} [INFO] ${msg}\n`);
    writeToFile('INFO', msg);
  }

  public warn(message: string, ...args: unknown[]): void {
    const msg = formatArgs([message, ...args]);
    process.stderr.write(`${timestamp()} [WARN] ${msg}\n`);
    writeToFile('WARN', msg);
  }

  public error(message: string, ...args: unknown[]): void {
    const msg = formatArgs([message, ...args]);
    process.stderr.write(`${timestamp()} [ERROR] ${msg}\n`);
    writeToFile('ERROR', msg);
  }
}
