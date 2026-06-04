import type { FastifyPluginAsync } from 'fastify'
import type { SocketStream } from '@fastify/websocket'

type WSMessage =
  | { type: 'ping' }
  | { type: 'server_info_request' }

export const wsRoute: FastifyPluginAsync = async (server) => {
  server.get('/ws', { websocket: true }, (connection: SocketStream) => {
    const sessionId = Math.random().toString(36).slice(2)

    connection.socket.send(JSON.stringify({
      type: 'server_info',
      data: {
        sessionId,
        region: process.env.REGION ?? 'local',
        serverTime: Date.now(),
      },
    }))

    connection.socket.on('message', (raw: Buffer | string) => {
      try {
        const msg: WSMessage = JSON.parse(raw.toString())

        switch (msg.type) {
          case 'ping':
            connection.socket.send(JSON.stringify({
              type: 'pong',
              serverTime: Date.now(),
            }))
            break

          case 'server_info_request':
            connection.socket.send(JSON.stringify({
              type: 'server_info',
              data: {
                sessionId,
                region: process.env.REGION ?? 'local',
                serverTime: Date.now(),
                uptime: Math.floor(process.uptime()),
              },
            }))
            break
        }
      } catch {
        // Ignore malformed messages
      }
    })
  })
}
