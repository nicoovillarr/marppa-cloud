import WebSocket, { WebSocketServer as WsServer } from 'ws';
import type { IncomingMessage } from 'http';
import { jwtVerify } from 'jose';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '../services/LoggerService';
import { PrismaService } from '../services/PrismaService';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';

type ChannelMap = Record<string, Set<string>>;
type ClientMap = Record<string, Map<string, WebSocket>>;

type AuthedSocket = WebSocket & {
  userId?: string;
  companyId?: string;
  authTimer?: NodeJS.Timeout;
};

const AUTH_GRACE_MS = 10_000;

@Injectable()
export class WebSocketServer implements OnModuleInit, OnModuleDestroy {
  private readonly channels: ChannelMap = {};
  private readonly clients: ClientMap = {};
  private wss: WsServer | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  public onModuleInit(): void {
    const { WS_PORT, WS_HOST } = process.env;

    this.wss = new WsServer({
      port: Number(WS_PORT),
      host: WS_HOST || '127.0.0.1',
      verifyClient: (info) => this.isOriginAllowed(info.origin),
    });

    this.wss.on('connection', (socket: AuthedSocket) => {
      socket.authTimer = setTimeout(() => {
        if (!socket.userId) socket.close(4002, 'Authentication timeout');
      }, AUTH_GRACE_MS);

      socket.on('message', (message: Buffer) =>
        this.onMessage(socket, message),
      );
      socket.on('close', () => this.onClose(socket));

      this.logger.log('[WebSocketServer] Client connected');
    });

    this.logger.info(`[WebSocketServer] Listening on port ${WS_PORT}`);
  }

  private async onMessage(
    socket: AuthedSocket,
    message: Buffer,
  ): Promise<void> {
    try {
      const parsed = JSON.parse(message.toString()) as {
        type: string;
        data?: Record<string, unknown>;
      };
      const { type, data } = parsed;

      if (type === 'AUTH') {
        await this.handleAuth(socket, data);
        return;
      }

      if (type === 'PING') {
        socket.send(JSON.stringify({ type: 'PONG' }));
        return;
      }

      if (!socket.userId) return;

      const channel = data?.channel as string | undefined;
      if (!channel) return;

      if (type === 'SUBSCRIBE_CHANNEL') {
        await this.handleSubscribe(socket, channel);
      } else if (type === 'UNSUBSCRIBE_CHANNEL') {
        this.handleUnsubscribe(socket, channel);
      }
    } catch (err) {
      this.logger.error(
        `[WebSocketServer] Error handling message: ${String(err)}`,
      );
    }
  }

  private async handleAuth(
    socket: AuthedSocket,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (socket.userId) {
      socket.close(4001, 'Already authenticated');
      return;
    }

    const accessToken = data?.accessToken as string | undefined;
    if (!accessToken) {
      socket.send(JSON.stringify({ type: 'AUTH_FAILURE', message: 'No token' }));
      return;
    }

    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

    let userId: string;
    let companyId: string;
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(accessToken, secret, {
        algorithms: ['HS256'],
      });

      if (payload.type !== 'access') throw new Error('Not an access token');

      userId = payload.userId as string;
      companyId = payload.companyId as string;
      if (!userId || !companyId) throw new Error('Incomplete token payload');
    } catch {
      socket.send(
        JSON.stringify({ type: 'AUTH_FAILURE', message: 'Invalid token' }),
      );
      return;
    }

    socket.userId = userId;
    socket.companyId = companyId;
    if (socket.authTimer) {
      clearTimeout(socket.authTimer);
      socket.authTimer = undefined;
    }

    if (!this.clients[userId]) this.clients[userId] = new Map();
    const uuid = crypto.randomUUID();
    this.clients[userId].set(uuid, socket);

