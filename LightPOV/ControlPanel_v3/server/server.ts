// Express server — TypeScript migration of src/server/server.js
// Changes from original:
//   - Full type annotations
//   - res.status(4xx).json() replaces res.send("ERROR!!")
//   - Removed unused formidable file-upload routes
//   - Added /start_no_audio endpoint for music-free hardware start

import express, { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
//  Hardware constants
// ---------------------------------------------------------------------------

const NUM_OF_LUX = 5
const NUM_OF_LB  = 10
const port       = 10240

// ---------------------------------------------------------------------------
//  Runtime state
// ---------------------------------------------------------------------------

let light_state:  number[] = new Array(NUM_OF_LUX).fill(0)
let light_effect: number[] = new Array(NUM_OF_LUX).fill(0)
let lux_mode:     number[] = new Array(NUM_OF_LUX).fill(0)
let light_reset:  boolean[] = new Array(NUM_OF_LUX).fill(false)
let light_stop:   boolean[] = new Array(NUM_OF_LUX).fill(false)

// eslint-disable-next-line prefer-const
let last_connect_time: number[] = new Array(NUM_OF_LB).fill(0)

let EXE_MODE = 0   // 0 = auto, 1 = manual
let SONG     = 'unravel.json'
let Time: number | string = 0
let time: number | string = 0

// ---------------------------------------------------------------------------
//  EffectMap loading
// ---------------------------------------------------------------------------

interface HsvChannel {
  func:  number
  range: number
  lower: number
  p1:    number
  p2:    number
}

interface EffectEntry {
  mode:       string
  start_time: number
  duration:   number
  XH: HsvChannel
  XS: HsvChannel
  XV: HsvChannel
  YH: HsvChannel
  YS: HsvChannel
  YV: HsvChannel
  p1: number
  p2: number
  p3: number
  p4: number
  param?: number[]
}

// EffectMap is an array of "modes", each mode is an array of effects
type EffectMap = EffectEntry[][]

let EffectMap: EffectMap = loadEffectMap(SONG)

function loadEffectMap(filename: string): EffectMap {
  const filePath = path.join(__dirname, '..', 'src', 'server', 'public', filename)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as EffectMap
}

// ---------------------------------------------------------------------------
//  Enum helpers
// ---------------------------------------------------------------------------

const ENUM_MODES_NAMES = [
  'MODES_CLEAR',
  'MODES_PLAIN',
  'MODES_SQUARE',
  'MODES_SICKLE',
  'MODES_FAN',
  'MODES_BOXES',
  'MODES_SICKLE_ADV',
  'MODES_FAN_ADV',
  'MODES_MAP_ES',
  'MODES_MAP_ES_ZH',
  'MODES_CMAP_DNA',
  'MODES_CMAP_FIRE',
  'MODES_CMAP_BENSON',
  'MODES_CMAP_YEN',
  'MODES_CMAP_LOVE',
  'MODES_CMAP_GEAR',
  'MODES_MAP_ESXOPT',
]

const ENUM_MODES: Record<string, number> = {}
ENUM_MODES_NAMES.forEach((name, idx) => { ENUM_MODES[name] = idx })

const ENG_MARK_JSON = ['XH', 'XS', 'XV', 'YH', 'YS', 'YV'] as const
const ENG_MARK_WIRE = ['X',  'Y',  'Z',  'U',  'V',  'W' ] as const

/** Serialise an EffectEntry to the hardware protocol string */
function stringify(content: EffectEntry): string {
  let s = `M${ENUM_MODES[content.mode]}S${content.start_time}D${content.duration}`

  for (let i = 0; i < ENG_MARK_JSON.length; i++) {
    const ch   = content[ENG_MARK_JSON[i]]
    const num1 = ch.func * 256 * 256 + ch.range * 256 + ch.lower
    const num2 = ch.p1 * 256 + ch.p2
    s += `${ENG_MARK_WIRE[i]}${num1},${num2}`
  }

  const pNum1 = content.p1 * 256 + content.p2
  const pNum2 = content.p3 * 256 + content.p4
  s += `P${pNum1},${pNum2};`
  return s
}

// ---------------------------------------------------------------------------
//  Express app
// ---------------------------------------------------------------------------

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '..', 'src')))

// --- Hardware: get a single effect string ---
app.get('/get_effect', (req: Request, res: Response) => {
  const ID     = parseInt(String(req.query.id))
  const LUX_ID = parseInt(String(req.query.luxid))

  if (isNaN(ID) || isNaN(LUX_ID)) {
    return res.status(400).json({ error: 'Missing or invalid id / luxid' })
  }
  const modeEffects = EffectMap[lux_mode[LUX_ID]]
  if (!modeEffects || ID >= modeEffects.length || LUX_ID >= NUM_OF_LUX) {
    return res.status(404).json({ error: 'Effect not found' })
  }

  const effect = modeEffects[ID]
  console.log(`get_effect: mode=${effect.mode} id=${ID}`)
  res.send(stringify(effect))
})

