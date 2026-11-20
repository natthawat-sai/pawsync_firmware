#include "PawSyncCore.h"

#include <cassert>
#include <iostream>

int main() {
  pawsync::DeviceState state;
  state.wifiConnected = true;
  pawsync::FeederController feeder(state);
  feeder.begin();
  assert(state.mode == pawsync::DeviceMode::Ready);
  assert(feeder.feed(80, 1000) == pawsync::FeedResult::Accepted);
  assert(state.foodRemainingGrams == 3820);
  assert(state.history.size() == 1 && !state.history.back().automatic);
  assert(feeder.feed(9, 1001) == pawsync::FeedResult::InvalidAmount);
  assert(feeder.feed(251, 1001) == pawsync::FeedResult::InvalidAmount);
  feeder.setWifiConnected(false);
  assert(feeder.feed(80, 1002) == pawsync::FeedResult::Offline);
  assert(feeder.feed(80, 1003, true) == pawsync::FeedResult::Accepted);
  feeder.setJammed(true);
  assert(feeder.feed(80, 1004, true) == pawsync::FeedResult::Jammed);
  feeder.setJammed(false);
  feeder.setFoodRemaining(20);
  assert(feeder.feed(80, 1005, true) == pawsync::FeedResult::InsufficientFood);
  assert(feeder.addSchedule({"breakfast", "Breakfast", 450, 80, 0x7f, true}));
  assert(!feeder.addSchedule({"invalid", "Invalid", 1440, 80, 0x7f, true}));
  feeder.setFoodRemaining(500);
  feeder.checkSchedules(9 * 3600 + 30 * 60, 0, 450);
  assert(state.history.size() == 3 && state.history.back().automatic);
  feeder.checkSchedules(9 * 3600 + 30 * 60, 0, 450);
  assert(state.history.size() == 3);
  std::cout << "PawSync core checks passed\n";
}
