import { ChildProcess, spawn } from 'child_process';

const SIGKILL_GRACE_MS = 5000;

export class Command {
  constructor(
    private readonly cmd: string,
    private readonly args: string[] = [],
    private readonly print: boolean = false,
    private readonly timeoutMs: number | null = null,
  ) {}

  public run(): Promise<string> {
    if (this.print) {
      console.log(`Running command: ${this.cmd} ${this.args.join(' ')}`);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(this.cmd, this.args);

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer =
        this.timeoutMs == null
          ? null
          : setTimeout(() => {
              timedOut = true;
              this.terminate(proc);
            }, this.timeoutMs);

      const settle = (finish: () => void) => {
        if (timer) clearTimeout(timer);
        finish();
      };

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => settle(() => reject(error)));

      proc.on('close', (code) => {
        settle(() => {
          if (timedOut) {
            reject(new Error(`${this.describe()} timed out after ${this.timeoutMs}ms`));
            return;
          }

          if (code === 0) {
            resolve(stdout.trim());
            return;
          }

          reject(new Error(`${this.describe()} failed with code ${code}\n${stderr}`));
        });
      });
    });
  }

  private describe(): string {
    return `Command "${this.cmd} ${this.args.join(' ')}"`;
  }

  private terminate(proc: ChildProcess): void {
    proc.kill('SIGTERM');

    const sigkill = setTimeout(() => proc.kill('SIGKILL'), SIGKILL_GRACE_MS);
    proc.on('close', () => clearTimeout(sigkill));
  }

  public static runCommand(
    cmd: string,
    args: string[] = [],
    print: boolean = false,
    timeoutMs: number | null = null,
  ): Promise<string> {
    return new Command(cmd, args, print, timeoutMs).run();
  }
}
