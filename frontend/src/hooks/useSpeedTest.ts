'use client'

import { useState, useCallback, useRef } from 'react'
import { measurePing, type PingResult } from '@/lib/ping'
import { measureDownload, type DownloadResult } from '@/lib/download'
import { measureUpload, type UploadResult } from '@/lib/upload'

export type TestPhase =
  | 'idle'
  | 'connecting'
  | 'ping'
  | 'download'
  | 'upload'
  | 'done'
  | 'error'

export interface SpeedSample {
  time: number
  speedMbps: number
}

export interface TestState {
  phase: TestPhase
  // Live metrics
  currentSpeedMbps: number
  pingMs: number
  jitterMs: number
  packetLoss: number
  // Phase progress 0–1
  phaseProgress: number
  // Graph data
  downloadSamples: SpeedSample[]
  uploadSamples: SpeedSample[]
  pingSamples: number[]
  // Final results
  downloadResult: DownloadResult | null
  uploadResult: UploadResult | null
  pingResult: PingResult | null
  // Error
  error: string | null
}

const INITIAL_STATE: TestState = {
  phase: 'idle',
  currentSpeedMbps: 0,
  pingMs: 0,
  jitterMs: 0,
  packetLoss: 0,
  phaseProgress: 0,
  downloadSamples: [],
  uploadSamples: [],
  pingSamples: [],
  downloadResult: null,
  uploadResult: null,
  pingResult: null,
  error: null,
}

export function useSpeedTest() {
  const [state, setState] = useState<TestState>(INITIAL_STATE)
  const abortRef = useRef<AbortController | null>(null)
  const isRunning = state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'error'

  const start = useCallback(async () => {
    if (isRunning) return

    const abort = new AbortController()
    abortRef.current = abort

    setState({ ...INITIAL_STATE, phase: 'connecting' })

    try {
      // Phase 1: Connecting / warmup
      await delay(400)

      // Phase 2: Ping
      setState((s) => ({ ...s, phase: 'ping', phaseProgress: 0 }))

      const pingResult = await measurePing((partial) => {
        setState((s) => ({
          ...s,
          pingMs: partial.avg ?? s.pingMs,
          jitterMs: partial.jitter ?? s.jitterMs,
          packetLoss: partial.packetLoss ?? s.packetLoss,
          pingSamples: partial.samples ?? s.pingSamples,
          phaseProgress: partial.progress,
        }))
      })

      if (abort.signal.aborted) return

      setState((s) => ({
        ...s,
        pingResult,
        pingMs: pingResult.avg,
        jitterMs: pingResult.jitter,
        packetLoss: pingResult.packetLoss,
      }))

      // Phase 3: Download
      setState((s) => ({
        ...s,
        phase: 'download',
        currentSpeedMbps: 0,
        phaseProgress: 0,
      }))

      const downloadResult = await measureDownload(
        (speedMbps, samples) => {
          setState((s) => ({
            ...s,
            currentSpeedMbps: speedMbps,
            downloadSamples: samples,
            phaseProgress: Math.min(samples[samples.length - 1]!.time / 10_000, 1),
          }))
        },
        abort.signal
      )

      if (abort.signal.aborted) return

      setState((s) => ({
        ...s,
        downloadResult,
        currentSpeedMbps: 0,
      }))

      // Phase 4: Upload
      setState((s) => ({
        ...s,
        phase: 'upload',
        currentSpeedMbps: 0,
        phaseProgress: 0,
      }))

      const uploadResult = await measureUpload(
        (speedMbps, samples) => {
          setState((s) => ({
            ...s,
            currentSpeedMbps: speedMbps,
            uploadSamples: samples,
            phaseProgress: Math.min(samples[samples.length - 1]!.time / 10_000, 1),
          }))
        },
        abort.signal
      )

      if (abort.signal.aborted) return

      setState((s) => ({
        ...s,
        uploadResult,
        currentSpeedMbps: 0,
        phase: 'done',
        phaseProgress: 1,
      }))
    } catch (err) {
      if (abort.signal.aborted) return
      setState((s) => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Test failed. Please try again.',
      }))
    }
  }, [isRunning])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setState((s) => ({ ...s, phase: 'idle' }))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL_STATE)
  }, [])

  return { state, start, stop, reset, isRunning }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
