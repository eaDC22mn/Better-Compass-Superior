

let pendingBackgroundImage = "";

const backgroundPresets = [
    { label: "Theater", path: "backgrounds/campus.jpg" },
    { label: "Sunset", path: "backgrounds/sunset.jpg" },
    { label: "Forest", path: "backgrounds/forest.jpg" },
    { label: "Ocean", path: "backgrounds/ocean.jpg" },
    { label: "City", path: "backgrounds/city.jpg" },
    { label: "Industrial", path: "backgrounds/industry.jpg" },
    { label: "Galaxy", path: "backgrounds/galaxy.jpg" }
];

const backgroundPresetsContainer = document.getElementById("backgroundPresets");
const websiteShortcutsContainer = document.getElementById("websiteShortcuts");
const addWebsiteShortcutButton = document.getElementById("addWebsiteShortcut");
const websiteShortcutsStatus = document.getElementById("websiteShortcutsStatus");

function renderBackgroundPresets() {
    if (!backgroundPresetsContainer) return;

    backgroundPresets.forEach((preset) => {
        const url = chrome.runtime.getURL(preset.path);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "background-preset";
        button.dataset.backgroundUrl = url;
        button.title = `Use ${preset.label} background`;

        const image = document.createElement("img");
        image.src = url;
        image.alt = preset.label;

        const label = document.createElement("span");
        label.textContent = preset.label;

        button.appendChild(image);
        button.appendChild(label);
        button.addEventListener("click", () => selectBackground(url));
        backgroundPresetsContainer.appendChild(button);
    });
}

function selectBackground(url) {
    pendingBackgroundImage = url;
    document.getElementById("backgroundImage").value = "";
    document.getElementById("backgroundFile").value = "";
    updatePreview(url);
    saveSettings();
}

renderBackgroundPresets();

chrome.storage.sync.get(["theme", "colorPickerEnabled"], (settings) => {
    if (settings.theme) {
        document.getElementById("themeSelect").value = settings.theme;
    }

    const disableToggle = document.getElementById("disableTimetableColourPicker");
    if (disableToggle) {
        disableToggle.checked = settings.colorPickerEnabled === false;
    }
});

chrome.storage.local.get(["backgroundImage"], (localSettings) => {
    if (localSettings.backgroundImage) {
        pendingBackgroundImage = localSettings.backgroundImage;
        const input = document.getElementById("backgroundImage");
        input.value = localSettings.backgroundImage;
        updatePreview(localSettings.backgroundImage);
    }
});

function createWebsiteShortcutRow(shortcut = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "website-shortcut-row";

    const url = document.createElement("input");
    url.type = "url";
    url.className = "website-shortcut-url";
    url.placeholder = "https://example.com";
    url.value = shortcut.url || "";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "website-shortcut-remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
        wrapper.remove();
           saveWebsiteShortcuts();
    });

    url.addEventListener("input", saveWebsiteShortcuts);
    wrapper.append(url, remove);
    return wrapper;
}

function addWebsiteShortcut(shortcut = {}) {
    if (websiteShortcutsContainer) {
        websiteShortcutsContainer.appendChild(createWebsiteShortcutRow(shortcut));
    }
}

function loadWebsiteShortcuts(shortcuts = []) {
    if (!websiteShortcutsContainer) return;
    websiteShortcutsContainer.innerHTML = "";
    shortcuts.forEach(addWebsiteShortcut);
}

chrome.storage.local.get(["websiteShortcuts"], (settings) => {
    if (Array.isArray(settings.websiteShortcuts) && settings.websiteShortcuts.length > 0) {
        loadWebsiteShortcuts(settings.websiteShortcuts);
        return;
    }

    chrome.storage.sync.get(["websiteShortcuts"], (syncSettings) => {
        const shortcuts = Array.isArray(syncSettings.websiteShortcuts) ? syncSettings.websiteShortcuts : [];
        loadWebsiteShortcuts(shortcuts);
        if (shortcuts.length > 0) {
            chrome.storage.local.set({ websiteShortcuts: shortcuts });
        }
    });
});

if (addWebsiteShortcutButton) {
    addWebsiteShortcutButton.addEventListener("click", () => {
        addWebsiteShortcut();
        saveWebsiteShortcuts();
    });
}

const subjectPatternRulesContainer = document.getElementById("subjectPatternRules");
const addSubjectPatternRuleButton = document.getElementById("addSubjectPatternRule");
let saveTimer;

function createSubjectRuleRow(rule = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "subject-pattern-rule";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";
    wrapper.style.marginBottom = "10px";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Keyword or phrase";
    input.value = rule.pattern || "";
    input.className = "subject-rule-input";
    input.style.flex = "1";
    input.style.padding = "6px";

    const color = document.createElement("input");
    color.type = "color";
    color.value = rule.color || "#ff8c00";
    color.className = "subject-rule-color";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.style.padding = "6px 10px";
    remove.addEventListener("click", () => {
        wrapper.remove();
        saveSettings();
    });

    input.addEventListener("input", scheduleSaveSettings);
    color.addEventListener("input", scheduleSaveSettings);

    wrapper.appendChild(input);
    wrapper.appendChild(color);
    wrapper.appendChild(remove);
    return wrapper;
}

