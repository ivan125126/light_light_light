# Server Status Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a real-time server online/offline indicator in the toolbar by polling a `/health` endpoint every 3 seconds.

**Architecture:** A new `/health` endpoint on the Express server returns `{ ok: true }`. The frontend polls it via `checkServerHealth()` in `hardwareService.ts`, stores the result in `hardwareStore.serverOnline`, and renders a coloured dot + label in the App.vue toolbar.

**Tech Stack:** Express (server), Vue 3 + Pinia (frontend), Vitest (tests), Vite proxy

---

## File Map

| File | Change |
|---|---|
| `server/server.ts` | Add `GET /health` endpoint |
| `vite.config.ts` | Add `/health` to proxy map |
| `src/services/hardwareService.ts` | Add `checkServerHealth()` |
| `src/stores/hardwareStore.ts` | Add `serverOnline` state + `startServerPolling` / `stopServerPolling` / `_checkServer` |
| `src/App.vue` | Start/stop polling on mount/unmount; add status indicator to toolbar |
| `src/tests/hardwareStore.test.ts` | New test file for server polling logic |

---

### Task 1: Add `/health` endpoint to Express server

**Files:**
- Modify: `server/server.ts` (before `app.listen`)

- [ ] **Step 1: Add the endpoint**

In `server/server.ts`, insert before the `app.listen(port, ...)` block (currently line 272):

```ts
// --- Server health check ---
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})
```

- [ ] **Step 2: Manual smoke test**

Start the server with `npx ts-node server/server.ts` (or however you run it) and curl:

```bash
curl http://localhost:10240/health
# Expected: {"ok":true}
```

- [ ] **Step 3: Commit**

```bash
git add server/server.ts
git commit -m "feat(server): add /health endpoint"
```

---

### Task 2: Add `/health` to Vite proxy

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add proxy rule**

In `vite.config.ts`, inside the `proxy` object, add one line alongside the other entries:

```ts
'/health': 'http://localhost:20480',
```

> Note: All existing proxy rules point to port 20480 — match that port here for consistency with the existing setup.

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat(vite): proxy /health to server"
```

---

### Task 3: Add `checkServerHealth` to hardwareService

**Files:**
- Modify: `src/services/hardwareService.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/hardwareStore.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHardwareStore } from '../stores/hardwareStore'

// Mock hardwareService so we control server responses
vi.mock('../services/hardwareService', () => ({
  getLuxStat: vi.fn().mockResolvedValue(0),
  checkServerHealth: vi.fn(),
}))

import { checkServerHealth } from '../services/hardwareService'

