'use client'

import { useEffect, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface SpeedometerProps {
  speedMbps: number
  maxMbps?: number
  label?: string
  active?: boolean
}

// Arc from -210deg to 30deg (240 degree sweep)
const START_ANGLE = -210
const SWEEP = 240
const CX = 150
const CY = 150
const R = 110

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  }
}

function arcPath(startDeg: number, endDeg: number, r: number): string {
  const s = polarToXY(startDeg, r)
  const e = polarToXY(endDeg, r)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

// Generate tick marks
function getTicks() {
  const ticks: Array<{ angle: number; major: boolean; label: number }> = []
  const labels = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
  for (let i = 0; i <= 100; i++) {
    const angle = START_ANGLE + (i / 100) * SWEEP
    const major = i % 10 === 0
    const label = labels[Math.round(i / 10)] ?? 0
    ticks.push({ angle, major, label })
  }
  return ticks
}

const TICKS = getTicks()

export default function Speedometer({
  speedMbps,
  maxMbps = 1000,
  label = 'Mbps',
  active = false,
}: SpeedometerProps) {
  const clampedSpeed = Math.min(speedMbps, maxMbps)
  const fraction = clampedSpeed / maxMbps

  // Smooth needle spring
  const springFraction = useSpring(0, { stiffness: 80, damping: 20 })

  useEffect(() => {
    springFraction.set(fraction)
  }, [fraction, springFraction])

  const needleAngle = useTransform(
    springFraction,
    (v) => START_ANGLE + v * SWEEP
  )

  // Track glow opacity
  const glowOpacity = useTransform(springFraction, [0, 0.05, 1], [0, 0.6, 1])

  const filledEnd = START_ANGLE + fraction * SWEEP

  return (
    <div className="relative flex flex-col items-center select-none">
      <svg
        width="300"
        height="260"
        viewBox="0 0 300 300"
        className="overflow-visible"
        aria-label={`Speed: ${speedMbps.toFixed(1)} ${label}`}
      >
        <defs>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0298f5" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#1ab8ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowStrong">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc track */}
        <path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP, R)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Ticks */}
        {TICKS.map(({ angle, major, label: tickLabel }, i) => {
          const inner = polarToXY(angle, major ? R - 14 : R - 9)
          const outer = polarToXY(angle, R + 4)
          const textPos = polarToXY(angle, R - 26)
          return (
            <g key={i}>
              <line
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke={major ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
                strokeWidth={major ? 1.5 : 1}
              />
              {major && tickLabel > 0 && tickLabel < 1000 && (
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="rgba(255,255,255,0.3)"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {tickLabel}
                </text>
              )}
            </g>
          )
        })}

        {/* Filled arc */}
        {fraction > 0.001 && (
          <>
            <path
              d={arcPath(START_ANGLE, filledEnd, R)}
              fill="none"
              stroke="url(#arcGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          </>
        )}

        {/* Animated needle */}
        <motion.g
          style={{
            rotate: needleAngle,
            originX: `${CX}px`,
            originY: `${CY}px`,
          }}
          filter="url(#glowStrong)"
        >
          {/* Needle line */}
          <line
            x1={CX}
            y1={CY}
            x2={CX + R - 8}
            y2={CY}
            stroke="#1ab8ff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Needle tip */}
          <circle cx={CX + R - 6} cy={CY} r="2.5" fill="#1ab8ff" />
        </motion.g>

        {/* Center hub */}
        <circle cx={CX} cy={CY} r="8" fill="#0d1117" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="4" fill="#1ab8ff" opacity="0.8" />

        {/* Speed number */}
        <text
          x={CX}
          y={CY + 42}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="36"
          fontWeight="700"
          fill="#f0f6fc"
          fontFamily="JetBrains Mono, monospace"
        >
          {speedMbps < 10
            ? speedMbps.toFixed(2)
            : speedMbps < 100
            ? speedMbps.toFixed(1)
            : Math.round(speedMbps).toString()}
        </text>

        {/* Unit label */}
        <text
          x={CX}
          y={CY + 64}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fill="rgba(255,255,255,0.4)"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="2"
        >
          {label.toUpperCase()}
        </text>

        {/* Active pulse ring */}
        {active && (
          <circle
            cx={CX}
            cy={CY}
            r={R + 20}
            fill="none"
            stroke="rgba(26,184,255,0.08)"
            strokeWidth="1"
            className="ring-pulse"
          />
        )}
      </svg>
    </div>
  )
}
