# Server Status Indicator — Design Spec

**Date:** 2026-04-09
**Branch:** ControlPanel_v3

## Goal

Show a visible indicator in the toolbar so the user can immediately tell whether the Express hardware server is running.

## Approach

Poll a dedicated `/health` endpoint every 3 seconds. Display a coloured dot + text label in the toolbar. No WebSocket; no reuse of existing functional endpoints.

---

## Changes

### 1. `server/server.ts`

Add before the `app.listen` call:

```ts
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})
```

No logic, no dependencies — exists solely to confirm the server is alive.

### 2. `vite.config.ts`

Add `/health` to the proxy map:

```ts
'/health': 'http://localhost:20480',
```

### 3. `src/services/hardwareService.ts`

Add:

```ts
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/health')
    return res.ok
  } catch {
    return false
  }
}
```

### 4. `src/stores/hardwareStore.ts`

State addition:
```ts
serverOnline: false as boolean,
_serverPollingId: null as ReturnType<typeof setInterval> | null,
```

New actions:
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

### 5. `src/App.vue`

**`onMounted`:** call `hardwareStore.startServerPolling()`
**`onUnmounted`:** call `hardwareStore.stopServerPolling()`

**Template** — add to toolbar (after dirty indicator, before buttons):

```html
<span class="server-status" :class="hardwareStore.serverOnline ? 'online' : 'offline'">
  ● {{ hardwareStore.serverOnline ? 'Server 已連線' : 'Server 未連線' }}
</span>
```

**CSS** (two new classes, no existing styles touched):

```css
.server-status        { font-size: 0.8rem; margin-right: 12px; }
.server-status.online  { color: #4caf50; }
.server-status.offline { color: #f44336; opacity: 0.7; }
```

---

## Out of Scope

- No retry logic or back-off — simple fixed 3-second poll is sufficient.
- No toast/notification on state change — visual indicator only.
- No changes to hardware unit polling (`_refresh`) — separate concern.