    socket.send(JSON.stringify({ type: 'AUTH_SUCCESS', data: uuid }));
    this.logger.log(`[WebSocketServer] ${userId} authenticated`);
  }

  private async handleSubscribe(
    socket: AuthedSocket,
    channel: string,
  ): Promise<void> {
    const authorized = await this.isChannelAuthorized(socket, channel);
    if (!authorized) {
      socket.send(
        JSON.stringify({ type: 'SUBSCRIBE_CHANNEL_FAILED', channel }),
      );
      this.logger.warn(
        `[WebSocketServer] ${socket.userId} denied subscription to ${channel}`,
      );
      return;
    }

    if (!this.channels[channel]) this.channels[channel] = new Set();
    this.channels[channel].add(socket.userId!);

    socket.send(
      JSON.stringify({ type: 'SUBSCRIBE_CHANNEL_SUCCEEDED', channel }),
    );
    this.logger.log(
      `[WebSocketServer] ${socket.userId} subscribed to ${channel}`,
    );
  }

  private handleUnsubscribe(socket: AuthedSocket, channel: string): void {
    this.channels[channel]?.delete(socket.userId!);
    this.logger.log(
      `[WebSocketServer] ${socket.userId} unsubscribed from ${channel}`,
    );
  }

  private onClose(socket: AuthedSocket): void {
    if (socket.authTimer) clearTimeout(socket.authTimer);

    const { userId } = socket;
    if (userId) {
      const map = this.clients[userId];
      if (map) {
        map.forEach((value, key) => {
          if (value === socket) map.delete(key);
        });

        if (map.size === 0) {
          delete this.clients[userId];
          for (const channel in this.channels) {
            this.channels[channel].delete(userId);
            if (this.channels[channel].size === 0) delete this.channels[channel];
          }
        }
      }
    }

    this.logger.log('[WebSocketServer] Client disconnected');
  }

  private isOriginAllowed(origin?: string): boolean {
    const raw = process.env.WS_ALLOWED_ORIGINS?.trim();
    if (!raw || !origin) return true;

    const allowed = raw.split(',').map((o) => o.trim()).filter(Boolean);
    return allowed.includes(origin);
  }

  private async isChannelAuthorized(
    socket: AuthedSocket,
    channel: string,
  ): Promise<boolean> {
    const companyId = socket.companyId;
    if (!companyId) return false;

    const parts = channel.split(':');

    if (parts[0] === 'company') {
      return parts[1] === companyId;
    }

    if (parts[0] === 'mesh' && parts[1] === 'zone' && parts[2]) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: parts[2] },
        select: { ownerId: true },
      });
      return zone?.ownerId === companyId;
    }

    if (parts[0] === 'mesh' && parts[1] === 'node' && parts[2]) {
      const node = await this.prisma.node.findUnique({
        where: { id: parts[2] },
        select: { zone: { select: { ownerId: true } } },
      });
      return node?.zone.ownerId === companyId;
    }

    if (parts[0] === 'hive' && parts[1] === 'worker' && parts[2]) {
      const worker = await this.prisma.worker.findUnique({
        where: { id: parts[2] },
        select: { ownerId: true },
      });
      return worker?.ownerId === companyId;
    }

    return false;
  }

  public async onModuleDestroy(): Promise<void> {
    if (!this.wss) {
      return;
    }

    for (const client of this.wss.clients) {
      client.terminate();
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

  public sendZoneMessage(
    zone: { id: string; ownerId: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`mesh:zone:${zone.id}`, type, data);
    this.sendMessage(`company:${zone.ownerId}:mesh`, type, {
      zoneId: zone.id,
      data,
    });
  }

  public sendNodeMessage(
    node: { id: string; ownerId: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`mesh:node:${node.id}`, type, data);
    this.sendMessage(`company:${node.ownerId}:mesh`, type, {
      nodeId: node.id,
      data,
    });
  }

  private sendMessage(channel: string, type: string, data: unknown): void {
    if (!this.channels[channel]) return;

    const message = JSON.stringify({ type, channel, data });

    for (const userId of this.channels[channel]) {
      const clientMap = this.clients[userId];
      if (!clientMap) continue;
      for (const ws of clientMap.values()) {
        if (ws.readyState === WebSocket.OPEN) ws.send(message);
      }
    }

    this.logger.log(`[WebSocketServer] Broadcast to ${channel}: ${type}`);
  }
}
