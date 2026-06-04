export interface DownloadResult {
  speedMbps: number
  bytesReceived: number
  durationMs: number
  samples: Array<{ time: number; speedMbps: number }>
}

const DOWNLOAD_ENDPOINT = '/api/download'
const TEST_DURATION_MS = 10_000
const PARALLEL_CONNECTIONS = 4
const UPDATE_INTERVAL_MS = 200

export async function measureDownload(
  onProgress: (speedMbps: number, samples: Array<{ time: number; speedMbps: number }>) => void,
  signal?: AbortSignal
): Promise<DownloadResult> {
  const startTime = performance.now()
  const sharedState = {
    totalBytes: 0,
    done: false,
  }
  const samples: Array<{ time: number; speedMbps: number }> = []
  let lastSpeedMbps = 0

  // Progress reporter
  const progressInterval = setInterval(() => {
    const elapsed = performance.now() - startTime
    const speedMbps = toMbps(sharedState.totalBytes, elapsed)
    lastSpeedMbps = speedMbps

    samples.push({ time: elapsed, speedMbps })
    onProgress(speedMbps, [...samples])
  }, UPDATE_INTERVAL_MS)

  // Stop after TEST_DURATION_MS
  const stopController = new AbortController()
  const stopTimeout = setTimeout(() => stopController.abort(), TEST_DURATION_MS)

  const combinedSignal = anySignal([stopController.signal, ...(signal ? [signal] : [])])

  const connectionTasks = Array.from({ length: PARALLEL_CONNECTIONS }, () =>
    runDownloadConnection(combinedSignal, sharedState)
  )

  await Promise.allSettled(connectionTasks)

  clearTimeout(stopTimeout)
  clearInterval(progressInterval)

  const totalDurationMs = performance.now() - startTime

  // Final sample
  const finalSpeed = toMbps(sharedState.totalBytes, totalDurationMs)
  samples.push({ time: totalDurationMs, speedMbps: finalSpeed })
  onProgress(finalSpeed, [...samples])

  return {
    speedMbps: finalSpeed,
    bytesReceived: sharedState.totalBytes,
    durationMs: totalDurationMs,
    samples,
  }
}

async function runDownloadConnection(
  signal: AbortSignal,
  state: { totalBytes: number }
): Promise<void> {
  try {
    const response = await fetch(DOWNLOAD_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    })

    if (!response.body) return

    const reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) break
      state.totalBytes += value.byteLength
    }

    reader.cancel()
  } catch {
    // AbortError is expected when time runs out
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
