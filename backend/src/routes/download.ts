import type { FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'crypto'
import { Readable } from 'stream'

// Pre-generate a pool of random chunks to minimize crypto overhead
const CHUNK_SIZE = 256 * 1024 // 256 KB
const CHUNK_POOL_SIZE = 8
const chunkPool: Buffer[] = Array.from({ length: CHUNK_POOL_SIZE }, () =>
  randomBytes(CHUNK_SIZE)
)
let poolIndex = 0

function getChunk(): Buffer {
  const chunk = chunkPool[poolIndex]!
  poolIndex = (poolIndex + 1) % CHUNK_POOL_SIZE
  return chunk
}

export const downloadRoute: FastifyPluginAsync = async (server) => {
  server.get('/download', {
    config: { rateLimit: { max: 50, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    reply.header('Transfer-Encoding', 'chunked')
    reply.header('X-Content-Type-Options', 'nosniff')
    // No Content-Length — chunked stream runs until client aborts

    const stream = new Readable({ read() {} })

    reply.send(stream)

    const push = () => {
      if (req.socket.destroyed) {
        stream.push(null)
        return
      }
      const chunk = getChunk()
      if (!stream.push(chunk)) {
        // Back-pressure: wait for drain before pushing more
        stream.once('drain', push)
      } else {
        setImmediate(push)
      }
    }

    req.socket.on('close', () => stream.push(null))
    req.socket.on('error', () => stream.push(null))
    push()
  })
}
