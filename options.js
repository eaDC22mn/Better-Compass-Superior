

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

chrome.storage.sync.get(["subjectColors"], (data) => {
    const subjectColors = data.subjectColors || {};
    const container = document.getElementById("subjectColors");

    chrome.runtime.sendMessage({ action: "getSubjects" }, (response) => {
        if (!response || !response.subjects) return;

        response.subjects.forEach(sub => {
            const wrapper = document.createElement("div");
            wrapper.style.marginBottom = "10px";

            const label = document.createElement("label");
            label.textContent = sub;

            const input = document.createElement("input");
            input.type = "color";
            input.value = subjectColors[sub] || "#cccccc";
            input.dataset.subject = sub;

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
        });
    });
});

document.getElementById("save").onclick = () => {
    const theme = document.getElementById("themeSelect").value;
    const urlValue = document.getElementById("backgroundImage").value.trim();
    const disableTimetableColourPicker = document.getElementById("disableTimetableColourPicker").checked;

    const inputs = document.querySelectorAll("#subjectColors input");
    const subjectColors = {};

    inputs.forEach(input => {
        subjectColors[input.dataset.subject] = input.value;
    });

    const savePayload = {
        theme,
        subjectColors,
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
