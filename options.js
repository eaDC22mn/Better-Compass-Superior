

let pendingBackgroundImage = "";

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

const subjectPatternRulesContainer = document.getElementById("subjectPatternRules");
const addSubjectPatternRuleButton = document.getElementById("addSubjectPatternRule");

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
    remove.addEventListener("click", () => wrapper.remove());

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
    addSubjectPatternRuleButton.addEventListener("click", () => addSubjectPatternRule());
}

document.getElementById("save").onclick = () => {
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

    const savePayload = {
        theme,
        subjectColorRules,
        colorPickerEnabled: !disableTimetableColourPicker
    };

    chrome.storage.sync.set(savePayload, () => {
        if (pendingBackgroundImage) {
            chrome.storage.local.set({ backgroundImage: pendingBackgroundImage }, () => {
                alert("Theme settings saved.");
            });
        } else if (urlValue) {
            chrome.storage.local.set({ backgroundImage: urlValue }, () => {
                alert("Theme settings saved.");
            });
        } else {
            chrome.storage.local.remove("backgroundImage", () => {
                alert("Theme settings saved.");
            });
        }
    });
};

document.getElementById("backgroundImage").addEventListener("input", (event) => {
    pendingBackgroundImage = "";
    updatePreview(event.target.value.trim());
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
    };
    reader.readAsDataURL(file);
});

document.getElementById("clearBackground").onclick = () => {
    document.getElementById("backgroundImage").value = "";
    document.getElementById("backgroundFile").value = "";
    pendingBackgroundImage = "";
    updatePreview("");
    chrome.storage.local.remove("backgroundImage", () => {
        alert("Background image cleared.");
    });
};

function updatePreview(url) {
    const preview = document.getElementById("backgroundPreview");
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
