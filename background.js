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

function applySavedCompassZoom(tabId, url) {
    if (!tabId || typeof url !== "string" || !url.includes("compass.education")) return;

    let origin;
    try {
        origin = new URL(url).origin;
    } catch {
        return;
    }

    chrome.storage.local.get(["pageZoom", "pageZoomEnabled", "pageZoomUserPreferences"], (settings) => {
        if (settings.pageZoomEnabled === false) {
            const preferences = settings.pageZoomUserPreferences || {};
            const preference = preferences[origin];
            if (typeof preference === "number") {
                chrome.tabs.setZoom(tabId, preference);
            } else {
                chrome.tabs.getZoomSettings(tabId, (zoomSettings) => {
                    const defaultZoom = Number(zoomSettings?.defaultZoomFactor);
                    if (defaultZoom > 0) {
                        chrome.tabs.setZoom(tabId, defaultZoom);
                    }
                });
            }
            return;
        }
        if (settings.pageZoom === undefined) return;
        const zoom = Number(settings.pageZoom) || 100;
        chrome.tabs.setZoom(tabId, zoom / 100);
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        applySavedCompassZoom(tabId, tab.url);
    }
});

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
