import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SpeedNetwork — Internet Speed Test',
  description: 'Professional real-time internet speed test. Measure download, upload, ping and jitter instantly.',
  keywords: ['speed test', 'internet speed', 'ping test', 'network speed', 'bandwidth'],
  openGraph: {
    title: 'SpeedNetwork — Internet Speed Test',
    description: 'Professional real-time internet speed test.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#030712] antialiased">
        {children}
      </body>
    </html>
  )
}
