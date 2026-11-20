#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <uri/UriBraces.h>
#include <algorithm>
#include <cstdlib>

#include "PawSyncCore.h"

namespace {
constexpr char WIFI_SSID[] = "";  // Configure locally; do not commit real credentials.
constexpr char WIFI_PASSWORD[] = "";
constexpr uint8_t STATUS_LED_PIN = 2;
constexpr uint32_t SERIAL_BAUD = 115200;
constexpr uint32_t WIFI_RETRY_MS = 10000;

pawsync::DeviceState device;
pawsync::FeederController feeder(device);
WebServer server(80);
Preferences preferences;
String lastRequestId;
String lastFeedResponse;
uint32_t lastWifiAttempt = 0;

String jsonEscape(const std::string& input) {
  String output;
  for (const char c : input) {
    if (c == '"' || c == '\\') output += '\\';
    if (static_cast<uint8_t>(c) >= 0x20) output += c;
  }
  return output;
}

void handleHealth() {
  server.send(200, "application/json", "{\"ok\":true,\"service\":\"pawsync-feeder\"}");
}

void handleStatus() {
  const float foodPercent = device.foodCapacityGrams
      ? 100.0f * device.foodRemainingGrams / device.foodCapacityGrams : 0.0f;
  String response = "{\"deviceId\":\"pawsync-esp32-001\",\"deviceName\":\"PawSync Feeder\",\"online\":";
  response += device.wifiConnected ? "true" : "false";
  response += ",\"wifiConnected\":";
  response += device.wifiConnected ? "true" : "false";
  response += ",\"jammed\":";
  response += device.jammed ? "true" : "false";
  response += ",\"mode\":\"" + String(pawsync::modeName(device.mode)) + "\"";
  response += ",\"foodRemainingGrams\":" + String(device.foodRemainingGrams);
  response += ",\"foodCapacityGrams\":" + String(device.foodCapacityGrams);
  response += ",\"foodLevelPercent\":" + String(foodPercent, 1);
  response += ",\"schedulesEnabled\":";
  size_t enabledSchedules = 0;
  for (const auto& schedule : device.schedules) if (schedule.enabled) ++enabledSchedules;
  response += String(enabledSchedules);
  response += ",\"lastFeeding\":";
  if (device.history.empty()) response += "null";
  else {
    const auto& event = device.history.back();
    response += "{\"id\":" + String(event.id) + ",\"grams\":" + String(event.grams);
    response += ",\"timestamp\":" + String(event.epochSeconds);
    response += ",\"source\":\"" + String(event.automatic ? "schedule" : "manual") + "\"}";
  }
  response += ",\"recentFeedings\":[";
  const size_t first = device.history.size() > 10 ? device.history.size() - 10 : 0;
  for (size_t i = first; i < device.history.size(); ++i) {
    if (i > first) response += ',';
    const auto& event = device.history[i];
    response += "{\"id\":" + String(event.id) + ",\"grams\":" + String(event.grams);
    response += ",\"timestamp\":" + String(event.epochSeconds);
    response += ",\"source\":\"" + String(event.automatic ? "schedule" : "manual") + "\"}";
  }
  response += "]}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", response);
}

bool parseGrams(const String& body, uint16_t& grams) {
  const int key = body.indexOf("\"grams\"");
  if (key < 0) return false;
  const int colon = body.indexOf(':', key + 7);
  if (colon < 0) return false;
  int start = colon + 1;
  while (start < static_cast<int>(body.length()) && body[start] == ' ') ++start;
  int end = start;
  while (end < static_cast<int>(body.length()) && body[end] >= '0' && body[end] <= '9') ++end;
  if (start == end) return false;
  const long value = body.substring(start, end).toInt();
  if (value < 0 || value > 65535) return false;
  grams = static_cast<uint16_t>(value);
  return true;
}

String requestId() {
  String value = server.header("X-Request-Id");
  if (value.length() == 0) {
    const String body = server.arg("plain");
    const int key = body.indexOf("\"requestId\"");
    if (key >= 0) {
      const int colon = body.indexOf(':', key + 11);
      const int firstQuote = colon >= 0 ? body.indexOf('"', colon + 1) : -1;
      const int lastQuote = firstQuote >= 0 ? body.indexOf('"', firstQuote + 1) : -1;
      if (firstQuote >= 0 && lastQuote > firstQuote) value = body.substring(firstQuote + 1, lastQuote);
    }
  }
  if (value.length() > 40) value.remove(40);
  return value;
}

void handlePreflight() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type,X-Request-Id");
  server.send(204);
}

