let specifiedTabId = null; 

// Load the specified tab ID from storage on startup
chrome.storage.local.get("specifiedTabId", (data) => {
  specifiedTabId = data.specifiedTabId || null;
  console.log("Loaded specified tab ID from storage:", specifiedTabId);
});

// Function to save the specified tab ID to storage
function saveSpecifiedTabId(tabId) {
  specifiedTabId = tabId;
  chrome.storage.local.set({ specifiedTabId: tabId }, () => {
    console.log("Saved specified tab ID to storage:", tabId);
  });
}

// Function to manage audio playback
function manageAudio() {
  chrome.tabs.query({}, (tabs) => {
    let otherTabsPlaying = false;

    // Check if any other tab is playing audio
    tabs.forEach((tab) => {
      if (tab.audible && tab.id !== specifiedTabId) {
        otherTabsPlaying = true;
      }
    });

    // Ensure the specified tab is valid and prevent unloading
    if (specifiedTabId) {
      chrome.tabs.get(specifiedTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          console.warn("Specified tab is not accessible, will not clear.");
          return;
        }

        // Prevent the tab from being discarded
        if (tab.discarded) {
          console.log("Reactivating specified tab to prevent unloading.");
          chrome.tabs.update(specifiedTabId, { active: false });
        }

        // Control the audio in the specified tab
        chrome.scripting.executeScript(
          {
            target: { tabId: specifiedTabId },
            func: (shouldPause) => {
              console.log("Script executed inside the specified tab.");
              const media = document.querySelector("video, audio");
              if (media) {
                const isEnded = media.ended;

                if (!isEnded) {
                  shouldPause ? media.pause() : media.play();
                }

                console.log("Media element found:", media);
                console.log(`Current Time: ${media.currentTime}, Duration: ${media.duration}`);
                return { currentTime: media.currentTime, duration: media.duration, paused: media.paused };
              } else {
                console.log("No media element found on this page.");
                return null;
              }
            },
            args: [otherTabsPlaying],
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.error("Error during script execution:", chrome.runtime.lastError.message);
            } else if (results && results[0] && results[0].result) {
              const { paused } = results[0].result;

              // Update the icon based on the paused state
              const newIcon = paused ? "icon3.png" : "icon2.png";
              chrome.action.setIcon({ path: newIcon } );
            }
          }
        );
      });
    }
  });
}

// Periodically ping the specified tab to keep it alive
setInterval(() => {
  if (specifiedTabId) {
    chrome.tabs.get(specifiedTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        console.warn("Specified tab is inaccessible during ping.");
      } else if (tab.discarded) {
        console.log("Reactivating specified tab during ping.");
        chrome.tabs.update(specifiedTabId, { active: false });
      }
    });
  }
}, 30000); // Ping every 30 seconds

// Listen for changes in audible state or discard state of tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.audible !== undefined || // Detect audio state changes
    changeInfo.discarded !== undefined // Detect when a tab is discarded
  ) {
    manageAudio();
  }
});

// Handle user actions for setting and clearing the specified tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "setSpecifiedTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        saveSpecifiedTabId(tabId);
        sendResponse({ success: true, tabId });
      } else {
        sendResponse({ success: false, error: "No active tab found." });
      }
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === "clearSpecifiedTab") {
    saveSpecifiedTabId(null);
    sendResponse({ success: true });
  } else if (message.action === "getSpecifiedTab") {
    if (specifiedTabId) {
      chrome.tabs.get(specifiedTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          console.warn("Specified tab is not accessible.");
          sendResponse({ tab: null });
        } else {
          sendResponse({ tab });
        }
      });
    } else {
      sendResponse({ tab: null });
    }
    return true; // Allow async sendResponse
  }
});
