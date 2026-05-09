import { Module } from '@/decorators/Module';
import { SystemResetProcessor } from './application/SystemResetProcessor';
import { DeleteProcessor } from '@/shared/infrastructure/background/DeleteProcessor';
import { LeaseReader } from '@/shared/infrastructure/background/LeaseReader';

@Module({
  providers: [
    { provide: DeleteProcessor },
    { provide: LeaseReader },
  ],
  processors: [SystemResetProcessor],
})
export class SystemModule {
  constructor(
    private readonly deleteProcessor: DeleteProcessor,
    private readonly leaseReader: LeaseReader,
  ) {}

  start(): void {
    this.deleteProcessor.start();
    this.leaseReader.start();
  }

  stop(): void {
    this.deleteProcessor.stop();
    this.leaseReader.stop();
  }
}
