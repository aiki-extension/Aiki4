import storage from "./util/storage";
import browser from "webextension-polyfill";
import badge from "./badge";
import { parseTimerDown } from "./util/utilities";

let learningTimeRemaining = 0;
let learningTimeIntervalRef;

async function decrementLearningTime() {
  if (await checkActive()) {
    if (learningTimeRemaining > 0) {
      learningTimeRemaining -= 1000;
      badge.setText(parseTimerDown(learningTimeRemaining));
    } else if (learningTimeRemaining < 0) {
      learningTimeRemaining = 0;
    } else {
      startBonusTime();
    }
  }
}

async function startLearningSession() {
  if (bonusTimeIntervalRef) stopBonusTime();
  if (learningTimeIntervalRef) clearInterval(learningTimeIntervalRef);
  badge.setBusy();
  learningTimeRemaining = await storage.timeSettings.learningTime.get();
  badge.setText(parseTimerDown(learningTimeRemaining));
  learningTimeIntervalRef = setInterval(decrementLearningTime, 1000);
}

function stopLearningSession() {
  clearInterval(learningTimeIntervalRef);
  learningTimeIntervalRef = undefined;
  learningTimeRemaining = 0;
  badge.remove();
}

let rewardTimeRemaining = 0;
let rewardTimeIntervalRef;

async function decrementRewardTime(callback) {
  if (rewardTimeRemaining > 0) {
    rewardTimeRemaining -= 1000;
  } else if (rewardTimeRemaining < 0) {
    rewardTimeRemaining = 0;
  } else {
    stopProcrastinationSession(callback);
  }
}

async function startProcrastinationSession(callback, rewardTime) {
  stopLearningSession();
  stopBonusTime();
  bonusTime = 0;
  rewardTimeRemaining = rewardTime;
  rewardTimeIntervalRef = setInterval(
    () => decrementRewardTime(callback),
    1000
  );
}

function stopProcrastinationSession(callback) {
  clearInterval(rewardTimeIntervalRef);
  rewardTimeIntervalRef = undefined;
  storage.shouldRedirect.set(true);
  callback();
}

let bonusTime = 0;
let bonusTimeIntervalRef;

async function incrementBonusTime() {
  if (await checkActive()) {
    if (bonusTime >= 0) {
      bonusTime += 1000;
    } else {
      bonusTime = 0;
    }
  }
}

function startBonusTime() {
  if (bonusTimeIntervalRef) stopBonusTime();
  badge.setDone();
  badge.setText("Done");
  clearInterval(learningTimeIntervalRef);
  learningTimeIntervalRef = undefined;
  bonusTimeIntervalRef = setInterval(incrementBonusTime, 1000);
}

function stopBonusTime() {
  clearInterval(bonusTimeIntervalRef);
  bonusTimeIntervalRef = undefined;
}

async function checkActive() {
  const window = await browser.windows.getCurrent();
  const views = chrome.extension.getViews({ type: "popup" });
  if (window.focused || views.length > 0) {
    const currentTabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (currentTabs.length > 0) {
      const current = currentTabs[0];
      const origin = await storage.origin.get();
      return current.id === origin?.tabId;
    }
  } else {
    return false;
  }
}

function killAiki() {
  clearInterval(rewardTimeIntervalRef);
  rewardTimeIntervalRef = undefined;
  stopBonusTime();
  storage.shouldRedirect.set(true);
  rewardTimeRemaining = 0;
  bonusTime = 0;
  learningTimeRemaining = 0;
}

function getTime() {
  return {
    bonusTime: bonusTime,
    learningTimeRemaining: learningTimeRemaining,
    rewardTimeRemaining: rewardTimeRemaining,
  };
}

export default {
  startLearningSession,
  stopLearningSession,
  startProcrastinationSession,
  stopProcrastinationSession,
  stopBonusTime,
  getTime,
  killAiki,
};
