export interface PingResult {
  avg: number
  min: number
  max: number
  jitter: number
  packetLoss: number
  samples: number[]
}

const PING_COUNT = 20
const PING_TIMEOUT_MS = 3000
const PING_ENDPOINT = '/api/ping'

async function singlePing(): Promise<number | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

  try {
    const t0 = performance.now()
    await fetch(PING_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    const t1 = performance.now()
    clearTimeout(timeoutId)
    return t1 - t0
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

export async function measurePing(
  onProgress: (partial: Partial<PingResult> & { progress: number }) => void
): Promise<PingResult> {
  const samples: number[] = []
  let failed = 0

  // Warm-up ping (discarded)
  await singlePing()

  for (let i = 0; i < PING_COUNT; i++) {
    const rtt = await singlePing()

    if (rtt === null) {
      failed++
    } else {
      samples.push(rtt)
    }

    const progress = (i + 1) / PING_COUNT

    if (samples.length > 0) {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length
      const min = Math.min(...samples)
      const max = Math.max(...samples)
      const jitter = calculateJitter(samples)

      onProgress({
        progress,
        avg: Math.round(avg),
        min: Math.round(min),
        max: Math.round(max),
        jitter: Math.round(jitter),
        packetLoss: Math.round((failed / (i + 1)) * 100),
        samples: [...samples],
      })
    } else {
      onProgress({ progress })
    }

    // Small gap between pings
    await delay(50)
  }

  const avg = samples.length > 0
    ? samples.reduce((a, b) => a + b, 0) / samples.length
    : 0

  return {
    avg: Math.round(avg),
    min: samples.length > 0 ? Math.round(Math.min(...samples)) : 0,
    max: samples.length > 0 ? Math.round(Math.max(...samples)) : 0,
    jitter: Math.round(calculateJitter(samples)),
    packetLoss: Math.round((failed / PING_COUNT) * 100),
    samples,
  }
}

function calculateJitter(samples: number[]): number {
  if (samples.length < 2) return 0
  let totalDiff = 0
  for (let i = 1; i < samples.length; i++) {
    totalDiff += Math.abs(samples[i]! - samples[i - 1]!)
  }
  return totalDiff / (samples.length - 1)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
