import type { FastifyPluginAsync } from 'fastify'

// Minimal 1-byte payload — absolute minimum response size for accurate RTT
const PONG_PAYLOAD = Buffer.alloc(1)

export const pingRoute: FastifyPluginAsync = async (server) => {
  server.get('/ping', {
    config: { rateLimit: { max: 500, timeWindow: '1 minute' } },
  }, async (_req, reply) => {
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    reply.header('X-Server-Time', Date.now().toString())
    return reply.send(PONG_PAYLOAD)
  })
}
