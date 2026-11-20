export type DeviceMode = "booting" | "ready" | "feeding" | "fault" | "offline";
export type FeedSource = "manual" | "schedule";

export interface FeedEvent {
  id: number;
  grams: number;
  timestamp: number;
  source: FeedSource;
}

export interface DeviceStatus {
  deviceId: string;
  deviceName: string;
  online: boolean;
  wifiConnected: boolean;
  jammed: boolean;
  mode: DeviceMode;
  foodRemainingGrams: number;
  foodCapacityGrams: number;
  foodLevelPercent: number;
  schedulesEnabled: number;
  lastFeeding: FeedEvent | null;
  recentFeedings: FeedEvent[];
  simulation: boolean;
}

export interface DeviceSchedule {
  id: string;
  name: string;
  time: string;
  grams: number;
  days: string[];
  enabled: boolean;
}

export interface FeedCommandResult {
  ok: boolean;
  result: string;
  requestId: string;
  grams: number;
  foodRemainingGrams: number;
}

export interface DeviceApi {
  readonly kind: "mock" | "http";
  getStatus(): Promise<DeviceStatus>;
  feed(grams: number): Promise<FeedCommandResult>;
  getSchedules(): Promise<DeviceSchedule[]>;
  replaceSchedules(schedules: DeviceSchedule[]): Promise<void>;
  deleteSchedule(id: string): Promise<void>;
}

export class DeviceApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "DeviceApiError";
  }
}

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fallbackSchedules: DeviceSchedule[] = [
  { id: "breakfast", name: "Breakfast", time: "07:30", grams: 80, days: [...dayNames], enabled: true },
  { id: "lunch", name: "Lunch", time: "12:00", grams: 70, days: [...dayNames], enabled: true },
  { id: "dinner", name: "Dinner", time: "18:00", grams: 80, days: [...dayNames], enabled: true },
];

function dayMask(days: string[]) {
  return days.reduce((mask, day) => {
    const index = dayNames.indexOf(day);
    return index < 0 ? mask : mask | (1 << index);
  }, 0);
}

function fromWireSchedule(value: Record<string, unknown>): DeviceSchedule {
  const mask = Number(value.dayMask ?? 127);
  return {
    id: String(value.id),
    name: String(value.name ?? value.id),
    time: String(value.time),
    grams: Number(value.grams),
    days: dayNames.filter((_, index) => mask & (1 << index)),
    enabled: Boolean(value.enabled),
  };
}

function toWireSchedule(value: DeviceSchedule) {
  return { ...value, dayMask: dayMask(value.days) };
}

class MockDeviceApi implements DeviceApi {
  readonly kind = "mock" as const;
  private schedules = fallbackSchedules.map((item) => ({ ...item, days: [...item.days] }));
  private history: FeedEvent[] = [];
  private foodRemainingGrams = 3900;

  async getStatus(): Promise<DeviceStatus> {
    const lastFeeding = this.history.at(-1) ?? null;
    return {
      deviceId: "pawsync-demo-001", deviceName: "PawSync Feeder", online: true,
      wifiConnected: true, jammed: false, mode: "ready", foodRemainingGrams: this.foodRemainingGrams,
      foodCapacityGrams: 5000, foodLevelPercent: Math.round(this.foodRemainingGrams / 50),
      schedulesEnabled: this.schedules.filter((item) => item.enabled).length,
      lastFeeding, recentFeedings: [...this.history].reverse(), simulation: true,
    };
  }

  async feed(grams: number): Promise<FeedCommandResult> {
    if (!Number.isInteger(grams) || grams < 10 || grams > 250) throw new DeviceApiError("Portion must be 10–250 grams.", 400);
    if (this.foodRemainingGrams < grams) throw new DeviceApiError("Not enough food remaining.", 409);
    this.foodRemainingGrams -= grams;
    const requestId = crypto.randomUUID();
    this.history.unshift({ id: Date.now(), grams, timestamp: Math.floor(Date.now() / 1000), source: "manual" });
    this.history = this.history.slice(0, 100);
    return { ok: true, result: "accepted", requestId, grams, foodRemainingGrams: this.foodRemainingGrams };
  }

  async getSchedules() { return this.schedules.map((item) => ({ ...item, days: [...item.days] })); }
  async replaceSchedules(schedules: DeviceSchedule[]) { this.schedules = schedules.map((item) => ({ ...item, days: [...item.days] })); }
  async deleteSchedule(id: string) { this.schedules = this.schedules.filter((item) => item.id !== id); }
}

class HttpDeviceApi implements DeviceApi {
  readonly kind = "http" as const;
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new DeviceApiError("Cannot reach the feeder. Check Wi‑Fi and device address.");
    }
    const text = await response.text();
    let data: unknown = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* handled as a generic API response */ }
    if (!response.ok) {
      const message = data && typeof data === "object" && "result" in data
        ? String((data as { result: unknown }).result).replace(/_/g, " ")
        : `Feeder returned HTTP ${response.status}.`;
      throw new DeviceApiError(message, response.status);
    }
    return data as T;
  }

  async getStatus() {
    return { ...await this.request<Omit<DeviceStatus, "simulation">>("/api/v1/status"), simulation: false };
  }

  async feed(grams: number) {
    return this.request<FeedCommandResult>("/api/v1/feed", {
      method: "POST", headers: { "X-Request-Id": crypto.randomUUID() }, body: JSON.stringify({ grams }),
    });
  }

  async getSchedules() {
    const result = await this.request<{ schedules: Record<string, unknown>[] }>("/api/v1/schedules");
    return result.schedules.map(fromWireSchedule);
  }

  async replaceSchedules(schedules: DeviceSchedule[]) {
    await this.request("/api/v1/schedules", { method: "PUT", body: JSON.stringify({ schedules: schedules.map(toWireSchedule) }) });
  }

  async deleteSchedule(id: string) {
    await this.request(`/api/v1/schedules/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}

const mockApi = new MockDeviceApi();
const configuredUrl = import.meta.env.VITE_PAWSYNC_DEVICE_URL?.trim().replace(/\/+$/, "");
export const deviceApi: DeviceApi = configuredUrl ? new HttpDeviceApi(configuredUrl) : mockApi;

