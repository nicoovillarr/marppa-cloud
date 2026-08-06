import WebSocket, { WebSocketServer as WsServer } from 'ws';
import type { IncomingMessage } from 'http';
import { JWT_AUDIENCE, JWT_ISSUER } from '@marppa-cloud/api-types';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '../services/LoggerService';
import { PrismaService } from '../services/PrismaService';
import { DockerExecService, type ExecSession } from '../services/DockerExecService';
import { WorkerConsoleService } from '../services/WorkerConsoleService';
import { OnModuleDestroy, OnModuleInit } from '@/libs/Container';

type ChannelMap = Record<string, Set<string>>;
type ClientMap = Record<string, Map<string, WebSocket>>;
type ExecResourceType = 'atom' | 'worker';

type RateWindow = { count: number; windowStart: number };

type AuthedSocket = WebSocket & {
  userId?: string;
  companyId?: string;
  authTimer?: NodeJS.Timeout;
  isAlive?: boolean;
  messageRate?: RateWindow;
  execOpenRate?: RateWindow;
};

type ExecSessionEntry = {
  socket: AuthedSocket;
  session: ExecSession;
  resourceType: ExecResourceType;
  resourceId: string;
  paused: boolean;
  lastActivity: number;
};

const AUTH_GRACE_MS = 10_000;
const SAFE_EXEC_SESSION_ID = /^[0-9a-f-]{36}$/i;
const MAX_EXEC_SESSIONS_PER_SOCKET = 4;
const MAX_EXEC_SESSIONS_PER_COMPANY = 12;
const MAX_WS_PAYLOAD_BYTES = 64 * 1024;
const EXEC_BACKPRESSURE_HIGH_WATERMARK = 1024 * 1024;
const EXEC_BACKPRESSURE_LOW_WATERMARK = 256 * 1024;
const EXEC_BACKPRESSURE_CHECK_MS = 100;
const EXEC_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const EXEC_SWEEP_INTERVAL_MS = 30 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const MAX_MESSAGES_PER_WINDOW = 50;
const MESSAGE_RATE_WINDOW_MS = 5_000;
const MAX_EXEC_OPENS_PER_WINDOW = 10;
const EXEC_OPEN_RATE_WINDOW_MS = 60_000;

function nextRateWindow(state: RateWindow | undefined, now: number, windowMs: number): RateWindow {
  if (!state || now - state.windowStart >= windowMs) {
    return { count: 1, windowStart: now };
  }

  return { count: state.count + 1, windowStart: state.windowStart };
}