void handleFeed() {
  uint16_t grams = 0;
  if (!parseGrams(server.arg("plain"), grams)) {
    server.send(400, "application/json", "{\"ok\":false,\"result\":\"invalid_json_or_grams\"}");
    return;
  }
  const String id = requestId();
  if (id.length() > 0 && id == lastRequestId) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", lastFeedResponse);
    return;
  }
  const auto result = feeder.feed(grams, static_cast<uint32_t>(time(nullptr)));
  String response = "{\"ok\":" + String(result == pawsync::FeedResult::Accepted ? "true" : "false");
  response += ",\"result\":\"" + String(pawsync::feedResultName(result)) + "\"";
  response += ",\"requestId\":\"" + id + "\",\"grams\":" + String(grams) + ",\"foodRemainingGrams\":" + String(device.foodRemainingGrams) + "}";
  if (id.length() > 0 && result == pawsync::FeedResult::Accepted) { lastRequestId = id; lastFeedResponse = response; }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(result == pawsync::FeedResult::Accepted ? 200 : 409, "application/json", response);
}

bool parseSchedule(const String& json, pawsync::Schedule& schedule) {
  auto stringField = [&](const char* key, std::string& out) {
    String token = String("\"") + key + "\"";
    int keyAt = json.indexOf(token);
    int colon = keyAt >= 0 ? json.indexOf(':', keyAt + token.length()) : -1;
    int first = colon >= 0 ? json.indexOf('"', colon + 1) : -1;
    int last = first >= 0 ? json.indexOf('"', first + 1) : -1;
    if (first < 0 || last <= first) return false;
    out = json.substring(first + 1, last).c_str();
    return true;
  };
  std::string id, name;
  if (!stringField("id", id) || !stringField("name", name)) return false;
  String timeToken = "\"time\"";
  int timeKey = json.indexOf(timeToken);
  int timeColon = timeKey >= 0 ? json.indexOf(':', timeKey + timeToken.length()) : -1;
  int timeFirst = timeColon >= 0 ? json.indexOf('"', timeColon + 1) : -1;
  int timeLast = timeFirst >= 0 ? json.indexOf('"', timeFirst + 1) : -1;
  if (timeFirst < 0 || timeLast - timeFirst != 6) return false;
  String time = json.substring(timeFirst + 1, timeLast);
  if (time[2] != ':' || !isDigit(time[0]) || !isDigit(time[1]) || !isDigit(time[3]) || !isDigit(time[4])) return false;
  const uint16_t hour = static_cast<uint16_t>(time.substring(0, 2).toInt());
  const uint16_t minute = static_cast<uint16_t>(time.substring(3).toInt());
  if (hour > 23 || minute > 59) return false;

  auto numberField = [&](const char* key, long& out) {
    String token = String("\"") + key + "\"";
    int keyAt = json.indexOf(token);
    int colon = keyAt >= 0 ? json.indexOf(':', keyAt + token.length()) : -1;
    if (colon < 0) return false;
    out = json.substring(colon + 1).toInt();
    return true;
  };
  long grams = 0;
  if (!numberField("grams", grams) || grams < 10 || grams > 250) return false;
  long mask = 0x7f;
  if (!numberField("dayMask", mask) || mask < 1 || mask > 127) return false;
  schedule.id = std::move(id);
  schedule.name = std::move(name);
  schedule.minuteOfDay = static_cast<uint16_t>(hour * 60 + minute);
  schedule.grams = static_cast<uint16_t>(grams);
  schedule.dayMask = static_cast<uint8_t>(mask);
  schedule.enabled = json.indexOf("\"enabled\":false") < 0;
  return true;
}

void handleReplaceSchedules() {
  const String body = server.arg("plain");
  const int arrayAt = body.indexOf("\"schedules\"");
  const int start = arrayAt >= 0 ? body.indexOf('[', arrayAt) : -1;
  const int finish = start >= 0 ? body.indexOf(']', start + 1) : -1;
  if (start < 0 || finish < 0) { server.send(400, "application/json", "{\"error\":\"invalid_schedules\"}"); return; }

  std::vector<pawsync::Schedule> parsed;
  int cursor = start + 1;
  while (cursor < finish) {
    while (cursor < finish && (body[cursor] == ' ' || body[cursor] == ',' || body[cursor] == '\n' || body[cursor] == '\r')) ++cursor;
    if (cursor >= finish) break;
    if (body[cursor] != '{' || parsed.size() >= 32) { server.send(400, "application/json", "{\"error\":\"invalid_schedules\"}"); return; }
    const int objectEnd = body.indexOf('}', cursor + 1);
    if (objectEnd < 0 || objectEnd > finish) { server.send(400, "application/json", "{\"error\":\"invalid_schedules\"}"); return; }
    pawsync::Schedule schedule;
    if (!parseSchedule(body.substring(cursor, objectEnd + 1), schedule)) { server.send(400, "application/json", "{\"error\":\"invalid_schedule\"}"); return; }
    if (std::any_of(parsed.begin(), parsed.end(), [&](const auto& item) { return item.id == schedule.id; })) { server.send(400, "application/json", "{\"error\":\"duplicate_schedule_id\"}"); return; }
    parsed.push_back(std::move(schedule));
    cursor = objectEnd + 1;
  }
  const auto previous = device.schedules;
  device.schedules.clear();
  for (const auto& schedule : parsed) {
    if (!feeder.addSchedule(schedule)) { device.schedules = previous; server.send(400, "application/json", "{\"error\":\"invalid_schedule\"}"); return; }
  }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleSchedules() {
  String response = "{\"schedules\":[";
  for (size_t i = 0; i < device.schedules.size(); ++i) {
    if (i) response += ',';
    const auto& schedule = device.schedules[i];
    char timeText[6];
    snprintf(timeText, sizeof(timeText), "%02u:%02u", schedule.minuteOfDay / 60, schedule.minuteOfDay % 60);
    response += "{\"id\":\"" + jsonEscape(schedule.id) + "\",\"name\":\"" + jsonEscape(schedule.name) + "\"";
    response += ",\"time\":\"" + String(timeText) + "\",\"grams\":" + String(schedule.grams);
    response += ",\"dayMask\":" + String(schedule.dayMask) + ",\"enabled\":" + String(schedule.enabled ? "true" : "false") + "}";
  }
  response += "]}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", response);
}

