import * as pty from 'node-pty';
import { Injectable } from '@/decorators/Injectable';

const SAFE_ATOM_ID = /^a-[a-z0-9]+$/;
const MAX_TERMINAL_DIMENSION = 500;

export type ExecSession = {
  write(input: string): void;
  resize(cols: number, rows: number): void;
  pause(): void;
  resume(): void;
  close(): void;
};

@Injectable()
export class DockerExecService {
  public open(
    atomId: string,
    cols: number,
    rows: number,
    onData: (chunk: string) => void,
    onExit: (result: { exitCode: number; signal?: number }) => void,
  ): ExecSession {
    const containerId = this.assertAtomId(atomId);
    const dimensions = this.assertDimensions(cols, rows);

    const proc = pty.spawn(
      'sudo',
      [
        'docker', 'exec', '-it', containerId,
        '/bin/sh', '-c', 'command -v bash >/dev/null 2>&1 && exec bash || exec sh',
      ],
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

  private assertAtomId(id: string): string {
    if (!SAFE_ATOM_ID.test(id)) {
      throw new Error(`Invalid atom id: ${id}`);
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
