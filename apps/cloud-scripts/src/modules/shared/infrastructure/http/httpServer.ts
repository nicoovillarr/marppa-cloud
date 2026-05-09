import Fastify, { type FastifyInstance } from 'fastify';
import { Command } from '@/libs/Command';
import path from 'path';
import { Injectable } from '@/decorators/Injectable';
import { LoggerService } from '../services/LoggerService';
import { OnModuleDestroy, OnModuleInit } from '@/app/container';

@Injectable()
export class HttpServer implements OnModuleInit, OnModuleDestroy {
  private app: FastifyInstance | null = null;

  constructor(private readonly logger: LoggerService) {}

  public async onModuleInit(): Promise<void> {
    if (this.app) {
      return;
    }

    const { HTTP_PORT, AUTH_TOKEN } = process.env;

    const app = Fastify({ logger: false });

    app.get('/health', async (_req, reply) =>
      reply.send({ status: 'healthy' }),
    );

    const requireAuth = (authorization: string | undefined): boolean => {
      if (!authorization?.startsWith('Bearer ')) return false;
      const token = authorization.slice('Bearer '.length);
      return token === AUTH_TOKEN;
    };

    app.post<{
      Body: { token?: string; zone?: string; record?: string; ip?: string };
    }>('/update-dns', async (req, reply) => {
      if (!requireAuth(req.headers.authorization)) {
        return reply.status(401).send({ message: 'Unauthorized' });
      }

      const { token, zone, record, ip } = req.body;

      if (!token || !zone || !record) {
        return reply
          .status(400)
          .send({ message: 'Missing required fields: token, zone, record' });
      }

      const ZONE_RE = /^[a-zA-Z0-9.\-]{1,253}$/;
      const RECORD_RE = /^[a-zA-Z0-9._\-]{1,63}$/;
      const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ZONE_RE.test(zone) || !RECORD_RE.test(record)) {
        return reply
          .status(400)
          .send({ message: 'Invalid zone or record format' });
      }
      if (ip !== undefined && !IP_RE.test(ip)) {
        return reply.status(400).send({ message: 'Invalid IP format' });
      }

      const scriptPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'scripts',
        'update_dns.sh',
      );
      const scriptArgs = [token, zone, record, ip].filter(
        (a): a is string => a !== undefined,
      );
      const result = await Command.runCommand('bash', [
        scriptPath,
        ...scriptArgs,
      ]).catch(() => null);
      if (!result) {
        return reply.status(500).send({ message: 'Failed to update DNS' });
      }

      return reply.send({ message: 'DNS update request received' });
    });

    await app.listen({ port: Number(HTTP_PORT), host: '0.0.0.0' });

    this.app = app;
    this.logger.info(`[HTTP] Fastify server listening on port ${HTTP_PORT}`);
  }

  public async onModuleDestroy(): Promise<void> {
    if (!this.app) {
      return;
    }

    await this.app.close();
    this.app = null;
  }
}
