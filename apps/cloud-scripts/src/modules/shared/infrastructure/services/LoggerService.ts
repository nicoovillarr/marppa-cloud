import { OnModuleInit } from '@/app/container';
import { Injectable } from '@/decorators/Injectable';
import fs from 'fs';
import path from 'path';

@Injectable()
export class LoggerService implements OnModuleInit {
  private currentSize: number = 0;
  private maxLogSize: number = 10 * 1024 * 1024;
  private logBackupCount: number = 5;
  private logDir: string | null = null;

  constructor() {
    const { MAX_LOG_SIZE, LOG_BACKUP_COUNT, LOG_DIR } = process.env;

    if (MAX_LOG_SIZE) {
      this.maxLogSize = parseInt(MAX_LOG_SIZE, 10);
    }

    if (LOG_BACKUP_COUNT) {
      this.logBackupCount = parseInt(LOG_BACKUP_COUNT, 10);
    }

    if (LOG_DIR) {
      this.logDir = path.resolve(LOG_DIR);
    }
  }

  private get logFile(): string {
    return path.join(this.logDir, 'app.log');
  }

  public onModuleInit(): Promise<void> | void {
    if (this.logDir) {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      this.rotateOnStartup();
    }
  }

  public log(message: string, ...args: unknown[]): void {
    const msg = this.formatArgs([message, ...args]);
    process.stdout.write(`${this.timestamp()} [LOG] ${msg}\n`);
    this.writeToFile('LOG', msg);
  }

  public info(message: string, ...args: unknown[]): void {
    const msg = this.formatArgs([message, ...args]);
    process.stdout.write(`${this.timestamp()} [INFO] ${msg}\n`);
    this.writeToFile('INFO', msg);
  }

  public warn(message: string, ...args: unknown[]): void {
    const msg = this.formatArgs([message, ...args]);
    process.stderr.write(`${this.timestamp()} [WARN] ${msg}\n`);
    this.writeToFile('WARN', msg);
  }

  public error(message: string, ...args: unknown[]): void {
    const msg = this.formatArgs([message, ...args]);
    process.stderr.write(`${this.timestamp()} [ERROR] ${msg}\n`);
    this.writeToFile('ERROR', msg);
  }

  private timestamp(): string {
    const now = new Date();
    return `[${now.toISOString().replace('T', ' ').replace('Z', '')}]`;
  }

  private getLogFiles(): number[] {
    if (!fs.existsSync(this.logDir)) return [];

    return fs
      .readdirSync(this.logDir)
      .map((f) => {
        const match = f.match(/^app\.log\.(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
  }

  private rotateQueue(): void {
    const files = this.getLogFiles().reverse();

    if (files.length > 0 && files[0] >= this.logBackupCount) {
      fs.unlinkSync(path.join(this.logDir, `app.log.${files[0]}`));
      files.shift();
    }

    for (const n of files) {
      fs.renameSync(
        path.join(this.logDir, `app.log.${n}`),
        path.join(this.logDir, `app.log.${n + 1}`),
      );
    }

    if (fs.existsSync(this.logFile)) {
      fs.renameSync(this.logFile, path.join(this.logDir, 'app.log.1'));
    }

    this.currentSize = 0;
  }

  private rotateOnStartup(): void {
    if (fs.existsSync(this.logFile)) {
      const stats = fs.statSync(this.logFile);
      if (stats.size > 0) this.rotateQueue();
      else this.currentSize = stats.size;
    }
  }

  private writeToFile(level: string, message: string): void {
    const line = `${this.timestamp()} [${level}] ${message}\n`;
    const lineSize = Buffer.byteLength(line, 'utf8');

    if (this.currentSize + lineSize > this.maxLogSize) this.rotateQueue();

    fs.appendFileSync(this.logFile, line, 'utf8');
    this.currentSize += lineSize;
  }

  private formatArgs(args: unknown[]): string {
    return args
      .map((a) =>
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a),
      )
      .join(' ');
  }
}
