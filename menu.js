const editorModeToggle = document.getElementById("editorModeToggle");
const status = document.getElementById("status");
const openOptions = document.getElementById("openOptions");
const textColourToggle = document.getElementById("textColourToggle");
const textColourPicker = document.getElementById("textColourPicker");
const textColourValue = document.getElementById("textColourValue");
const navbarColourToggle = document.getElementById("navbarColourToggle");
const navbarColourPicker = document.getElementById("navbarColourPicker");
const navbarColourValue = document.getElementById("navbarColourValue");
const backgroundBlur = document.getElementById("backgroundBlur");
const blurValue = document.getElementById("blurValue");
const pageZoom = document.getElementById("pageZoom");
const pageZoomToggle = document.getElementById("pageZoomToggle");
const zoomValue = document.getElementById("zoomValue");
const subjectRuleList = document.getElementById("subjectRuleList");
const addRuleButton = document.getElementById("addRule");
const saveRulesButton = document.getElementById("saveRules");
const rulesStatus = document.getElementById("rulesStatus");

function updateStatus(enabled) {
    status.textContent = enabled
        ? "Editor mode is enabled. Hover sliders will appear."
        : "Editor mode is disabled. Timetable colours remain but editing is off.";
}

function createRuleRow(rule = {}) {
    const row = document.createElement("div");
    row.className = "subject-rule-row";

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Keyword or phrase";
    textInput.value = rule.pattern || "";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = rule.color || "#ff8c00";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => row.remove());

    row.appendChild(textInput);
    row.appendChild(colorInput);
    row.appendChild(removeButton);
    return row;
}

function addRuleRow(rule = {}) {
    if (!subjectRuleList) return;
    subjectRuleList.appendChild(createRuleRow(rule));
}

function loadRuleRows(rules = []) {
    if (!Array.isArray(rules) || !subjectRuleList) return;
    subjectRuleList.innerHTML = "";
    if (rules.length === 0) {
        addRuleRow();
        return;
    }
    rules.forEach(rule => addRuleRow(rule));
}

function saveRuleRows() {
    if (!subjectRuleList) return;
    const rows = Array.from(subjectRuleList.querySelectorAll(".subject-rule-row"));
    const subjectColorRules = [];

    rows.forEach(row => {
        const textInput = row.querySelector("input[type='text']");
        const colorInput = row.querySelector("input[type='color']");
        if (!textInput || !colorInput) return;

        const pattern = textInput.value.trim();
        const color = colorInput.value;
        if (pattern) {
            subjectColorRules.push({ pattern, color });
        }
    });

    chrome.storage.sync.set({ subjectColorRules }, () => {
        rulesStatus.textContent = "Rule set saved.";
        setTimeout(() => {
            rulesStatus.textContent = "";
        }, 1800);
    });
}

function loadSavedRules() {
    chrome.storage.sync.get(["subjectColorRules"], (data) => {
        loadRuleRows(data.subjectColorRules || []);
    });
}

function updateBlurValue(value) {
    blurValue.textContent = `${value}px`;
}

function updateZoomValue(value) {
    zoomValue.textContent = `${value}%`;
}

function isCompassTab(tab) {
    return tab && typeof tab.url === "string" && tab.url.includes("compass.education");
}

function getTabOrigin(tab) {
    try {
        return new URL(tab.url).origin;
    } catch {
        return null;
    }
}

function getActiveCompassTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        callback(isCompassTab(tab) && tab.id ? tab : null);
    });
}

function applyBrowserZoom(value, callback) {
    getActiveCompassTab((tab) => {
        if (!tab) {
            callback?.();
            return;
        }

        chrome.tabs.setZoom(tab.id, Number(value) / 100, callback);
    });
}

function setPageZoomEnabled(enabled) {
    pageZoomToggle.checked = enabled;
    pageZoom.disabled = !enabled;
}

function restoreSavedBrowserZoom(callback) {
    getActiveCompassTab((tab) => {
        if (!tab) {
            callback?.();
            return;
        }

        const origin = getTabOrigin(tab);
        chrome.storage.local.get(["pageZoomUserPreferences"], (settings) => {
            const preferences = settings.pageZoomUserPreferences || {};
            const preference = origin ? preferences[origin] : undefined;
            if (typeof preference !== "number") {
                chrome.tabs.getZoomSettings(tab.id, (zoomSettings) => {
                    const defaultZoom = Number(zoomSettings?.defaultZoomFactor);
                    if (defaultZoom > 0) {
                        chrome.tabs.setZoom(tab.id, defaultZoom, callback);
                    } else {
                        callback?.();
                    }
                });
                return;
            }

            chrome.tabs.setZoom(tab.id, preference, callback);
        });
    });
}

