'use client'

import { motion } from 'framer-motion'

interface MetricsBarProps {
  ping: number
  jitter: number
  packetLoss: number
  active?: boolean
}

function MetricChip({
  label,
  value,
  unit,
  color,
  active,
}: {
  label: string
  value: number
  unit: string
  color: string
  active?: boolean
}) {
  const displayValue = value > 0
    ? unit === 'ms'
      ? value < 1 ? value.toFixed(2) : Math.round(value).toString()
      : value.toFixed(1)
    : '—'

  return (
    <div className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl glass transition-all duration-300 ${active ? 'border-opacity-30' : ''}`}>
      <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">{label}</span>
      <div className="flex items-baseline gap-1">
        <motion.span
          key={displayValue}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className={`text-2xl font-bold font-mono tabular-nums ${color}`}
        >
          {displayValue}
        </motion.span>
        {value > 0 && (
          <span className="text-xs text-white/30 font-mono">{unit}</span>
        )}
      </div>
    </div>
  )
}

export default function MetricsBar({
  ping,
  jitter,
  packetLoss,
  active,
}: MetricsBarProps) {
  const pingColor = ping === 0 ? 'text-white/50' : ping < 20 ? 'text-green-400' : ping < 50 ? 'text-yellow-400' : 'text-red-400'
  const jitterColor = jitter === 0 ? 'text-white/50' : jitter < 5 ? 'text-green-400' : jitter < 15 ? 'text-yellow-400' : 'text-red-400'
  const lossColor = packetLoss === 0 ? 'text-green-400' : packetLoss < 2 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex gap-3 justify-center flex-wrap">
      <MetricChip label="Ping" value={ping} unit="ms" color={pingColor} active={active} />
      <MetricChip label="Jitter" value={jitter} unit="ms" color={jitterColor} active={active} />
      <MetricChip label="Packet Loss" value={packetLoss} unit="%" color={lossColor} active={active} />
    </div>
  )
}
