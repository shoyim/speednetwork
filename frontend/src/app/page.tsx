'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// SSR=false: SpeedTest uses canvas, WebSocket, fetch streaming — all browser-only
const SpeedTest = dynamic(() => import('@/components/SpeedTest'), { ssr: false })

interface ServerInfo {
  region: string
  status: 'connecting' | 'connected' | 'error'
}

export default function HomePage() {
  const [serverInfo, setServerInfo] = useState<ServerInfo>({
    region: '...',
    status: 'connecting',
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = process.env.NEXT_PUBLIC_WS_URL
      ?? `${wsProtocol}//${window.location.hostname}:3001`

    let ws: WebSocket | null = null
    let retryTimeout: ReturnType<typeof setTimeout>

    function connect() {
      try {
        ws = new WebSocket(`${wsHost}/ws`)
        ws.onopen = () => setServerInfo((s) => ({ ...s, status: 'connected' }))
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string)
            if (msg.type === 'server_info') {
              setServerInfo({ region: msg.data?.region ?? 'local', status: 'connected' })
            }
          } catch { /* ignore */ }
        }
        ws.onerror = () => setServerInfo((s) => ({ ...s, status: 'error' }))
        ws.onclose = () => {
          setServerInfo((s) => s.status === 'connected' ? { ...s, status: 'connecting' } : s)
          retryTimeout = setTimeout(connect, 5000)
        }
      } catch {
        setServerInfo((s) => ({ ...s, status: 'error' }))
      }
    }

    connect()
    return () => { clearTimeout(retryTimeout); ws?.close() }
  }, [])

  const statusDot =
    serverInfo.status === 'connected' ? 'bg-green-400' :
    serverInfo.status === 'error' ? 'bg-red-400' :
    'bg-yellow-400 animate-pulse'

  return (
    <main className="relative min-h-screen bg-[#030712] overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute inset-0 bg-vignette" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent-500/5 blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 max-w-6xl mx-auto animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-white font-semibold tracking-tight">SpeedNetwork</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/30 font-mono">
          {mounted && <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />}
          <span className="capitalize">{mounted ? serverInfo.region : '...'}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
            Internet Speed Test
          </h1>
          <p className="text-white/30 text-sm font-mono">
            Real-time measurement · No data stored
          </p>
        </div>

        <div className="w-full max-w-2xl animate-slide-up [animation-delay:0.1s]">
          <SpeedTest />
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6 text-[11px] text-white/15 font-mono">
        Stateless · Ephemeral · No database
      </footer>
    </main>
  )
}
