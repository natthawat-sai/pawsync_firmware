# PawSync Feeder Firmware (C++)

PlatformIO project for the planned ESP32 feeder. `lib/pawsync_core` contains device-independent state and feeding rules; `src/main.cpp` exposes the local HTTP API. The API contract shared with the PawSync app lives in `docs/API.md`.

## Build and flash

Install PlatformIO Core and its ESP32 platform/framework packages, then run:

```sh
pio run -e esp32dev
pio test -e native
pio run -e esp32dev -t upload
pio device monitor -b 115200
```

`esp32dev` is a placeholder board target until the exact board and flash size are selected. Configure Wi-Fi credentials locally in `src/main.cpp`. The phone and feeder must share a trusted network; use the device IP as the app API base URL. Do not expose the unauthenticated development API to the internet.

## App integration

The app is a React/Capacitor project in the sibling `paw` workspace. It currently displays prototype data and does not call the device. API routes and JSON types are documented in `docs/API.md`; `docs/APP_INTEGRATION.md` describes the small app adapter needed to switch between demo data and this HTTP API. The app workspace is currently read-only to this task, so no app source was changed here.

## Current API

- `GET /health`
- `GET /api/v1/status`
- `POST /api/v1/feed` with `{ "grams": 80 }` and optional `X-Request-Id`
- `GET`, `PUT /api/v1/schedules`
- `DELETE /api/v1/schedules/{id}`

## Hardware boundary

The feed command only updates firmware state today. No motor or sensor is attached. Food remaining is a stored estimate, and scheduled feeding is model logic without a production time source or persistence. Keep motor actuation disabled until motor-driver specifics, portion measurement, jam detection, timeout, watchdog, and fault behavior are implemented and tested.
## App ↔ firmware readiness

The API contract and app integration guide are in `docs/API.md` and `docs/APP_INTEGRATION.md`. The app workspace is not writable by this task's file permissions, so its source has not been changed. It still uses mock state for its screens. Apply the adapter and UI wiring in the `paw` workspace to make the existing app call these endpoints; then set `VITE_PAWSYNC_DEVICE_URL` to the ESP32 LAN address at build time.

The firmware's HTTP endpoints are ready as an integration target, subject to a successful build on a machine where the installed ESP32 compiler can start. Actual actuation, food measurements, schedule clock and persistence, and secure provisioning remain hardware-dependent.
