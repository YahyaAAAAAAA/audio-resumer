function updateControlledTabName() {
  chrome.runtime.sendMessage({ action: "getSpecifiedTab" }, (response) => {
    const controlledTabName = document.getElementById("controlledTabName");
    const goToTabButton = document.getElementById("goToTab");

    if (response && response.tab) {
      const fullTitle = response.tab.title || "Untitled Tab";
      controlledTabName.textContent = fullTitle;
      controlledTabName.title = fullTitle;

      // Enable the "Go to Tab" button
      goToTabButton.disabled = false;
      goToTabButton.dataset.tabId = response.tab.id; // Store the tab ID for navigation
    } else {
      controlledTabName.textContent = "None";
      controlledTabName.title = "";
      goToTabButton.disabled = true; // Disable the button if no tab is controlled
      goToTabButton.dataset.tabId = null;
    }
  });
}

// Show an alert describing the extension
document.getElementById("describeExtension").addEventListener("click", () => {
    alert(
      "Set a tab to your liking, this tab will play it's audio as long as no other tab is playing an audio. "
    );
  });
  
  // Open GitHub link in a new tab
  document.getElementById("linkGithub").addEventListener("click", () => {
    const githubUrl = "https://github.com/YahyaAAAAAAA"; 
    chrome.tabs.create({ url: githubUrl });
  });
  

// Navigate to the controlled tab
document.getElementById("goToTab").addEventListener("click", () => {
  const tabId = parseInt(document.getElementById("goToTab").dataset.tabId, 10);
  if (tabId) {
    chrome.tabs.update(tabId, { active: true }, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        console.error("Failed to navigate to the controlled tab.");
      } else {
        console.log("Navigated to controlled tab:", tab);
      }
    });
  }
});

// Set the current tab as the controlled tab
document.getElementById("setTab").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "setSpecifiedTab" }, (response) => {
    if (response && response.success) {
      console.log(`Controlled tab set to ID: ${response.tabId}`);
    } else {
      console.error(`Failed to set controlled tab: ${response.error}`);
    }
    updateControlledTabName();
  });
});

// Clear the controlled tab
document.getElementById("clearTab").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "clearSpecifiedTab" }, () => {
    console.log("Controlled tab cleared.");
    updateControlledTabName();
  });
});

// Initialize the popup
document.addEventListener("DOMContentLoaded", updateControlledTabName);
