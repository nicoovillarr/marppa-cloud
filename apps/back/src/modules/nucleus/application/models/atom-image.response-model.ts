import { Expose } from 'class-transformer';

export class AtomImageResponseModel {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() description: string | null;
  @Expose() registry: string;
  @Expose() repository: string;
  @Expose() tag: string;
  @Expose() digest: string | null;
  @Expose() architecture: string;
  @Expose() capabilities: string[];
  @Expose() requiredEnvVars: string[];
}
