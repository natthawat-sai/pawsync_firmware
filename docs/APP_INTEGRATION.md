# React device adapter example

This is the small app-side change to apply in the `paw` workspace when write access is available. Keep mock mode for no-hardware use; use the same exported `DeviceApi` interface for both backends.

1. Add `src/deviceApi.ts` with the shared `DeviceStatus`, `DeviceSchedule`, and `DeviceApi` types and mock/HTTP implementations matching `API.md`.
2. In `Dashboard`, call `deviceApi.getStatus()` on mount and periodically, then call `deviceApi.feed(portion)` on Feed Now. Show an error and refresh status after a successful command. Do not mark feeding complete before the device acknowledges it.
3. In `Schedule`, load schedules on mount. Persist add/edit/toggle/delete through `replaceSchedules` or `deleteSchedule`; show request errors and retain a retry path.
4. Add `VITE_PAWSYNC_DEVICE_URL` to the Vite environment types or document the required `.env.local` value. If unset, stay in mock mode. Physical phone builds must use the ESP32 LAN IP, never `localhost`.
5. Replace hardcoded food-level values with status telemetry and label the value as estimated until an actual sensor is wired and calibrated. History and notifications should be separate API resources before replacing their current app demo content.

Suggested minimal hook:

```ts
const configuredUrl = import.meta.env.VITE_PAWSYNC_DEVICE_URL?.trim();
const api = configuredUrl ? new HttpDeviceApi(configuredUrl) : mockApi;
```

Do not add a production build secret for the device address; it is a local network address, but the API itself must eventually gain authentication and a provisioning flow.
