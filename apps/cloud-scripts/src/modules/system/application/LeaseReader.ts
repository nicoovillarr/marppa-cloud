import fs from 'fs';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '../../shared/infrastructure/services/LoggerService';
import { OnModuleDestroy, OnModuleInit } from '@/app/container';

const LEASES_FILE = '/var/lib/misc/dnsmasq.leases';

@Injectable()
export class LeaseReader implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly intervalMs: number = 15_000,
    private readonly logger: LoggerService,
  ) {}

  public onModuleInit(): void {
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

  public onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
