# Hardware assumptions and decisions

## Current development placeholder

- Target: generic ESP32 DevKit / ESP32-WROOM-32 (`esp32dev` PlatformIO board definition).
- Framework: Arduino ESP32 core; application and feeder logic are C++17.
- Network: Wi-Fi station mode and a small local HTTP JSON API.
- Persistence: ESP32 NVS via `Preferences` for the last known food estimate and portion setting.
- Status indicator: onboard GPIO 2, only as a placeholder that must be checked against the final board.

## Not defined yet

Do not connect a motor from GPIO directly. Motor driver model, motor/servo type, supply voltage/current, hopper and mechanism, weight or level sensor, jam/stall method, feeder pin assignment, watchdog policy, and OTA update policy all require hardware decisions. Current feeding changes the simulation state only. Do not claim the displayed remaining-food estimate is a measured sensor reading.

## Before enabling real dispensing

1. Record exact board and module variants and check pin strapping and voltage levels.
2. Select motor driver and add a hardware adapter with current/timeout/stall safeguards.
3. Select and calibrate the portion and food-level sensing method.
4. Test jam, empty hopper, brownout, reset during feed, duplicate network requests, and offline recovery.
5. Add authenticated provisioning/API access before exposing the device beyond a trusted local test network.
