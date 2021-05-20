import browser from "webextension-polyfill";
import { ProcrastinationWarning } from "./content/ProcrastinationWarning";
import { LearningContent } from "./content/LearningContent";
import { ContentBlocker } from "./content/ContentBlocker";

const l = console.log;

/* Listener for messages from background script. */
browser.runtime.onMessage.addListener((request) => {
  if (request.action === "display: snooze") {
    return renderProcrastinationContent(request.url);
  } else if (request.action === "display: encouragement") {
    return renderLearningContent(request.shouldShowWelcome);
  } else if (request.action === "kill aiki") {
    removeOverlay();
    return new Promise((resolve) => {
      timer.stop();
      resolve({ action: "end injection" });
    });
  } else if (request.action === "inject blocker") {
    console.log("Request: ", request);
    l("Render blocking function should fire now");
    renderContentBlocker();
  } else if (request.action === "remove blocker") {
    removeOverlay();
  }
});

/* This object contains countdown functionality including 
  functions to hasten and slow the countdown progress.
  If it reaches zero, it will initial redirection and change window
  location to a learning site URL as recieved from background script 
  It is passed to the svelte content function app */
let timer = {
  time: 5000,
  interval: undefined,
  slowed: false,
  start: function (resolve, url) {
    timer.interval = setInterval(() => {
      if (timer.slowed) {
        timer.time -= 20;
      } else {
        timer.time -= 100;
      }
      if (timer.time <= 0) {
        timer.stop();
        resolve({ msg: "Auto resolve", snooze: false });
        location.href = url;
      }
    }, 100);
  },
  stop: function () {
    if (timer.interval) clearInterval(timer.interval);
    timer.interval = undefined;
    timer.time = 5000;
    removeOverlay();
  },
};

/**
 * @function
 * @description Removes the aiki interception overlay
 * by searching for DOM elements with the name "aiki-overlay" and calling remove() on it/them.  */
function removeOverlay() {
  l("Removing aiki-overlay");
  try {
    const element = document.getElementById("aiki-overlay");
    l("Element: ", element);
    if (element) {
      element.remove();
    }
    const elements = document.getElementsByClassName("aiki-overlay");
    l("Elements: ", elements);
    if (elements.length > 0) {
      for (let i = 0; elements.length; i++) {
        elements[i].remove();
      }
    }
  } catch (error) {
    // console.log(error);
  }
}

function renderProcrastinationContent(url) {
  return new Promise((resolve) => {
    /**
     * @function
     * @description removes the interception pre-redirection step entirely.
     * Timers are stopped, and a message is returned to background script with "removeWarning = true".
     * This function is called by the injected svelte content, and therefore passed to the app function.
     * Lastly the location of this window will be changed to the learning resource URL as recieved from the background script.*/
    function snooze() {
      timer.stop();
      timer.time = 5000;
      resolve({ action: "snooze" });
      removeOverlay();
    }

    ProcrastinationWarning(snooze, timer, browser, resolve, url);
  });
}

function renderLearningContent(shouldShowWelcome) {
  return new Promise((resolve) => {
    // addCloseListener();
    function gotoOrigin(source) {
      // removeCloseListener();
      clearInterval(intervalRef);
      resolve({
        action: "continue",
        source: source,
        uri: location.href,
      });
    }

    function endInjection() {
      clearInterval(intervalRef);
      resolve({ action: "end injection" });
    }

    let port = browser.extension.connect({
      name: "Content Communication",
    });
    port.onMessage.addListener(function (msg) {
      sync(msg);
    });

    async function sync(msg) {
      if (msg.learningTimeRemaining <= 0) {
        isReady = true;
      }
    }
    let isReady = false;

    let intervalRef = setInterval(() => {
      port.postMessage("get: timer");
    }, 1000);

    function getReady() {
      return isReady;
    }

    LearningContent(
      shouldShowWelcome,
      gotoOrigin,
      endInjection,
      browser,
      getReady
    );
  });
}

function renderContentBlocker() {
  removeOverlay();
    let port = browser.extension.connect({
      name: "Content Communication",
    });
    l("Injecting blocker");
    function gotoOriginTab() {
      port.postMessage("goto: originTab");
    }
    ContentBlocker(gotoOriginTab, browser);
}
