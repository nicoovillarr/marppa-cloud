import { Module } from '@/decorators/Module';
import { SystemResetProcessor } from './application/SystemResetProcessor';
import { DeleteProcessor } from '@/system/application/DeleteProcessor';
import { LeaseReader } from '@/system/application/LeaseReader';

@Module({
  providers: [DeleteProcessor, LeaseReader],
  processors: [SystemResetProcessor],
})
export class SystemModule {}
