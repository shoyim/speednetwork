export interface UploadResult {
  speedMbps: number
  bytesSent: number
  durationMs: number
  samples: Array<{ time: number; speedMbps: number }>
}

const UPLOAD_ENDPOINT = '/api/upload'
const TEST_DURATION_MS = 10_000
const PARALLEL_CONNECTIONS = 3
const CHUNK_SIZE = 512 * 1024 // 512 KB per chunk
const UPDATE_INTERVAL_MS = 200

let _uploadBuffer: Uint8Array | null = null

function getUploadBuffer(): Uint8Array {
  if (!_uploadBuffer) {
    _uploadBuffer = new Uint8Array(CHUNK_SIZE)
    crypto.getRandomValues(_uploadBuffer)
  }
  return _uploadBuffer
}

export async function measureUpload(
  onProgress: (speedMbps: number, samples: Array<{ time: number; speedMbps: number }>) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  const startTime = performance.now()
  const sharedState = { totalBytes: 0 }
  const samples: Array<{ time: number; speedMbps: number }> = []

  const progressInterval = setInterval(() => {
    const elapsed = performance.now() - startTime
    const speedMbps = toMbps(sharedState.totalBytes, elapsed)
    samples.push({ time: elapsed, speedMbps })
    onProgress(speedMbps, [...samples])
  }, UPDATE_INTERVAL_MS)

  const stopController = new AbortController()
  const stopTimeout = setTimeout(() => stopController.abort(), TEST_DURATION_MS)
  const combinedSignal = anySignal([stopController.signal, ...(signal ? [signal] : [])])

  const connectionTasks = Array.from({ length: PARALLEL_CONNECTIONS }, () =>
    runUploadConnection(combinedSignal, sharedState)
  )

  await Promise.allSettled(connectionTasks)

  clearTimeout(stopTimeout)
  clearInterval(progressInterval)

  const totalDurationMs = performance.now() - startTime
  const finalSpeed = toMbps(sharedState.totalBytes, totalDurationMs)
  samples.push({ time: totalDurationMs, speedMbps: finalSpeed })
  onProgress(finalSpeed, [...samples])

  return {
    speedMbps: finalSpeed,
    bytesSent: sharedState.totalBytes,
    durationMs: totalDurationMs,
    samples,
  }
}

async function runUploadConnection(
  signal: AbortSignal,
  state: { totalBytes: number }
): Promise<void> {
  while (!signal.aborted) {
    try {
      const body = getUploadBuffer().slice()
      const byteLength = body.byteLength

      await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        body,
        signal,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-cache',
        },
      })

      state.totalBytes += byteLength
    } catch {
      // AbortError expected
      break
    }
  }
}

function toMbps(bytes: number, ms: number): number {
  if (ms === 0) return 0
  return (bytes * 8) / (ms / 1000) / 1_000_000
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return controller.signal
}
