/**
 * Communication with the Express hardware server (port 10240).
 * All fetch calls go through Vite proxy → http://localhost:10240
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
