'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useSpeedTest, type TestPhase } from '@/hooks/useSpeedTest'
import Speedometer from './Speedometer'
import SpeedGraph from './SpeedGraph'
import MetricsBar from './MetricsBar'
import ResultScreen from './ResultScreen'

const PHASE_LABELS: Record<TestPhase, string> = {
  idle: 'Ready',
  connecting: 'Connecting...',
  ping: 'Testing latency...',
  download: 'Testing download...',
  upload: 'Testing upload...',
  done: 'Complete',
  error: 'Error',
}

function PhaseIndicator({ phase }: { phase: TestPhase }) {
  const phases: TestPhase[] = ['ping', 'download', 'upload']
  const activeIdx = phases.indexOf(phase)

  return (
    <div className="flex items-center gap-2">
      {phases.map((p, i) => {
        const done = activeIdx > i
        const active = activeIdx === i
        return (
          <div key={p} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono transition-all duration-300
              ${done ? 'text-brand-400' : active ? 'text-white' : 'text-white/20'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300
                ${done ? 'bg-brand-400' : active ? 'bg-white animate-pulse' : 'bg-white/15'}`}
              />
              {p}
            </div>
            {i < phases.length - 1 && (
              <div className={`w-6 h-px transition-all duration-500 ${done ? 'bg-brand-400/50' : 'bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
        style={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function SpeedTest() {
  const { state, start, reset, isRunning } = useSpeedTest()

  const showSpeedometer =
    state.phase === 'download' ||
    state.phase === 'upload' ||
    (state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'error')

  const showGraph =
    state.downloadSamples.length > 2 || state.uploadSamples.length > 2

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">

      {/* Status header */}
      <AnimatePresence mode="wait">
        {state.phase !== 'idle' && state.phase !== 'done' && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-3 w-full"
          >
            <PhaseIndicator phase={state.phase} />
            <span className="text-sm text-white/40 font-mono">
              {PHASE_LABELS[state.phase]}
            </span>
            <div className="w-full max-w-sm">
              <ProgressBar progress={state.phaseProgress} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Screen */}
      <AnimatePresence>
        {state.phase === 'done' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full"
          >
            <ResultScreen
              downloadResult={state.downloadResult}
              uploadResult={state.uploadResult}
              pingResult={state.pingResult}
              onRestart={reset}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {state.phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 text-center w-full max-w-sm"
          >
            <div className="text-red-400 text-lg font-semibold mb-2">Test Failed</div>
            <p className="text-white/50 text-sm mb-5">{state.error}</p>
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active test view */}
      {state.phase !== 'done' && state.phase !== 'error' && (
        <>
          {/* Speedometer */}
          <AnimatePresence>
            {(isRunning || state.phase === 'idle') && (
              <motion.div
                key="speedometer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <Speedometer
                  speedMbps={state.currentSpeedMbps}
                  active={state.phase === 'download' || state.phase === 'upload'}
                  label={state.phase === 'upload' ? 'Mbps ↑' : 'Mbps ↓'}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Metrics bar */}
          <AnimatePresence>
            {(state.pingMs > 0 || state.phase === 'ping') && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <MetricsBar
                  ping={state.pingMs}
                  jitter={state.jitterMs}
                  packetLoss={state.packetLoss}
                  active={state.phase === 'ping'}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live graph */}
          <AnimatePresence>
            {showGraph && (
              <motion.div
                key="graph"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full glass rounded-2xl p-4 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">
                    Live Speed
                  </span>
                  <span className="text-[10px] text-white/20 font-mono">
                    {state.phase === 'upload' ? '↑ Upload' : '↓ Download'}
                  </span>
                </div>
                <SpeedGraph
                  downloadSamples={state.downloadSamples}
                  uploadSamples={state.uploadSamples}
                  height={140}
                  showBoth={state.uploadSamples.length > 0 && state.downloadSamples.length > 0}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start / Stop button */}
          <AnimatePresence mode="wait">
            {state.phase === 'idle' ? (
              <motion.button
                key="start"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={start}
                className="relative group"
                aria-label="Start speed test"
              >
                {/* Outer ring pulses */}
                <div className="absolute inset-0 rounded-full bg-brand-500/20 scale-125 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-brand-500/10 scale-150 animate-pulse [animation-delay:0.5s]" />

                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center
                  shadow-2xl shadow-brand-500/40 group-hover:shadow-brand-400/60
                  transition-all duration-300 group-hover:scale-105 active:scale-95 cursor-pointer">
                  <div className="flex flex-col items-center gap-0.5">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-white font-bold text-sm tracking-wider">GO</span>
                  </div>
                </div>
              </motion.button>
            ) : isRunning ? (
              <motion.div
                key="running-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-white/40 text-sm font-mono"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                Running test...
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
