import Fastify from 'fastify';
import type { ILogger } from '../logger/ILogger';
import type { IQueue } from '../../../event/domain/IQueue';

const executeScript = require('../../../libs/execute-script');

export async function startHttpServer(
  logger: ILogger,
  queue: IQueue,
  port: number,
  authToken: string,
): Promise<void> {
  const app = Fastify({ logger: false });

  app.get('/health', async (_req, reply) => {
    return reply.send({ status: 'healthy' });
  });

  const requireAuth = (authorization: string | undefined): boolean => {
    if (!authorization?.startsWith('Bearer ')) return false;
    const token = authorization.slice('Bearer '.length);
    return token === authToken;
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

  await app.listen({ port, host: '0.0.0.0' });
  logger.info(`[HTTP] Fastify server listening on port ${port}`);
}