// --- Playback sync: frontend sends current time ---
app.get('/start', (req: Request, res: Response) => {
  Time = String(req.query.time ?? 0)
  res.send(String(Time))
})

// --- No-audio mode: start hardware playback without audio ---
app.post('/start_no_audio', (_req: Request, res: Response) => {
  Time     = 0
  EXE_MODE = 0
  res.json({ ok: true })
})

// --- ESP polls for current time + control mode ---
app.get('/esp_time', (req: Request, res: Response) => {
  const id  = parseInt(String(req.query.id))
  const now = Date.now()

  if (isNaN(id) || id < 0 || id >= NUM_OF_LUX) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  light_state[id]  = now
  light_effect[id] = parseInt(String(req.query.effect)) || 0

  const mode = light_reset[id] ? 'C'
             : light_stop[id]  ? 'P'
             : EXE_MODE === 0  ? 'A'
             : 'M'
  res.send(mode + String(Time))
})

// --- Execution mode (auto / manual) ---
app.get('/exe_mode', (req: Request, res: Response) => {
  const mode = parseInt(String(req.query.mode))
  if (isNaN(mode)) return res.status(400).json({ error: 'Invalid mode' })
  EXE_MODE = mode
  res.send(String(EXE_MODE))
})

// --- Status queries ---
app.get('/get_stat', (req: Request, res: Response) => {
  const id = parseInt(String(req.query.id))
  if (isNaN(id) || id < 0 || id >= NUM_OF_LUX)
    return res.status(400).json({ error: 'Invalid id' })
  res.send(String(light_state[id]))
})

app.get('/get_light', (req: Request, res: Response) => {
  const id = parseInt(String(req.query.id))
  if (isNaN(id) || id < 0 || id >= NUM_OF_LUX)
    return res.status(400).json({ error: 'Invalid id' })
  res.send(String(light_effect[id]))
})

// --- Lux mode / reset / stop ---
app.get('/update_lux_mode', (req: Request, res: Response) => {
  const id   = parseInt(String(req.query.id))
  const mode = parseInt(String(req.query.mode))
  if (isNaN(id) || id < 0 || id >= lux_mode.length)
    return res.status(400).json({ error: 'Invalid ID' })
  if (isNaN(mode))
    return res.status(400).json({ error: 'Invalid mode' })
  lux_mode[id] = mode
  res.send(`Lux ${id} mode: ${mode}`)
})

app.get('/update_lux_reset', (req: Request, res: Response) => {
  const id    = parseInt(String(req.query.id))
  const reset = req.query.clear === 'true'
  if (isNaN(id) || id < 0 || id >= NUM_OF_LUX)
    return res.status(400).json({ error: 'Invalid ID' })
  light_reset[id] = reset
  res.send(`Lux ${id} reset: ${reset}`)
})

app.get('/update_lux_stop', (req: Request, res: Response) => {
  const id   = parseInt(String(req.query.id))
  const stop = req.query.stop === 'true'
  if (isNaN(id) || id < 0 || id >= NUM_OF_LUX)
    return res.status(400).json({ error: 'Invalid ID' })
  light_stop[id] = stop
  res.send(`Lux ${id} stop: ${stop}`)
})

// --- Time sync (legacy ESP endpoints) ---
app.get('/gettime', (req: Request, res: Response) => {
  const id = parseInt(String(req.query.id))
  last_connect_time[id] = Date.now()
  res.send(String(time))
})

app.post('/settime', (req: Request, res: Response) => {
  time = req.body.time as number
  res.status(200).send('Time updated')
})

// --- Reload effect JSON file ---
app.post('/update_file', (req: Request, res: Response) => {
  const newFile = (req.body.file || req.body.path) as string | undefined
  if (!newFile) return res.status(400).send('Missing file parameter')

  const filePath = path.join(__dirname, '..', 'src', 'server', 'public', newFile)
  if (!fs.existsSync(filePath)) return res.status(404).send(`File not found: ${filePath}`)

  try {
    SONG      = newFile
    EffectMap = loadEffectMap(SONG)
    console.log(`File updated to: ${SONG}`)
    res.status(200).send(`File updated successfully: ${SONG}`)
  } catch (err) {
    console.error('Error updating file:', err)
    res.status(500).send(`Error updating file: ${(err as Error).message}`)
  }
})

// --- Push EffectMap directly from frontend (no file I/O required) ---
app.post('/push_effect_map', (req: Request, res: Response) => {
  const map = req.body as EffectMap
  console.log(`EffectMap updated: ${map}`)
  if (!Array.isArray(map)) return res.status(400).json({ error: 'Invalid EffectMap' })
  EffectMap = map
  console.log(`EffectMap updated: ${map.length} device(s)`)
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
//  Server health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
//  Start
// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
