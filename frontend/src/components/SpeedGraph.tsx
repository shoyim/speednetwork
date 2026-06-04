'use client'

import { useEffect, useRef, useMemo } from 'react'

interface SpeedSample {
  time: number
  speedMbps: number
}

interface SpeedGraphProps {
  downloadSamples: SpeedSample[]
  uploadSamples: SpeedSample[]
  height?: number
  showBoth?: boolean
}

const PADDING = { top: 16, right: 16, bottom: 28, left: 44 }
const DURATION_MS = 10_000

function easeData(samples: SpeedSample[]): SpeedSample[] {
  if (samples.length < 3) return samples
  // Simple 3-point moving average
  return samples.map((s, i) => {
    if (i === 0 || i === samples.length - 1) return s
    const prev = samples[i - 1]!
    const next = samples[i + 1]!
    return { time: s.time, speedMbps: (prev.speedMbps + s.speedMbps + next.speedMbps) / 3 }
  })
}

export default function SpeedGraph({
  downloadSamples,
  uploadSamples,
  height = 160,
  showBoth = false,
}: SpeedGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const smoothDownload = useMemo(() => easeData(downloadSamples), [downloadSamples])
  const smoothUpload = useMemo(() => easeData(uploadSamples), [uploadSamples])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = height

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const plotW = w - PADDING.left - PADDING.right
    const plotH = h - PADDING.top - PADDING.bottom

    const allSamples = [...smoothDownload, ...smoothUpload]
    const maxSpeed = allSamples.length > 0
      ? Math.max(...allSamples.map((s) => s.speedMbps), 10)
      : 100
    const yMax = Math.ceil(maxSpeed * 1.2 / 50) * 50 // Round up to nearest 50

    ctx.clearRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    const gridLines = 4
    for (let i = 0; i <= gridLines; i++) {
      const y = PADDING.top + plotH - (i / gridLines) * plotH
      ctx.beginPath()
      ctx.moveTo(PADDING.left, y)
      ctx.lineTo(PADDING.left + plotW, y)
      ctx.stroke()

      // Y-axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${Math.round((i / gridLines) * yMax)}`, PADDING.left - 6, y + 3)
    }

    // X-axis time labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 5; i++) {
      const x = PADDING.left + (i / 5) * plotW
      const tSec = (i / 5) * (DURATION_MS / 1000)
      ctx.fillText(`${tSec.toFixed(0)}s`, x, h - 6)
    }

    function drawLine(
      samples: SpeedSample[],
      color: string,
      glowColor: string
    ) {
      if (samples.length < 2) return

      const points = samples.map((s) => ({
        x: PADDING.left + (Math.min(s.time, DURATION_MS) / DURATION_MS) * plotW,
        y: PADDING.top + plotH - (Math.min(s.speedMbps, yMax) / yMax) * plotH,
      }))

      // Filled area gradient
      const grad = ctx!.createLinearGradient(0, PADDING.top, 0, PADDING.top + plotH)
      grad.addColorStop(0, glowColor.replace(')', ', 0.25)').replace('rgb', 'rgba'))
      grad.addColorStop(1, 'rgba(0,0,0,0)')

      ctx!.beginPath()
      ctx!.moveTo(points[0]!.x, PADDING.top + plotH)
      ctx!.lineTo(points[0]!.x, points[0]!.y)
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]!
        const curr = points[i]!
        const cpx = (prev.x + curr.x) / 2
        ctx!.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y)
      }
      ctx!.lineTo(points[points.length - 1]!.x, PADDING.top + plotH)
      ctx!.closePath()
      ctx!.fillStyle = grad
      ctx!.fill()

      // Line stroke with glow
      ctx!.shadowColor = color
      ctx!.shadowBlur = 6
      ctx!.beginPath()
      ctx!.moveTo(points[0]!.x, points[0]!.y)
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]!
        const curr = points[i]!
        const cpx = (prev.x + curr.x) / 2
        ctx!.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y)
      }
      ctx!.strokeStyle = color
      ctx!.lineWidth = 2
      ctx!.stroke()
      ctx!.shadowBlur = 0
    }

    if (showBoth) {
      drawLine(smoothDownload, '#1ab8ff', 'rgb(26,184,255)')
      drawLine(smoothUpload, '#8b5cf6', 'rgb(139,92,246)')
    } else if (smoothDownload.length > 0) {
      drawLine(smoothDownload, '#1ab8ff', 'rgb(26,184,255)')
    } else {
      drawLine(smoothUpload, '#8b5cf6', 'rgb(139,92,246)')
    }
  }, [smoothDownload, smoothUpload, height, showBoth])

  return (
    <div ref={containerRef} className="w-full" style={{ height }}>
      <canvas ref={canvasRef} className="w-full" />
    </div>
  )
}