@Injectable()
export class WebSocketServer implements OnModuleInit, OnModuleDestroy {
  private readonly channels: ChannelMap = {};
  private readonly clients: ClientMap = {};
  private readonly execSessions: Map<string, ExecSessionEntry> = new Map();
  private readonly pendingExecOpens: Map<string, AuthedSocket> = new Map();
  private wss: WsServer | null = null;
  private execSweepTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly execService: DockerExecService,
    private readonly workerConsoleService: WorkerConsoleService,
  ) {}

  public onModuleInit(): void {
    const { WS_PORT, WS_HOST, WS_ALLOWED_ORIGINS } = process.env;

    if (!WS_ALLOWED_ORIGINS?.trim()) {
      throw new Error(
        'WS_ALLOWED_ORIGINS is required: without it origin checks would fail open ' +
        'and accept a WebSocket handshake from any site.',
      );
    }

    this.wss = new WsServer({
      port: Number(WS_PORT),
      host: WS_HOST || '127.0.0.1',
      verifyClient: (info) => this.isOriginAllowed(info.origin),
      maxPayload: MAX_WS_PAYLOAD_BYTES,
    });

    this.wss.on('connection', (socket: AuthedSocket) => {
      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      socket.authTimer = setTimeout(() => {
        if (!socket.userId) socket.close(4002, 'Authentication timeout');
      }, AUTH_GRACE_MS);

      socket.on('message', (message: Buffer) =>
        this.onMessage(socket, message),
      );
      socket.on('close', () => this.onClose(socket));

      this.logger.log('[WebSocketServer] Client connected');
    });

    this.execSweepTimer = setInterval(
      () => void this.sweepExecSessions(),
      EXEC_SWEEP_INTERVAL_MS,
    );

    this.heartbeatTimer = setInterval(
      () => this.pingClients(),
      HEARTBEAT_INTERVAL_MS,
    );

    this.logger.info(`[WebSocketServer] Listening on port ${WS_PORT}`);
  }

  private pingClients(): void {
    if (!this.wss) return;

    for (const socket of this.wss.clients as Set<AuthedSocket>) {
      if (socket.isAlive === false) {
        this.logger.warn('[WebSocketServer] Terminating unresponsive client');
        socket.terminate();
        continue;
      }

      socket.isAlive = false;
      socket.ping();
    }
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

      if (!socket.userId) return;

      socket.messageRate = nextRateWindow(socket.messageRate, Date.now(), MESSAGE_RATE_WINDOW_MS);
      if (socket.messageRate.count > MAX_MESSAGES_PER_WINDOW) {
        return;
      }

      if (type === 'EXEC_OPEN') {
        await this.handleExecOpen(socket, data);
        return;
      }

      if (type === 'EXEC_INPUT') {
        this.handleExecInput(socket, data);
        return;
      }

      if (type === 'EXEC_RESIZE') {
        this.handleExecResize(socket, data);
        return;
      }

      if (type === 'EXEC_CLOSE') {
        this.handleExecClose(socket, data);
        return;
      }

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
      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(accessToken, secret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
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

    socket.send(
      JSON.stringify({
        type: 'AUTH_SUCCESS',
        data: { clientId: uuid, companyId },
      }),
    );
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

  private async handleExecOpen(
    socket: AuthedSocket,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const sessionId = data?.sessionId as string | undefined;
    const resourceType = data?.resourceType as string | undefined;
    const resourceId = data?.resourceId as string | undefined;
    const cols = Number(data?.cols);
    const rows = Number(data?.rows);

    if (
      !sessionId ||
      !resourceId ||
      !SAFE_EXEC_SESSION_ID.test(sessionId) ||
      (resourceType !== 'atom' && resourceType !== 'worker')
    ) {
      return;
    }
    if (this.execSessions.has(sessionId) || this.pendingExecOpens.has(sessionId)) return;

    socket.execOpenRate = nextRateWindow(socket.execOpenRate, Date.now(), EXEC_OPEN_RATE_WINDOW_MS);
    if (socket.execOpenRate.count > MAX_EXEC_OPENS_PER_WINDOW) {
      socket.send(
        JSON.stringify({
          type: 'EXEC_ERROR',
          data: { sessionId, message: 'Too many console sessions opened, slow down' },
        }),
      );
      return;
    }

    const sessionsForSocket =
      [...this.execSessions.values()].filter((entry) => entry.socket === socket).length +
      [...this.pendingExecOpens.values()].filter((s) => s === socket).length;
    const sessionsForCompany =
      [...this.execSessions.values()].filter(
        (entry) => entry.socket.companyId === socket.companyId,
      ).length +
      [...this.pendingExecOpens.values()].filter((s) => s.companyId === socket.companyId).length;

    if (
      sessionsForSocket >= MAX_EXEC_SESSIONS_PER_SOCKET ||
      sessionsForCompany >= MAX_EXEC_SESSIONS_PER_COMPANY
    ) {
      socket.send(
        JSON.stringify({
          type: 'EXEC_ERROR',
          data: { sessionId, message: 'Too many open console sessions' },
        }),
      );
      return;
    }

    // Reserved synchronously, before the first await below — every check above
    // this line and this line itself run in the same tick, so a burst of
    // concurrent EXEC_OPEN messages can never all read the same stale count.
    this.pendingExecOpens.set(sessionId, socket);

    try {
      const channel =
        resourceType === 'worker'
          ? `hive:worker:${resourceId}`
          : `nucleus:atom:${resourceId}`;

      const authorized = await this.isChannelAuthorized(socket, channel);
      if (!authorized) {
        socket.send(
          JSON.stringify({
            type: 'EXEC_ERROR',
            data: { sessionId, message: 'Not authorized' },
          }),
        );
        this.logger.warn(
          `[WebSocketServer] ${socket.userId} denied exec on ${resourceType} ${resourceId}`,
        );
        return;
      }

      const onData = (chunk: string) => this.handleExecOutput(sessionId, chunk);
      const onExit = (exitResult: { exitCode: number; signal?: number }) =>
        this.closeExecSession(sessionId, exitResult.exitCode === 0 ? 'exited' : 'error');

      const session = await (resourceType === 'worker'
        ? this.workerConsoleService.open(resourceId, cols, rows, onData, onExit)
        : this.execService.open(resourceId, cols, rows, onData, onExit));

      this.execSessions.set(sessionId, {
        socket,
        session,
        resourceType,
        resourceId,
        paused: false,
        lastActivity: Date.now(),
      });
      socket.send(JSON.stringify({ type: 'EXEC_OPENED', data: { sessionId } }));
      this.logger.log(
        `[WebSocketServer] ${socket.userId} opened exec session ${sessionId} on ${resourceType} ${resourceId}`,
      );
    } catch (err) {
      socket.send(
        JSON.stringify({
          type: 'EXEC_ERROR',
          data: { sessionId, message: 'Failed to start console session' },
        }),
      );
      this.logger.error(
        `[WebSocketServer] Exec open failed for ${resourceType} ${resourceId}: ${String(err)}`,
      );
    } finally {
      this.pendingExecOpens.delete(sessionId);
    }
  }

  private handleExecOutput(sessionId: string, chunk: string): void {
    const entry = this.execSessions.get(sessionId);
    if (!entry || entry.socket.readyState !== WebSocket.OPEN) return;

    entry.lastActivity = Date.now();
    entry.socket.send(
      JSON.stringify({ type: 'EXEC_OUTPUT', data: { sessionId, chunk } }),
    );

    if (!entry.paused && entry.socket.bufferedAmount > EXEC_BACKPRESSURE_HIGH_WATERMARK) {
      entry.paused = true;
      entry.session.pause();
      this.relieveExecBackpressure(sessionId);
    }
  }

  private relieveExecBackpressure(sessionId: string): void {
    const interval = setInterval(() => {
      const entry = this.execSessions.get(sessionId);
      if (!entry || entry.socket.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }

      if (entry.socket.bufferedAmount <= EXEC_BACKPRESSURE_LOW_WATERMARK) {
        entry.paused = false;
        entry.session.resume();
        clearInterval(interval);
      }
    }, EXEC_BACKPRESSURE_CHECK_MS);
  }

  private handleExecInput(socket: AuthedSocket, data?: Record<string, unknown>): void {
    const sessionId = data?.sessionId as string | undefined;
    const input = data?.input as string | undefined;
    if (!sessionId || input == null) return;

    const entry = this.execSessions.get(sessionId);
    if (!entry || entry.socket !== socket) return;

    entry.lastActivity = Date.now();
    entry.session.write(input);
  }

  private handleExecResize(socket: AuthedSocket, data?: Record<string, unknown>): void {
    const sessionId = data?.sessionId as string | undefined;
    if (!sessionId) return;

    const entry = this.execSessions.get(sessionId);
    if (!entry || entry.socket !== socket) return;

    entry.lastActivity = Date.now();
    try {
      entry.session.resize(Number(data?.cols), Number(data?.rows));
    } catch {}
  }

  private handleExecClose(socket: AuthedSocket, data?: Record<string, unknown>): void {
    const sessionId = data?.sessionId as string | undefined;
    if (!sessionId) return;

    const entry = this.execSessions.get(sessionId);
    if (!entry || entry.socket !== socket) return;

    this.closeExecSession(sessionId, 'closed');
  }

  private closeExecSession(sessionId: string, reason: string): void {
    const entry = this.execSessions.get(sessionId);
    if (!entry) return;

    this.execSessions.delete(sessionId);
    entry.session.close();

    if (entry.socket.readyState === WebSocket.OPEN) {
      entry.socket.send(
        JSON.stringify({ type: 'EXEC_CLOSED', data: { sessionId, reason } }),
      );
    }
  }

  private async sweepExecSessions(): Promise<void> {
    for (const [sessionId, entry] of [...this.execSessions]) {
      if (Date.now() - entry.lastActivity > EXEC_IDLE_TIMEOUT_MS) {
        this.closeExecSession(sessionId, 'idle-timeout');
        continue;
      }

      const channel =
        entry.resourceType === 'worker'
          ? `hive:worker:${entry.resourceId}`
          : `nucleus:atom:${entry.resourceId}`;

      const authorized = await this.isChannelAuthorized(entry.socket, channel);
      if (!authorized) {
        this.logger.warn(
          `[WebSocketServer] Revoking exec session ${sessionId}: no longer authorized`,
        );
        this.closeExecSession(sessionId, 'unauthorized');
      }
    }
  }

  private onClose(socket: AuthedSocket): void {
    if (socket.authTimer) clearTimeout(socket.authTimer);

    for (const [sessionId, entry] of this.execSessions) {
      if (entry.socket === socket) this.closeExecSession(sessionId, 'socket-closed');
    }

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
    if (!origin) return false;

    const raw = process.env.WS_ALLOWED_ORIGINS?.trim() ?? '';
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

    if (parts[0] === 'nucleus' && parts[1] === 'atom' && parts[2]) {
      const atom = await this.prisma.atom.findUnique({
        where: { id: parts[2] },
        select: { ownerId: true },
      });
      return atom?.ownerId === companyId;
    }

    if (parts[0] === 'orbit' && parts[1] === 'portal' && parts[2]) {
      const portal = await this.prisma.portal.findUnique({
        where: { id: parts[2] },
        select: { ownerId: true },
      });
      return portal?.ownerId === companyId;
    }

    if (parts[0] === 'orbit' && parts[1] === 'transponder' && parts[2]) {
      const transponder = await this.prisma.transponder.findUnique({
        where: { id: parts[2] },
        select: { portal: { select: { ownerId: true } } },
      });
      return transponder?.portal.ownerId === companyId;
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
    if (this.execSweepTimer) {
      clearInterval(this.execSweepTimer);
      this.execSweepTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

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

  public sendWorkerDiskMessage(
    disk: { id: number; ownerId?: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`hive:disk:${disk.id}`, type, data);
    if (disk.ownerId) {
      this.sendMessage(`company:${disk.ownerId}:hive`, type, {
        diskId: disk.id,
        data,
      });
    }
  }

  public sendAtomMessage(
    atom: { id: string; ownerId?: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`nucleus:atom:${atom.id}`, type, data);
    if (atom.ownerId) {
      this.sendMessage(`company:${atom.ownerId}:nucleus`, type, {
        atomId: atom.id,
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

  public sendPortalMessage(
    portal: { id: string; ownerId: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`orbit:portal:${portal.id}`, type, data);
    this.sendMessage(`company:${portal.ownerId}:orbit`, type, {
      portalId: portal.id,
      data,
    });
  }

  public sendTransponderMessage(
    transponder: { id: string; portalId: string; ownerId: string },
    type: string,
    data: unknown,
  ): void {
    this.sendMessage(`orbit:transponder:${transponder.id}`, type, data);
    this.sendMessage(`company:${transponder.ownerId}:orbit`, type, {
      transponderId: transponder.id,
      portalId: transponder.portalId,
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
