import Fastify, { type FastifyInstance } from 'fastify';
import type { IQueue } from '../../../event/domain/IQueue';
import type { ILogger } from '../logger/ILogger';

const executeScript = require('../../../libs/execute-script');

export class HttpServer {
  private app: FastifyInstance | null = null;

  constructor(
    private readonly logger: ILogger,
    private readonly queue: IQueue,
    private readonly httpPort: number,
    private readonly authToken: string,
  ) {}

  async start(): Promise<void> {
    if (this.app) {
      return;
    }

    const app = Fastify({ logger: false });

    app.get('/health', async (_req, reply) => reply.send({ status: 'healthy' }));

    const requireAuth = (authorization: string | undefined): boolean => {
      if (!authorization?.startsWith('Bearer ')) return false;
      const token = authorization.slice('Bearer '.length);
      return token === this.authToken;
    };

    app.post<{
      Body: { token?: string; zone?: string; record?: string; ip?: string };
    }>('/update-dns', async (req, reply) => {
      if (!requireAuth(req.headers.authorization)) {
        return reply.status(401).send({ message: 'Unauthorized' });
      }

      const { token, zone, record, ip } = req.body;

      if (!token || !zone || !record) {
        return reply.status(400).send({ message: 'Missing required fields: token, zone, record' });
      }

      const result = await executeScript('update_dns.sh', [token, zone, record, ip]);
      if (!result) {
        return reply.status(500).send({ message: 'Failed to update DNS' });
      }

      return reply.send({ message: 'DNS update request received' });
    });

    await app.listen({ port: this.httpPort, host: '0.0.0.0' });

    this.app = app;
    this.logger.info(`[HTTP] Fastify server listening on port ${this.httpPort}`);
  }

  async close(): Promise<void> {
    if (!this.app) {
      return;
    }

    await this.app.close();
    this.app = null;
  }
}