function addSubjectPatternRule(rule = {}) {
    if (!subjectPatternRulesContainer) return;
    const row = createSubjectRuleRow(rule);
    subjectPatternRulesContainer.appendChild(row);
}

function loadSubjectPatternRules(rules = []) {
    if (!Array.isArray(rules) || !subjectPatternRulesContainer) return;
    subjectPatternRulesContainer.innerHTML = "";
    if (rules.length === 0) {
        addSubjectPatternRule();
        return;
    }
    rules.forEach(rule => addSubjectPatternRule(rule));
}

chrome.storage.sync.get(["subjectColorRules"], (data) => {
    const subjectColorRules = data.subjectColorRules || [];
    loadSubjectPatternRules(subjectColorRules);
});

if (addSubjectPatternRuleButton) {
    addSubjectPatternRuleButton.addEventListener("click", () => {
        addSubjectPatternRule();
        saveSettings();
    });
}

function getSettingsPayload() {
    const theme = document.getElementById("themeSelect").value;
    const urlValue = document.getElementById("backgroundImage").value.trim();
    const disableTimetableColourPicker = document.getElementById("disableTimetableColourPicker").checked;

    const ruleRows = document.querySelectorAll("#subjectPatternRules .subject-pattern-rule");
    const subjectColorRules = [];
    ruleRows.forEach(row => {
        const patternInput = row.querySelector(".subject-rule-input");
        const colorInput = row.querySelector(".subject-rule-color");
        if (!patternInput || !colorInput) return;

        const pattern = patternInput.value.trim();
        const colorValue = colorInput.value;
        if (pattern && colorValue) {
            subjectColorRules.push({ pattern, color: colorValue });
        }
    });

    return {
        sync: {
            theme,
            subjectColorRules,
            colorPickerEnabled: !disableTimetableColourPicker
        },
        backgroundImage: pendingBackgroundImage || urlValue
    };
}

function getWebsiteShortcuts() {
    const shortcutRows = document.querySelectorAll("#websiteShortcuts .website-shortcut-row");
    const websiteShortcuts = [];
    shortcutRows.forEach(row => {
        const urlInput = row.querySelector(".website-shortcut-url");
        if (!urlInput) return;

        const url = urlInput.value.trim();
        if (url) websiteShortcuts.push({ url });
    });
    return websiteShortcuts;
}

function saveWebsiteShortcuts() {
    const shortcuts = getWebsiteShortcuts();
    chrome.storage.local.set({ websiteShortcuts: shortcuts }, () => {
        if (websiteShortcutsStatus) {
            websiteShortcutsStatus.textContent = chrome.runtime.lastError
                ? `Shortcut save failed: ${chrome.runtime.lastError.message}`
                : "Shortcuts saved";
        }
    });
}

function saveSettings() {
    const payload = getSettingsPayload();

    chrome.storage.sync.set(payload.sync);
    if (payload.backgroundImage) {
        chrome.storage.local.set({ backgroundImage: payload.backgroundImage });
    } else {
        chrome.storage.local.remove("backgroundImage");
    }
}

function scheduleSaveSettings() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveSettings(), 200);
}

document.getElementById("themeSelect").addEventListener("change", saveSettings);
document.getElementById("disableTimetableColourPicker").addEventListener("change", saveSettings);

document.getElementById("backgroundImage").addEventListener("input", (event) => {
    pendingBackgroundImage = "";
    updatePreview(event.target.value.trim());
    scheduleSaveSettings();
});

document.getElementById("backgroundFile").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        pendingBackgroundImage = reader.result;
        document.getElementById("backgroundImage").value = "";
        updatePreview(reader.result);
        saveSettings();
    };
    reader.readAsDataURL(file);
});

document.getElementById("clearBackground").onclick = () => {
    document.getElementById("backgroundImage").value = "";
    document.getElementById("backgroundFile").value = "";
    pendingBackgroundImage = "";
    updatePreview("");
    saveSettings();
};

window.addEventListener("beforeunload", saveWebsiteShortcuts);

function updatePreview(url) {
    const preview = document.getElementById("backgroundPreview");
    document.querySelectorAll(".background-preset").forEach((button) => {
        button.classList.toggle("selected", button.dataset.backgroundUrl === url);
    });
    if (url) {
        preview.src = url;
        preview.style.display = "block";
    } else {
        preview.src = "";
        preview.style.display = "none";
    }
}

document.getElementById("backupColors").onclick = () => {
    chrome.tabs.query({}, tabs => {
        let responded = false;

        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: "exportColors" }, response => {
                if (response && response.backup) {
                    responded = true;
                    document.getElementById("colorBackupBox").value =
                        JSON.stringify(response.backup, null, 2);
                }
            });
        });

        setTimeout(() => {
            if (!responded) {
                document.getElementById("colorBackupBox").value = "{}";
            }
        }, 300);
    });
};
document.getElementById("restoreColors").onclick = () => {
    const text = document.getElementById("colorBackupBox").value;

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        alert("Invalid JSON");
        return;
    }

    chrome.tabs.query({ url: ["https://*.compass.education/*"] }, tabs => {
        if (!tabs.length) {
            alert("No Compass tab found. Open Compass and try again.");
            return;
        }

        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: "importColors",
                data
            });
        });

        alert("Colours restored!");
    });
};
