'use client'

import { motion } from 'framer-motion'
import type { DownloadResult } from '@/lib/download'
import type { UploadResult } from '@/lib/upload'
import type { PingResult } from '@/lib/ping'
import SpeedGraph from './SpeedGraph'

interface ResultScreenProps {
  downloadResult: DownloadResult | null
  uploadResult: UploadResult | null
  pingResult: PingResult | null
  onRestart: () => void
}

function grade(downloadMbps: number): { label: string; color: string; desc: string } {
  if (downloadMbps >= 500) return { label: 'Exceptional', color: 'text-purple-400', desc: 'Ultra-fast fiber' }
  if (downloadMbps >= 200) return { label: 'Excellent', color: 'text-brand-400', desc: 'Great for any use case' }
  if (downloadMbps >= 100) return { label: 'Very Good', color: 'text-green-400', desc: 'Handles heavy workloads' }
  if (downloadMbps >= 50) return { label: 'Good', color: 'text-yellow-400', desc: 'Suitable for most tasks' }
  if (downloadMbps >= 25) return { label: 'Average', color: 'text-orange-400', desc: 'Basic usage OK' }
  return { label: 'Below Average', color: 'text-red-400', desc: 'May struggle with HD streams' }
}

function ResultMetric({
  label,
  value,
  unit,
  color,
  delay: d,
}: {
  label: string
  value: string
  unit: string
  color?: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: d, duration: 0.4, ease: 'easeOut' }}
      className="glass rounded-2xl p-5 flex flex-col gap-1"
    >
      <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={`text-4xl font-bold font-mono tabular-nums ${color ?? 'text-white'}`}>
          {value}
        </span>
        <span className="text-sm text-white/30 font-mono">{unit}</span>
      </div>
    </motion.div>
  )
}

export default function ResultScreen({
  downloadResult,
  uploadResult,
  pingResult,
  onRestart,
}: ResultScreenProps) {
  const dl = downloadResult?.speedMbps ?? 0
  const ul = uploadResult?.speedMbps ?? 0
  const ping = pingResult?.avg ?? 0
  const jitter = pingResult?.jitter ?? 0
  const loss = pingResult?.packetLoss ?? 0
  const g = grade(dl)

  function formatSpeed(mbps: number): string {
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)}`
    if (mbps >= 100) return Math.round(mbps).toString()
    if (mbps >= 10) return mbps.toFixed(1)
    return mbps.toFixed(2)
  }

  function speedUnit(mbps: number): string {
    return mbps >= 1000 ? 'Gbps' : 'Mbps'
  }

  const handleShare = () => {
    const text = `My internet speed:\n↓ ${formatSpeed(dl)} ${speedUnit(dl)} download\n↑ ${formatSpeed(ul)} ${speedUnit(ul)} upload\n◎ ${ping}ms ping\n\nTested with SpeedNetwork`
    if (navigator.share) {
      navigator.share({ title: 'My Speed Test Results', text })
    } else {
      navigator.clipboard.writeText(text)
        .then(() => alert('Results copied to clipboard!'))
        .catch(() => {})
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Grade badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 glass-glow rounded-full px-5 py-2.5">
          <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          <span className={`text-sm font-semibold ${g.color}`}>{g.label}</span>
          <span className="text-white/30 text-sm">—</span>
          <span className="text-white/50 text-sm">{g.desc}</span>
        </div>
      </motion.div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <ResultMetric
          label="Download"
          value={formatSpeed(dl)}
          unit={speedUnit(dl)}
          color="text-brand-400"
          delay={0.1}
        />
        <ResultMetric
          label="Upload"
          value={formatSpeed(ul)}
          unit={speedUnit(ul)}
          color="text-accent-400"
          delay={0.2}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <ResultMetric label="Ping" value={ping.toString()} unit="ms" delay={0.3} />
        <ResultMetric label="Jitter" value={jitter.toString()} unit="ms" delay={0.35} />
        <ResultMetric label="Packet Loss" value={loss.toString()} unit="%" delay={0.4} />
      </div>

      {/* Graph */}
      {(downloadResult || uploadResult) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">Speed History</span>
            <div className="flex items-center gap-4">
              {downloadResult && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-400" />
                  <span className="text-[10px] text-white/40 font-mono">Download</span>
                </div>
              )}
              {uploadResult && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-500" />
                  <span className="text-[10px] text-white/40 font-mono">Upload</span>
                </div>
              )}
            </div>
          </div>
          <SpeedGraph
            downloadSamples={downloadResult?.samples ?? []}
            uploadSamples={uploadResult?.samples ?? []}
            height={140}
            showBoth
          />
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="flex gap-3"
      >
        <button
          onClick={onRestart}
          className="flex-1 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25 active:scale-95"
        >
          Test Again
        </button>
        <button
          onClick={handleShare}
          className="px-6 py-3.5 rounded-xl glass hover:bg-white/5 text-white/70 hover:text-white font-semibold text-sm transition-all duration-200 active:scale-95"
        >
          Share
        </button>
      </motion.div>
    </div>
  )
}
