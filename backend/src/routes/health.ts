import type { FastifyPluginAsync } from 'fastify'
import { cpus, freemem, totalmem } from 'os'

export const healthRoute: FastifyPluginAsync = async (server) => {
  server.get('/health', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (_req, reply) => {
    reply.header('Cache-Control', 'no-cache, no-store')
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: Math.floor(process.uptime()),
      memory: {
        free: freemem(),
        total: totalmem(),
        usedPercent: Math.round(((totalmem() - freemem()) / totalmem()) * 100),
      },
      cpu: cpus().length,
      region: process.env.REGION ?? 'local',
    }
  })
}