function captureBrowserZoomPreference(tab, callback) {
    const origin = getTabOrigin(tab);
    if (!origin) {
        callback?.();
        return;
    }

    chrome.storage.local.get(["pageZoomUserPreferences"], (settings) => {
        const preferences = settings.pageZoomUserPreferences || {};
        if (typeof preferences[origin] === "number") {
            callback?.();
            return;
        }

        chrome.tabs.getZoomSettings(tab.id, (zoomSettings) => {
            const defaultZoom = Number(zoomSettings?.defaultZoomFactor);
            if (!(defaultZoom > 0)) {
                callback?.();
                return;
            }

            preferences[origin] = defaultZoom;
            chrome.storage.local.set({ pageZoomUserPreferences: preferences }, callback);
        });
    });
}

function loadBrowserZoom(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!isCompassTab(tab) || !tab.id) {
            callback(null);
            return;
        }

        chrome.tabs.getZoom(tab.id, (zoomFactor) => {
            callback(Math.round(zoomFactor * 100));
        });
    });
}

function updateTextColourValue(value) {
    if (!textColourValue) return;
    textColourValue.textContent = value || "#000000";
}

function updateNavbarColourValue(value) {
    if (!navbarColourValue) return;
    navbarColourValue.textContent = value || "#000000";
}

chrome.storage.sync.get(["editorModeEnabled"], (settings) => {
    const enabled = settings.editorModeEnabled !== false;
    editorModeToggle.checked = enabled;
    updateStatus(enabled);
});

chrome.storage.local.get([
    "backgroundBlur",
    "customTextColourEnabled",
    "customTextColour",
    "customNavbarColourEnabled",
    "customNavbarColour",
    "pageZoom",
    "pageZoomEnabled"
], (settings) => {
    const blur = Number(settings.backgroundBlur) || 0;
    backgroundBlur.value = blur;
    updateBlurValue(blur);

    const zoom = Number(settings.pageZoom) || 100;
    pageZoom.value = zoom;
    updateZoomValue(zoom);
    setPageZoomEnabled(settings.pageZoomEnabled !== false);
    loadBrowserZoom((activeTabZoom) => {
        if (activeTabZoom === null) return;
        pageZoom.value = activeTabZoom;
        updateZoomValue(activeTabZoom);
    });

    const textEnabled = settings.customTextColourEnabled === true;
    const textColour = settings.customTextColour || "#000000";
    if (textColourToggle) {
        textColourToggle.checked = textEnabled;
    }
    if (textColourPicker) {
        textColourPicker.value = textColour;
    }
    updateTextColourValue(textColour);

    const navbarEnabled = settings.customNavbarColourEnabled === true;
    const navbarColour = settings.customNavbarColour || "#000000";
    if (navbarColourToggle) {
        navbarColourToggle.checked = navbarEnabled;
    }
    if (navbarColourPicker) {
        navbarColourPicker.value = navbarColour;
    }
    updateNavbarColourValue(navbarColour);
});

editorModeToggle.addEventListener("change", () => {
    const enabled = editorModeToggle.checked;
    chrome.storage.sync.set({ editorModeEnabled: enabled }, () => {
        updateStatus(enabled);
    });
});

if (textColourToggle) {
    textColourToggle.addEventListener("change", () => {
        chrome.storage.local.set({ customTextColourEnabled: textColourToggle.checked });
    });
}

if (textColourPicker) {
    textColourPicker.addEventListener("input", () => {
        const value = textColourPicker.value || "#000000";
        updateTextColourValue(value);
        chrome.storage.local.set({ customTextColour: value });
    });
}

if (navbarColourToggle) {
    navbarColourToggle.addEventListener("change", () => {
        chrome.storage.local.set({ customNavbarColourEnabled: navbarColourToggle.checked });
    });
}

if (navbarColourPicker) {
    navbarColourPicker.addEventListener("input", () => {
        const value = navbarColourPicker.value || "#000000";
        updateNavbarColourValue(value);
        chrome.storage.local.set({ customNavbarColour: value });
    });
}

backgroundBlur.addEventListener("input", () => {
    const value = Number(backgroundBlur.value) || 0;
    updateBlurValue(value);
    chrome.storage.local.set({ backgroundBlur: value });
});

pageZoom.addEventListener("input", () => {
    const value = Number(pageZoom.value) || 100;
    updateZoomValue(value);
    chrome.storage.local.set({ pageZoom: value });
    applyBrowserZoom(value);
});

pageZoomToggle.addEventListener("change", () => {
    const enabled = pageZoomToggle.checked;
    setPageZoomEnabled(enabled);

    if (!enabled) {
        chrome.storage.local.set({ pageZoomEnabled: false }, () => {
            restoreSavedBrowserZoom();
        });
        return;
    }

    getActiveCompassTab((tab) => {
        const applyZoom = () => {
            chrome.storage.local.set({ pageZoomEnabled: true }, () => {
                applyBrowserZoom(Number(pageZoom.value) || 100);
            });
        };

        if (!tab) {
            applyZoom();
            return;
        }

        captureBrowserZoomPreference(tab, applyZoom);
    });
});

if (addRuleButton) {
    addRuleButton.addEventListener("click", () => addRuleRow());
}

if (saveRulesButton) {
    saveRulesButton.addEventListener("click", saveRuleRows);
}

openOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

loadSavedRules();
