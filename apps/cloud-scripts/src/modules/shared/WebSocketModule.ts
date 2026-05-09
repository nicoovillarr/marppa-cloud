import { Module } from '@/decorators/Module';
import { WebSocketServer } from './infrastructure/websocket/WebSocketServer';

@Module({
  providers: [
    { provide: WebSocketServer },
  ],
})
export class WebSocketModule {
  constructor(private readonly wsServer: WebSocketServer) {}

  start(): void {
    this.wsServer.init();
  }

  async stop(): Promise<void> {
    await this.wsServer.close();
  }
}
