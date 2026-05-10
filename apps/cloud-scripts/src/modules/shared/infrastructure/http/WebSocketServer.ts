import WebSocket, { WebSocketServer as WsServer } from 'ws';
import { jwtVerify } from 'jose';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '../services/LoggerService';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';

type ChannelMap = Record<string, Set<string>>;
type ClientMap = Record<string, Map<string, WebSocket>>;

@Injectable()
export class WebSocketServer implements OnModuleInit, OnModuleDestroy {
  private readonly channels: ChannelMap = {};
  private readonly clients: ClientMap = {};
  private wss: WsServer | null = null;

  constructor(private readonly logger: LoggerService) {}

  public onModuleInit(): void {
    const { WS_PORT, JWT_SECRET } = process.env;

    this.wss = new WsServer({ port: Number(WS_PORT) });

    this.wss.on('connection', (socket: WebSocket & { userId?: string }) => {
      socket.on('message', async (message: Buffer) => {
        try {
          const parsed = JSON.parse(message.toString()) as {
            type: string;
            data: Record<string, unknown>;
            token?: string;
          };
          const { type, data } = parsed;

          if (type === 'AUTH') {
            const accessToken = data.accessToken as string | undefined;
            if (!accessToken) {
              socket.send(
                JSON.stringify({ type: 'AUTH_FAILURE', message: 'No token' }),
              );
              return;
            }

            try {
              if (!JWT_SECRET)
                throw new Error('JWT_SECRET env var is required');
              const secret = new TextEncoder().encode(JWT_SECRET);
              const { payload } = await jwtVerify(accessToken, secret);
              socket.userId = payload.userId as string;
            } catch {
              socket.send(
                JSON.stringify({
                  type: 'AUTH_FAILURE',
                  message: 'Invalid token',
                }),
              );
              return;
            }

            const { userId } = socket;
            if (!this.clients[userId]) this.clients[userId] = new Map();

            const uuid = crypto.randomUUID();
            this.clients[userId].set(uuid, socket);

            socket.send(JSON.stringify({ type: 'AUTH_SUCCESS', data: uuid }));
            this.logger.log(`[WebSocketServer] ${userId} authenticated`);
          } else if (type === 'PING') {
            socket.send(JSON.stringify({ type: 'PONG' }));
          } else {
            const { userId } = socket;
            if (!userId || !this.clients[userId]) return;

            const channel = data.channel as string;

            if (type === 'SUBSCRIBE_CHANNEL') {
              if (!this.channels[channel]) this.channels[channel] = new Set();
              this.channels[channel].add(userId);
              socket.send(
                JSON.stringify({
                  type: 'SUBSCRIBE_CHANNEL_SUCCEEDED',
                  channel,
                }),
              );
              this.logger.log(
                `[WebSocketServer] ${userId} subscribed to ${channel}`,
              );
            } else if (type === 'UNSUBSCRIBE_CHANNEL') {
              this.channels[channel]?.delete(userId);
              this.logger.log(
                `[WebSocketServer] ${userId} unsubscribed from ${channel}`,
              );
            }
          }
        } catch (err) {
          this.logger.error(
            `[WebSocketServer] Error handling message: ${String(err)}`,
          );
        }
      });

      socket.on('close', () => {
        for (const userId in this.clients) {
          const map = this.clients[userId];
          if (map) {
            map.forEach((value, key) => {
              if (value === socket) map.delete(key);
            });
            if (map.size === 0) delete this.clients[userId];
          }
        }
        this.logger.log('[WebSocketServer] Client disconnected');
      });

      this.logger.log('[WebSocketServer] Client connected');
    });

    this.logger.info(`[WebSocketServer] Listening on port ${WS_PORT}`);
  }

  public async onModuleDestroy(): Promise<void> {
    if (!this.wss) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.wss!.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });

    this.wss = null;
  }

  public sendWorkerMessage(
    worker: { id: string; ownerId?: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`hive:worker:${worker.id}`, type, data);
    if (worker.ownerId) {
      this.sendMessage(`company:${worker.ownerId}:hive`, type, {
        workerId: worker.id,
        data,
      });
    }
  }

  public sendNodeMessage(
    node: { id: string; ownerId?: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`mesh:zone:${node.id}`, type, data);
    if (node.ownerId) {
      this.sendMessage(`company:${node.ownerId}:mesh`, type, {
        nodeId: node.id,
        data,
      });
    }
  }

  private sendMessage(channel: string, type: string, data: unknown): void {
    if (!this.channels[channel]) return;

    const message = JSON.stringify({ type, channel, data });

    for (const userId of this.channels[channel]) {
      const clientMap = this.clients[userId];
      if (!clientMap) continue;
      for (const ws of clientMap.values()) {
        ws.send(message);
      }
    }

    this.logger.log(`[WebSocketServer] Broadcast to ${channel}: ${type}`);
  }
}
