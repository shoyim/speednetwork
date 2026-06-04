import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocketPlugin from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import { healthRoute } from './routes/health.js'
import { pingRoute } from './routes/ping.js'
import { downloadRoute } from './routes/download.js'
import { uploadRoute } from './routes/upload.js'
import { wsRoute } from './routes/ws.js'

const isDev = process.env.NODE_ENV !== 'production'
const server = Fastify({
  logger: isDev
    ? { level: 'info' }
    : true,
  // High performance settings
  connectionTimeout: 0,
  keepAliveTimeout: 72000,
})

await server.register(cors, {
  origin: process.env.ALLOWED_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'OPTIONS'],
})

await server.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: '1 minute',
  skipOnError: true,
})

await server.register(websocketPlugin, {
  options: { maxPayload: 1048576 },
})

// Register routes
await server.register(healthRoute)
await server.register(pingRoute)
await server.register(downloadRoute)
await server.register(uploadRoute)
await server.register(wsRoute)

server.addHook('onClose', async () => {
  console.log('Server shutting down...')
})

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

try {
  await server.listen({ port: PORT, host: HOST })
  console.log(`SpeedNetwork backend running on http://${HOST}:${PORT}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
