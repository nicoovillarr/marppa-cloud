import { Module } from '../../decorators/Module';
import { SystemResetProcessor } from './application/SystemResetProcessor';

@Module({
  processors: [SystemResetProcessor],
})
export class SystemModule {}
