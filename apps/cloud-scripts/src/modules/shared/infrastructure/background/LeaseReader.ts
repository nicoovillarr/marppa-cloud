import fs from 'fs';
import type { ILogger } from '../logger/ILogger';

const LEASES_FILE = '/var/lib/misc/dnsmasq.leases';

export class LeaseReader {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly logger: ILogger,
    private readonly intervalMs: number = 15_000,
  ) {}

  start(): void {
    const loop = () => {
      const started = Date.now();

      this.logger.log('[LeaseReader] Reading dnsmasq leases:');

      try {
        const data = fs.readFileSync(LEASES_FILE, 'utf-8');
        this.logger.log(data);
      } catch (err) {
        this.logger.error(`[LeaseReader] Error reading leases: ${String(err)}`);
      }

      const elapsed = Date.now() - started;
      const remaining = this.intervalMs - elapsed;
      this.timer = setTimeout(loop, remaining > 0 ? remaining : 0);
    };

    loop();
    this.logger.info('[LeaseReader] Started');
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
