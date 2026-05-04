import { spawn } from 'child_process';

export class Command {
  constructor(
    private readonly cmd: string,
    private readonly args: string[] = [],
    private readonly print: boolean = false
  ) {}

  public run(): Promise<string> {
    if (this.print) {
      console.log(`Running command: ${this.cmd} ${this.args.join(' ')}`);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(this.cmd, this.args);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', reject);

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(
            new Error(
              `Command "${this.cmd} ${this.args.join(
                ' ',
              )}" failed with code ${code}\n${stderr}`,
            ),
          );
        }
      });
    });
  }

  public static runCommand(
    cmd: string,
    args: string[] = [],
    print: boolean = false,
  ): Promise<string> {
    return new Command(cmd, args, print).run();
  }
}