void handleDeleteSchedule() {
  String id = server.pathArg(0);
  String unescaped;
  for (size_t i = 0; i < id.length(); ++i) {
    if (id[i] == '%' && i + 2 < id.length()) {
      char hex[3] = {id[i + 1], id[i + 2], 0};
      unescaped += static_cast<char>(strtol(hex, nullptr, 16));
      i += 2;
    } else unescaped += id[i];
  }
  if (!feeder.removeSchedule(unescaped.c_str())) { server.send(404, "application/json", "{\"error\":\"schedule_not_found\"}"); return; }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleNotFound() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(404, "application/json", "{\"error\":\"not_found\"}");
}

void restoreSettings() {
  preferences.begin("pawsync", true);
  device.foodRemainingGrams = preferences.getUShort("food_g", device.foodRemainingGrams);
  device.defaultPortionGrams = preferences.getUShort("portion", device.defaultPortionGrams);
  preferences.end();
}

void persistSettings() {
  preferences.begin("pawsync", false);
  preferences.putUShort("food_g", device.foodRemainingGrams);
  preferences.end();
}

void connectWifi() {
  if (WIFI_SSID[0] == 0) { Serial.println("Wi-Fi credentials not configured"); feeder.setWifiConnected(false); return; }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 12000) delay(100);
  feeder.setWifiConnected(WiFi.status() == WL_CONNECTED);
  if (device.wifiConnected) Serial.printf("Wi-Fi connected: %s\n", WiFi.localIP().toString().c_str());
  else Serial.println("Wi-Fi unavailable; local feeding logic remains active");
}

}  // namespace

void setup() {
  Serial.begin(SERIAL_BAUD);
  pinMode(STATUS_LED_PIN, OUTPUT);
  restoreSettings();
  device.wifiConnected = false;
  feeder.begin();
  connectWifi();

  server.on("/health", HTTP_GET, handleHealth);
  server.on("/api/v1/status", HTTP_GET, handleStatus);
  const char* requestHeaders[] = {"X-Request-Id"};
  server.collectHeaders(requestHeaders, 1);
  server.on("/api/v1/schedules", HTTP_GET, handleSchedules);
  server.on("/api/v1/schedules", HTTP_PUT, handleReplaceSchedules);
  server.on("/api/v1/feed", HTTP_POST, handleFeed);
  server.on(UriBraces("/api/v1/schedules/{}"), HTTP_DELETE, handleDeleteSchedule);
  server.on("/health", HTTP_OPTIONS, handlePreflight);
  server.on("/api/v1/status", HTTP_OPTIONS, handlePreflight);
  server.on("/api/v1/feed", HTTP_OPTIONS, handlePreflight);
  server.on("/api/v1/schedules", HTTP_OPTIONS, handlePreflight);
  server.on(UriBraces("/api/v1/schedules/{}"), HTTP_OPTIONS, handlePreflight);
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) { handlePreflight(); return; }
    handleNotFound();
  });
  server.begin();
  Serial.println("PawSync feeder API ready");
}

void loop() {
  server.handleClient();
  if (WIFI_SSID[0] != 0 && WiFi.status() != WL_CONNECTED && millis() - lastWifiAttempt >= WIFI_RETRY_MS) {
    lastWifiAttempt = millis();
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    feeder.setWifiConnected(false);
  } else if (WiFi.status() == WL_CONNECTED && !device.wifiConnected) {
    feeder.setWifiConnected(true);
  }
  digitalWrite(STATUS_LED_PIN, device.mode == pawsync::DeviceMode::Ready ? HIGH : LOW);
  static uint32_t lastPersist = 0;
  if (millis() - lastPersist >= 30000) { persistSettings(); lastPersist = millis(); }
  delay(2);
}








