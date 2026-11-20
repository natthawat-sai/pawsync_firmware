#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace pawsync {

enum class DeviceMode : uint8_t { Booting, Ready, Feeding, Fault, Offline };
enum class FeedResult : uint8_t { Accepted, InvalidAmount, Offline, Jammed, InsufficientFood, Duplicate };

struct Schedule {
  std::string id;
  std::string name;
  uint16_t minuteOfDay{0};
  uint16_t grams{0};
  uint8_t dayMask{0x7f};
  bool enabled{true};
};

struct FeedingEvent {
  uint32_t id{0};
  uint32_t epochSeconds{0};
  uint16_t grams{0};
  bool automatic{false};
};

struct DeviceState {
  DeviceMode mode{DeviceMode::Booting};
  bool wifiConnected{false};
  bool jammed{false};
  uint16_t foodCapacityGrams{5000};
  uint16_t foodRemainingGrams{3900};
  uint16_t defaultPortionGrams{80};
  std::vector<Schedule> schedules;
  std::vector<FeedingEvent> history;
};

class FeederController {
 public:
  explicit FeederController(DeviceState& state);
  void begin();
  FeedResult feed(uint16_t grams, uint32_t epochSeconds, bool automatic = false);
  void setWifiConnected(bool connected);
  void setJammed(bool jammed);
  bool setFoodRemaining(uint16_t grams);
  bool addSchedule(const Schedule& schedule);
  bool removeSchedule(const std::string& id);
  void checkSchedules(uint32_t epochSeconds, uint8_t dayOfWeek, uint16_t minuteOfDay);
  const DeviceState& state() const;

 private:
  DeviceState& state_;
  uint32_t nextEventId_{1};
  uint32_t lastScheduleMinute_{0xffffffffu};
  bool validSchedule(const Schedule& schedule) const;
};

const char* feedResultName(FeedResult result);
const char* modeName(DeviceMode mode);

}  // namespace pawsync
