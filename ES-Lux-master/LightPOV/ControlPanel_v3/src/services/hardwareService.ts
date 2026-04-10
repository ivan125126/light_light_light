/**
 * Communication with the Express hardware server (port 20480).
 * All fetch calls go through Vite proxy → http://localhost:20480
 */

let _syncInterval: ReturnType<typeof setInterval> | null = null

/**
 * Start sending playback time to server every 50ms.
 * @param getTimeMs  Function that returns current playback time in ms
 */
export function startHardwareSync(getTimeMs: () => number): void {
  if (_syncInterval) return
  _syncInterval = setInterval(async () => {
    const timeMs = getTimeMs()
    try {
      await fetch(`/start?time=${timeMs}`)
    } catch {
      // Server unreachable — silently ignore, don't break playback
    }
  }, 50)
}

/** Stop the hardware sync interval */
export function stopHardwareSync(): void {
  if (_syncInterval) {
    clearInterval(_syncInterval)
    _syncInterval = null
  }
}

/** Send current playback time to server once (one-shot, used when seeking while paused) */
export async function notifyServerTime(ms: number): Promise<void> {
  try {
    await fetch(`/start?time=${ms}`)
  } catch {
    // Server unreachable — silently ignore
  }
}

/** Fetch effect string from server (used to verify hardware receives correct data) */
export async function getEffectFromServer(effectId: number, luxId: number): Promise<string> {
  const res = await fetch(`/get_effect?id=${effectId}&luxid=${luxId}`)
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
  return res.text()
}

/** Send hardware to auto execution mode (0) or manual mode (1) */
export async function setExecutionMode(mode: 0 | 1): Promise<void> {
  try {
    await fetch(`/exe_mode?mode=${mode}`)
  } catch {
    // Server unreachable — silently ignore
  }
}

/** Start hardware playback without audio — calls /start_no_audio on server */
export async function startWithoutAudio(): Promise<void> {
  try {
    await fetch('/start_no_audio', { method: 'POST' })
  } catch {
    // Server unreachable — silently ignore
  }
}

/** Fetch last-connection timestamp (ms) for a lux unit (0-based id) */
export async function getLuxStat(id: number): Promise<number> {
  try {
    const res = await fetch(`/get_stat?id=${id}`)
    if (!res.ok) return 0
    return parseInt(await res.text(), 10) || 0
  } catch {
    return 0
  }
}

/** Fetch the current effect name/index reported by a lux unit (0-based id) */
export async function getLuxLight(id: number): Promise<string> {
  try {
    const res = await fetch(`/get_light?id=${id}`)
    if (!res.ok) return ''
    return (await res.text()).trim()
  } catch {
    return ''
  }
}

/** Push live effect data to server so all ESP32 units display it immediately */
export async function pushLiveEffect(data: import('../types').EffectData): Promise<void> {
  try {
    await fetch('/live_effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    // Server unreachable — silently ignore
  }
}

/** Stop live effect mode on server, resuming normal timeline playback */
export async function stopLiveEffect(): Promise<void> {
  try {
    await fetch('/live_effect/stop', { method: 'POST' })
  } catch {
    // Server unreachable — silently ignore
  }
}

/** Check whether the Express server is reachable */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/health')
    return res.ok
  } catch {
    return false
  }
}
