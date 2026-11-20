#include "PawSyncCore.h"

#include <algorithm>
#include <utility>

namespace pawsync {

FeederController::FeederController(DeviceState& state) : state_(state) {}

void FeederController::begin() {
  state_.mode = state_.wifiConnected ? DeviceMode::Ready : DeviceMode::Offline;
}

FeedResult FeederController::feed(uint16_t grams, uint32_t epochSeconds, bool automatic) {
  if (grams < 10 || grams > 250) return FeedResult::InvalidAmount;
  if (!state_.wifiConnected && !automatic) return FeedResult::Offline;
  if (state_.jammed) {
    state_.mode = DeviceMode::Fault;
    return FeedResult::Jammed;
  }
  if (state_.foodRemainingGrams < grams) return FeedResult::InsufficientFood;

  state_.mode = DeviceMode::Feeding;
  // TODO(hardware): run the motor with a bounded timeout and detect a stall.
  state_.foodRemainingGrams = static_cast<uint16_t>(state_.foodRemainingGrams - grams);
  state_.history.push_back({nextEventId_++, epochSeconds, grams, automatic});
  if (state_.history.size() > 100) state_.history.erase(state_.history.begin());
  state_.mode = state_.wifiConnected ? DeviceMode::Ready : DeviceMode::Offline;
  return FeedResult::Accepted;
}

void FeederController::setWifiConnected(bool connected) {
  state_.wifiConnected = connected;
  if (!state_.jammed && state_.mode != DeviceMode::Feeding) {
    state_.mode = connected ? DeviceMode::Ready : DeviceMode::Offline;
  }
}

void FeederController::setJammed(bool jammed) {
  state_.jammed = jammed;
  if (jammed) state_.mode = DeviceMode::Fault;
  else state_.mode = state_.wifiConnected ? DeviceMode::Ready : DeviceMode::Offline;
}

bool FeederController::setFoodRemaining(uint16_t grams) {
  if (grams > state_.foodCapacityGrams) return false;
  state_.foodRemainingGrams = grams;
  return true;
}

bool FeederController::validSchedule(const Schedule& schedule) const {
  if (schedule.id.empty() || schedule.minuteOfDay >= 1440 || schedule.grams < 10 || schedule.grams > 250 || schedule.dayMask == 0) return false;
  return (schedule.dayMask & 0x80) == 0;
}

bool FeederController::addSchedule(const Schedule& schedule) {
  if (!validSchedule(schedule)) return false;
  const auto found = std::find_if(state_.schedules.begin(), state_.schedules.end(), [&](const Schedule& current) { return current.id == schedule.id; });
  if (found != state_.schedules.end()) *found = schedule;
  else if (state_.schedules.size() < 32) state_.schedules.push_back(schedule);
  else return false;
  return true;
}

bool FeederController::removeSchedule(const std::string& id) {
  const auto oldSize = state_.schedules.size();
  state_.schedules.erase(std::remove_if(state_.schedules.begin(), state_.schedules.end(), [&](const Schedule& s) { return s.id == id; }), state_.schedules.end());
  return oldSize != state_.schedules.size();
}

void FeederController::checkSchedules(uint32_t epochSeconds, uint8_t dayOfWeek, uint16_t minuteOfDay) {
  const uint32_t minuteKey = epochSeconds / 60;
  if (minuteKey == lastScheduleMinute_ || dayOfWeek > 6 || minuteOfDay >= 1440) return;
  lastScheduleMinute_ = minuteKey;
  for (const auto& schedule : state_.schedules) {
    if (schedule.enabled && schedule.minuteOfDay == minuteOfDay && (schedule.dayMask & (1u << dayOfWeek))) {
      const auto result = feed(schedule.grams, epochSeconds, true);
      if (result != FeedResult::Accepted) state_.history.push_back({nextEventId_++, epochSeconds, schedule.grams, true});
    }
  }
}

const DeviceState& FeederController::state() const { return state_; }

const char* feedResultName(FeedResult result) {
  switch (result) {
    case FeedResult::Accepted: return "accepted";
    case FeedResult::InvalidAmount: return "invalid_amount";
    case FeedResult::Offline: return "offline";
    case FeedResult::Jammed: return "jammed";
    case FeedResult::InsufficientFood: return "insufficient_food";
    case FeedResult::Duplicate: return "duplicate";
  }
  return "unknown";
}

const char* modeName(DeviceMode mode) {
  switch (mode) {
    case DeviceMode::Booting: return "booting";
    case DeviceMode::Ready: return "ready";
    case DeviceMode::Feeding: return "feeding";
    case DeviceMode::Fault: return "fault";
    case DeviceMode::Offline: return "offline";
  }
  return "unknown";
}

}  // namespace pawsync




