const editorModeToggle = document.getElementById("editorModeToggle");
const status = document.getElementById("status");
const openOptions = document.getElementById("openOptions");
const backgroundBlur = document.getElementById("backgroundBlur");
const blurValue = document.getElementById("blurValue");
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

chrome.storage.sync.get(["editorModeEnabled"], (settings) => {
    const enabled = settings.editorModeEnabled !== false;
    editorModeToggle.checked = enabled;
    updateStatus(enabled);
});

chrome.storage.local.get(["backgroundBlur"], (settings) => {
    const blur = Number(settings.backgroundBlur) || 0;
    backgroundBlur.value = blur;
    updateBlurValue(blur);
});

editorModeToggle.addEventListener("change", () => {
    const enabled = editorModeToggle.checked;
    chrome.storage.sync.set({ editorModeEnabled: enabled }, () => {
        updateStatus(enabled);
    });
});

backgroundBlur.addEventListener("input", () => {
    const value = Number(backgroundBlur.value) || 0;
    updateBlurValue(value);
    chrome.storage.local.set({ backgroundBlur: value });
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
