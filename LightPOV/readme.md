# Light POV (光蛇)

## Important Features
- Using `Effects` to manage the displaying time of an effect.
- Using `ColorScheduler` to set colors with pre-defined functions.
- Using OTA to upload program through Wifi.
- Using a web server to send commands to POVs for synchronization.
- Displaying pre-loaded bitmaps to display complex patterns.

## Project file structure
```
├── ControlPanel_v3             : Effect editor (Vite + Vue 3 + TypeScript), see ControlPanel_v3/docs/
│   ├── src                     : Web front-end
│   ├── src/server/server.js    : Hardware server (port 20480)
│   ├── server/server.ts        : Hardware server (port 10240)
│   └── docs                    : Developer docs (architecture, hardware protocol)
├── ESP32                       : Program for ESP32
│   ├── ESP32.ino               : Main program code
│   ├── ConfigManager.cpp/.h    : Persistent (ROM) configuration
│   ├── acc.cpp/.h              : Accelerometer module
│   ├── bitmaps.h               : bitmaps for displaying patterns
│   ├── communication.cpp/.h    : Wifi connection and OTA
│   ├── config.h                : Configuration for Wifi password, host address, etc.
│   ├── core.h                  : Definitions of pattern functions
│   └── modes.cpp/.h            : Implementations of patterns, the scheduling of effects
├── hardware
│   ├── *.SLDPRT / *.STL        : SolidWorks parts and printable meshes
│   └── PCB
│       ├── core_pcb            : ESP32 core board v2.0
│       ├── light_stick         : KiCad project for the stick
│       └── easyeda_projects.7z : Earlier EasyEDA projects (stick, ball, hand light)
├── legacy                      : Previous control panels and performance files (read-only)
├── readme.md
└── test                        : Some module test code
```

## The hardware 
The schematic is an unrecorded artifact. The hardware is a simple design with an ESP32, a WS2812 LED strip, and a 18650 battery. 
PCB designs are in `hardware/PCB/`.

## Welcome for Contribution
If you are interested in this project, feel free to contribute to this project.
If you have any questions, please open an issue or contact @sciyen via sciyen.ycc@gmail.com .