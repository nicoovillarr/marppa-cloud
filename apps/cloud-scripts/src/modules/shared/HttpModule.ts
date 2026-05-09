import { Module } from '@/decorators/Module';
import { HTTP_PORT, AUTH_TOKEN } from '@/tokens';
import { HttpServer } from './infrastructure/http/httpServer';

@Module({
  providers: [
    { provide: HTTP_PORT, useValue: Number(process.env.HTTP_PORT ?? 3000) },
    { provide: AUTH_TOKEN, useValue: process.env.AUTH_TOKEN ?? '' },
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
