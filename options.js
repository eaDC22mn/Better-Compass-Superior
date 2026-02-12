// Load theme
chrome.storage.sync.get(["theme"], (settings) => {
    if (settings.theme) {
        document.getElementById("themeSelect").value = settings.theme;
    }
});

// Load subject colours
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

// Save settings
document.getElementById("save").onclick = () => {
    const theme = document.getElementById("themeSelect").value;

    const inputs = document.querySelectorAll("#subjectColors input");
    const subjectColors = {};

    inputs.forEach(input => {
        subjectColors[input.dataset.subject] = input.value;
    });

    chrome.storage.sync.set({
        theme,
        subjectColors
    }, () => {
        alert("Theme settings saved.");
    });
};
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

    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: "importColors",
                data
            });
        });
    });

    alert("Colours restored! Refresh Compass.");
};