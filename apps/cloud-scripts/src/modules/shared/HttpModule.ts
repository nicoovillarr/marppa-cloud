import { Module } from '@/decorators/Module';
import { HttpServer } from './infrastructure/http/HttpServer';

@Module({
  providers: [
    { provide: HttpServer },
  ],
})
export class HttpModule {
  constructor(private readonly httpServer: HttpServer) {}

  async start(): Promise<void> {
    await this.httpServer.start();
  }

  async stop(): Promise<void> {
    await this.httpServer.close();
  }
}
