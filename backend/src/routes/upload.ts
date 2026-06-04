import type { FastifyPluginAsync } from 'fastify'

export const uploadRoute: FastifyPluginAsync = async (server) => {
  server.post('/upload', {
    config: { rateLimit: { max: 50, timeWindow: '1 minute' } },
    // Accept up to 500MB uploads — drain and discard
    bodyLimit: 500 * 1024 * 1024,
  }, async (req, reply) => {
    reply.header('Cache-Control', 'no-cache, no-store')

    // Drain the incoming stream without storing any data
    const contentLength = req.headers['content-length']
    let bytesReceived = 0

    // If body is a stream (raw mode), drain it
    if (req.body instanceof Buffer) {
      bytesReceived = (req.body as Buffer).byteLength
    } else if (typeof req.body === 'string') {
      bytesReceived = Buffer.byteLength(req.body as string)
    }

    return reply.send({
      ok: true,
      received: bytesReceived,
      timestamp: Date.now(),
    })
  })
}