describe('hardwareStore — server polling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('serverOnline 初始為 false', () => {
    const store = useHardwareStore()
    expect(store.serverOnline).toBe(false)
  })

  it('startServerPolling 在 server 回應 true 時將 serverOnline 設為 true', async () => {
    vi.mocked(checkServerHealth).mockResolvedValue(true)
    const store = useHardwareStore()
    store.startServerPolling()
    await vi.runAllTimersAsync()
    expect(store.serverOnline).toBe(true)
  })

  it('startServerPolling 在 server 回應 false 時將 serverOnline 設為 false', async () => {
    vi.mocked(checkServerHealth).mockResolvedValue(false)
    const store = useHardwareStore()
    store.serverOnline = true  // pre-set to true to verify it gets flipped
    store.startServerPolling()
    await vi.runAllTimersAsync()
    expect(store.serverOnline).toBe(false)
  })

  it('stopServerPolling 停止後不再更新 serverOnline', async () => {
    vi.mocked(checkServerHealth).mockResolvedValue(true)
    const store = useHardwareStore()
    store.startServerPolling()
    await vi.runAllTimersAsync()
    expect(store.serverOnline).toBe(true)

    store.stopServerPolling()
    vi.mocked(checkServerHealth).mockResolvedValue(false)
    await vi.advanceTimersByTimeAsync(9000)
    // Should still be true — polling stopped
    expect(store.serverOnline).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ControlPanel_v3 && npm test -- --reporter=verbose 2>&1 | grep -A3 "hardwareStore"
# Expected: FAIL — checkServerHealth is not a function / serverOnline not defined
```

- [ ] **Step 3: Add `checkServerHealth` to hardwareService**

In `src/services/hardwareService.ts`, add after the existing `getLuxStat` function:

```ts
/** Check whether the Express server is reachable */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/health')
    return res.ok
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Commit service change**

```bash
git add src/services/hardwareService.ts
git commit -m "feat(service): add checkServerHealth"
```

---

### Task 4: Add server polling to hardwareStore

**Files:**
- Modify: `src/stores/hardwareStore.ts`

- [ ] **Step 1: Add `serverOnline` to state and import `checkServerHealth`**

At the top of `src/stores/hardwareStore.ts`, add `checkServerHealth` to the import:

```ts
import { getLuxStat, checkServerHealth } from '../services/hardwareService'
```

In the `state` function, add two fields after `_pollingId`:

```ts
serverOnline: false as boolean,
_serverPollingId: null as ReturnType<typeof setInterval> | null,
```

- [ ] **Step 2: Add polling actions**

In the `actions` object, add after `stopPolling`:

```ts
startServerPolling() {
  if (this._serverPollingId) return
  this._checkServer()
  this._serverPollingId = setInterval(() => this._checkServer(), 3000)
},

stopServerPolling() {
  if (this._serverPollingId) {
    clearInterval(this._serverPollingId)
    this._serverPollingId = null
  }
},

async _checkServer() {
  this.serverOnline = await checkServerHealth()
},
```

- [ ] **Step 3: Run tests**

```bash
cd ControlPanel_v3 && npm test -- --reporter=verbose 2>&1 | grep -A5 "hardwareStore"
# Expected: all 4 tests PASS
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/hardwareStore.ts src/tests/hardwareStore.test.ts
git commit -m "feat(store): server online polling with tests"
```

---

### Task 5: Add server status indicator to toolbar in App.vue

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Start/stop polling in lifecycle hooks**

In `src/App.vue`, in the `onMounted` callback (currently line 130), add:

```ts
hardwareStore.startServerPolling()
```

In `onUnmounted` (currently line 134), add:

```ts
hardwareStore.stopServerPolling()
```

- [ ] **Step 2: Add status indicator to toolbar template**

In `src/App.vue`, inside `<header class="toolbar">`, add this span after the `<span v-if="projectStore.isDirty" ...>` dirty indicator (line 20) and before the first `<button>`:

```html
<span class="server-status" :class="hardwareStore.serverOnline ? 'online' : 'offline'">
  ● {{ hardwareStore.serverOnline ? 'Server 已連線' : 'Server 未連線' }}
</span>
```

- [ ] **Step 3: Add CSS**

In `src/App.vue`, inside the `<style>` block (or `<style scoped>` if the file uses scoped styles), add:

```css
.server-status {
  font-size: 0.8rem;
  margin-right: 12px;
  user-select: none;
}
.server-status.online  { color: #4caf50; }
.server-status.offline { color: #f44336; opacity: 0.7; }
```

- [ ] **Step 4: Manual verification**

1. Run `npm run dev` (frontend only, no server).
2. Check toolbar shows `● Server 未連線` in red.
3. Start the server (`npx ts-node server/server.ts`).
4. Within 3 seconds, toolbar should switch to `● Server 已連線` in green.
5. Kill the server — within 3 seconds it should flip back to red.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat(ui): server status indicator in toolbar"
```

---

## Self-Review Checklist

- [x] `/health` endpoint added to server ✓
- [x] Proxy rule for `/health` ✓
- [x] `checkServerHealth()` service function ✓
- [x] `serverOnline` state in store ✓
- [x] `startServerPolling` / `stopServerPolling` / `_checkServer` actions ✓
- [x] Tests for all polling states (initial, true, false, stopped) ✓
- [x] `onMounted` / `onUnmounted` lifecycle hooks ✓
- [x] Toolbar indicator with CSS ✓
- [x] No TBD / TODO placeholders ✓
- [x] Type names consistent across tasks (`serverOnline`, `checkServerHealth`, `startServerPolling`, `stopServerPolling`) ✓
