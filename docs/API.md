# PawSync App ↔ Feeder API contract

Base URL: `http://<feeder-ip>` (for example `http://192.168.1.50`). The app and device must be reachable on the same trusted Wi-Fi network. The firmware currently uses unauthenticated HTTP for local development only; do not expose it to the internet.

## Endpoints

### `GET /health`
Returns `{ "ok": true, "service": "pawsync-feeder" }`.

### `GET /api/v1/status`
Returns `deviceId`, `deviceName`, `online`, `wifiConnected`, `jammed`, `mode`, `foodRemainingGrams`, `foodCapacityGrams`, `foodLevelPercent`, `schedulesEnabled`, `lastFeeding` (event or null), and `recentFeedings` (newest ten events).

Feed event: `{ "id": 1, "grams": 80, "timestamp": 1790000000, "source": "manual" }`; timestamp is Unix seconds. `foodLevelPercent` is an estimate until a real sensor is added.

### `POST /api/v1/feed`
Request: `{ "grams": 80 }`; optional idempotency key in `X-Request-Id` header (recommended) or `requestId` body field. Portion must be 10–250 grams. Response includes `ok`, `result`, `requestId`, `grams`, `foodRemainingGrams`. Repeating the last successful request ID returns the cached response without applying the amount a second time.

Possible results: `accepted`, `invalid_amount`, `offline`, `jammed`, `insufficient_food`.

### `GET /api/v1/schedules`
Returns `{ "schedules": [...] }`. Each item uses `id`, `name`, `time` (`HH:mm`), `grams`, `dayMask` (Monday bit 0 through Sunday bit 6), and `enabled`.

### `PUT /api/v1/schedules`
Replaces all schedules atomically. Request: `{ "schedules": [{ "id": "breakfast", "name": "Breakfast", "time": "07:30", "grams": 80, "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "enabled": true }] }`. The firmware converts day names to `dayMask` for the GET response. Empty list clears all schedules.

### `DELETE /api/v1/schedules/{id}`
Deletes one schedule by ID.

CORS is enabled for app development, including preflight. Production deployment should replace wildcard CORS and unauthenticated HTTP with authenticated transport suitable for the final network design.

## Connect the existing app

The React/Capacitor app source is in the sibling `paw` workspace. Its API base URL can be configured as `VITE_PAWSYNC_DEVICE_URL=http://<feeder-ip>` when building the app. Keep demo mode as the default during development. The shared `src/deviceApi.ts` adapter is the intended app seam: screens call the adapter rather than issuing device requests directly.

The current firmware feed action still updates the software model only. A real motor and sensor adapter will replace that operation after the exact components and safety limits are known.
