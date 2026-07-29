import * as pty from 'node-pty';
import { Injectable } from '@/decorators/Injectable';
import { PrismaService } from './PrismaService';
import { SecretCipher } from './SecretCipher';
import type { ExecSession } from './DockerExecService';

const SAFE_WORKER_ID = /^w-[a-z0-9]+$/;
const MAX_TERMINAL_DIMENSION = 500;
const LOGIN_USERNAME_DELAY_MS = 800;
const LOGIN_PASSWORD_DELAY_MS = 1600;

@Injectable()
export class WorkerConsoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: SecretCipher,
  ) {}

  public async open(
    workerId: string,
    cols: number,
    rows: number,
    onData: (chunk: string) => void,
    onExit: (result: { exitCode: number; signal?: number }) => void,
  ): Promise<ExecSession> {
    const vmName = this.assertWorkerId(workerId);
    const dimensions = this.assertDimensions(cols, rows);

    const worker = await this.prisma.worker.findUnique({
      where: { id: vmName },
      select: { consolePassword: true },
    });

    if (!worker?.consolePassword) {
      throw new Error(`Worker ${vmName} has no console password on record`);
    }

    const password = this.cipher.decrypt(worker.consolePassword);

    const proc = pty.spawn(
      'sudo',
      ['virsh', 'console', vmName, '--force'],
      {
        name: 'xterm-256color',
        cols: dimensions.cols,
        rows: dimensions.rows,
      },
    );

    const dataSubscription = proc.onData(onData);
    const exitSubscription = proc.onExit((result) => {
      dataSubscription.dispose();
      exitSubscription.dispose();
      onExit(result);
    });

    proc.write('\r');
    setTimeout(() => proc.write('ubuntu\r'), LOGIN_USERNAME_DELAY_MS);
    setTimeout(() => proc.write(`${password}\r`), LOGIN_PASSWORD_DELAY_MS);

    return {
      write: (input) => proc.write(input),
      resize: (nextCols, nextRows) => {
        const safe = this.assertDimensions(nextCols, nextRows);
        proc.resize(safe.cols, safe.rows);
      },
      pause: () => proc.pause(),
      resume: () => proc.resume(),
      close: () => proc.kill(),
    };
  }

  private assertWorkerId(id: string): string {
    if (!SAFE_WORKER_ID.test(id)) {
      throw new Error(`Invalid worker id: ${id}`);
    }

    return id;
  }

  private assertDimensions(cols: number, rows: number): { cols: number; rows: number } {
    const safeCols = Math.trunc(cols);
    const safeRows = Math.trunc(rows);

    if (
      !(safeCols > 0 && safeCols <= MAX_TERMINAL_DIMENSION) ||
      !(safeRows > 0 && safeRows <= MAX_TERMINAL_DIMENSION)
    ) {
      throw new Error(`Invalid terminal dimensions: ${cols}x${rows}`);
    }

    return { cols: safeCols, rows: safeRows };
  }
}
