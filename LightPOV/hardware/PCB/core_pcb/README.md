## Core PCB version 2.0

### Dimensions
- **Outer Frame Size**: 142mm × 18mm
- **Battery Placement Hole**: 50mm × 14mm

### Major Changes
1. Changed ESP32 from the original packaged module version to using only the IC chip (size: 7mm × 7mm), and referenced [Ducky-Board-ESP32-S3](https://github.com/MakersFunDuck/Ducky-Board-ESP32-S3) for circuit design
2. Replaced the original design that required floating wires (Type-C, SW, BAT) with JST connectors to improve stability and maintainability
3. Changed battery specification from 18650 to 14500, effectively reducing the PCB volume

### Design Considerations
1. Adopted the circuit design provided by [Ducky-Board-ESP32-S3](https://github.com/MakersFunDuck/Ducky-Board-ESP32-S3) for layout, and removed all original pin headers. Since the original circuit's charging module only provides charging functionality without boost capability, it was replaced with an IP5306 5V/2A lithium battery charge/discharge management module, which generates 5V power supply for the LED strip
2. ESP32 and LED strip use independent power supply design. ESP32 is directly powered by the battery, or through an internal power switching mechanism that switches the ESP32 power supply source based on whether USB is powered. ESP32 does not have a switch for power-off control, ensuring that when battery-powered, ESP32 always remains in an on state to maintain signal communication continuity and stability
3. To accommodate the layout requirements of JST connectors on both ends, the antenna module was moved to the side of the PCB
4. To improve convenience and stability when interfacing with other PCBs, LED strip connection uses JST-XH connectors, while BAT, SW, and Type-C use JST-SH connectors

### Current Design Issues
1. USB signal transmission lines require differential routing design with equal length to reduce interference, and need GND shielding and impedance calculation (reference: [USB Differential Routing Design](https://www.eet-china.com/mp/a69268.html)) (Resolved)
2. The upper and lower layers of the antenna area should not have any traces or copper pour to ensure antenna performance (Resolved)

### Future Plans
1. Test whether the PCB circuit can operate normally
2. Implement magnetic charging with external 3D printed hardware
3. Test whether the independent power supply can handle high current requirements (measure whether the LED strip supply current exceeds 2A)
