const editorModeToggle = document.getElementById("editorModeToggle");
const status = document.getElementById("status");
const openOptions = document.getElementById("openOptions");
const backgroundBlur = document.getElementById("backgroundBlur");
const blurValue = document.getElementById("blurValue");

function updateStatus(enabled) {
    status.textContent = enabled
        ? "Editor mode is enabled. Hover sliders will appear."
        : "Editor mode is disabled. Timetable colours remain but editing is off.";
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

openOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});
