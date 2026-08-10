function findCompassTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
        if (activeTab && typeof activeTab.url === "string" && activeTab.url.includes("compass.education")) {
            callback(activeTab);
            return;
        }

        chrome.tabs.query({ url: "https://*.compass.education/*" }, (allTabs) => {
            callback(Array.isArray(allTabs) && allTabs.length ? allTabs[0] : null);
        });
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "openOptions") {
        chrome.runtime.openOptionsPage();
        return;
    }

    if (msg.action === "getSubjects") {
        findCompassTab((tab) => {
            if (!tab || !tab.id) {
                sendResponse({ subjects: [] });
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: "getSubjectsFromPage" }, (response) => {
                sendResponse(response || { subjects: [] });
            });
        });

        return true;
    }
});
