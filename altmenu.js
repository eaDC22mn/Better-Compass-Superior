(() => {
    let templatePromise;

    function close() {
        document.getElementById("altmenu")?.remove();
    }

    function loadTemplate() {
        if (!templatePromise) {
            const templateUrl = chrome.runtime.getURL("altmenu.html");
            templatePromise = fetch(templateUrl).then((response) => {
                if (!response.ok) {
                    throw new Error(`Could not load alternate menu: ${response.status}`);
                }
                return response.text();
            });
        }

        return templatePromise;
    }

    function loadThemePicker(overlay) {
        const themePicker = overlay.querySelector("#themeSelect");
        const themeBox = overlay.querySelector(".bcs-theme-box");
        if (!themePicker) return;

        const updateThemeBox = (theme) => {
            if (themeBox) {
                themeBox.dataset.theme = theme;
            }
        };

        chrome.storage.sync.get(["theme"], (settings) => {
            const theme = String(settings.theme || "default");
            themePicker.value = theme;
            updateThemeBox(theme);
        });

        themePicker.addEventListener("change", () => {
            const theme = themePicker.value;
            updateThemeBox(theme);
            chrome.storage.sync.set({ theme });
        });
    }
    const backgroundPresets = [
        { label: "Theater", path: "backgrounds/campus.jpg" },
        { label: "Sunset", path: "backgrounds/sunset.jpg" },
        { label: "Forest", path: "backgrounds/forest.jpg" },
        { label: "Ocean", path: "backgrounds/ocean.jpg" },
        { label: "City", path: "backgrounds/city.jpg" },
        { label: "Industrial", path: "backgrounds/industry.jpg" },
        { label: "Galaxy", path: "backgrounds/galaxy.jpg" }
    ];

    function saveBackground(url) {
        if (url) {
            chrome.storage.local.set({ backgroundImage: url });
        } else {
            chrome.storage.local.remove("backgroundImage");
        }
    }

    function updateBackgroundPreview(overlay, url) {
        const preview = overlay.querySelector("#backgroundPreview");
        if (!preview) return;

        preview.src = url || "";
        preview.style.display = url ? "block" : "none";
    }

    function loadBackgroundPicker(overlay) {
        const urlInput = overlay.querySelector("#backgroundImage");
        const fileInput = overlay.querySelector("#backgroundFile");
        const presetsContainer = overlay.querySelector("#backgroundPresets");
        const clearButton = overlay.querySelector("#clearBackground");
        if (!urlInput || !fileInput || !presetsContainer || !clearButton) return;

        const setBackground = (url) => {
            urlInput.value = url.startsWith("data:") ? "" : url;
            fileInput.value = "";
            updateBackgroundPreview(overlay, url);
            saveBackground(url);
        };

        backgroundPresets.forEach((preset) => {
            const url = chrome.runtime.getURL(preset.path);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "background-preset";
            button.title = `Use ${preset.label} background`;

            const image = document.createElement("img");
            image.src = url;
            image.alt = preset.label;

            const label = document.createElement("span");
            label.textContent = preset.label;
            button.append(image, label);
            button.addEventListener("click", () => setBackground(url));
            presetsContainer.appendChild(button);
        });

        chrome.storage.local.get(["backgroundImage"], (settings) => {
            const url = String(settings.backgroundImage || "");
            urlInput.value = url.startsWith("data:") ? "" : url;
            updateBackgroundPreview(overlay, url);
        });

        urlInput.addEventListener("input", () => {
            fileInput.value = "";
            updateBackgroundPreview(overlay, urlInput.value.trim());
            saveBackground(urlInput.value.trim());
        });

        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.addEventListener("load", () => setBackground(String(reader.result || "")));
            reader.readAsDataURL(file);
        });

        clearButton.addEventListener("click", () => setBackground(""));
    }

    function loadWebsiteShortcuts(overlay) {
        const section = overlay.querySelector("#alternateMenuShortcuts");
        const linksContainer = overlay.querySelector("#alternateMenuShortcutLinks");
        if (!section || !linksContainer) return;

        const render = (shortcuts) => {
            linksContainer.replaceChildren();

            shortcuts.forEach((shortcut) => {
                if (!shortcut || typeof shortcut.url !== "string") return;

                let parsedUrl;
                try {
                    const shortcutUrl = shortcut.url.trim();
                    parsedUrl = new URL(/^https?:\/\//i.test(shortcutUrl) ? shortcutUrl : `https://${shortcutUrl}`);
                } catch {
                    return;
                }
                if (!/^https?:$/.test(parsedUrl.protocol)) return;

                const link = document.createElement("a");
                link.className = "bcs-alternate-menu-shortcut";
                link.href = parsedUrl.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.title = parsedUrl.href;
                link.setAttribute("aria-label", `Open ${parsedUrl.href}`);

                const icon = document.createElement("img");
                icon.src = `${parsedUrl.origin}/favicon.ico`;
                icon.alt = "";
                icon.addEventListener("error", () => {
                    icon.replaceWith(document.createTextNode(">"));
                }, { once: true });

                link.appendChild(icon);
                linksContainer.appendChild(link);
            });

            section.hidden = false;
        };

        chrome.storage.local.get(["websiteShortcuts"], (settings) => {
            if (Array.isArray(settings.websiteShortcuts) && settings.websiteShortcuts.length > 0) {
                render(settings.websiteShortcuts);
                return;
            }

            chrome.storage.sync.get(["websiteShortcuts"], (syncSettings) => {
                const shortcuts = Array.isArray(syncSettings.websiteShortcuts) ? syncSettings.websiteShortcuts : [];
                render(shortcuts);
                if (shortcuts.length > 0) {
                    chrome.storage.local.set({ websiteShortcuts: shortcuts });
                }
            });
        });
    }

    function loadWebsiteShortcutEditor(overlay) {
        const section = overlay.querySelector("#alternateMenuShortcuts");
        const editor = overlay.querySelector("#alternateMenuShortcutEditor");
        const addButton = overlay.querySelector("#addAlternateMenuShortcut");
        if (!section || !editor || !addButton) return;

        let shortcuts = [];
        const save = () => chrome.storage.local.set({ websiteShortcuts: shortcuts });

        const render = () => {
            editor.replaceChildren();
            shortcuts.forEach((shortcut, index) => {
                const row = document.createElement("div");
                row.className = "bcs-alternate-menu-shortcut-edit-row";

                const url = document.createElement("input");
                url.type = "url";
                url.placeholder = "https://example.com";
                url.value = shortcut.url || "";

                const remove = document.createElement("button");
                remove.type = "button";
                remove.textContent = "Remove";
                remove.addEventListener("click", () => {
                    shortcuts.splice(index, 1);
                    save();
                    render();
                    loadWebsiteShortcuts(overlay);
                });

                const update = () => {
                    shortcuts[index] = { url: url.value.trim() };
                    save();
                    loadWebsiteShortcuts(overlay);
                };
                url.addEventListener("input", update);
                row.append(url, remove);
                editor.appendChild(row);
            });
        };

        addButton.addEventListener("click", () => {
            shortcuts.push({ url: "" });
            save();
            render();
            editor.lastElementChild?.querySelector("input")?.focus();
            section.hidden = false;
        });

        chrome.storage.local.get(["websiteShortcuts"], (settings) => {
            if (Array.isArray(settings.websiteShortcuts) && settings.websiteShortcuts.length > 0) {
                shortcuts = settings.websiteShortcuts;
                render();
                section.hidden = false;
                return;
            }

            chrome.storage.sync.get(["websiteShortcuts"], (syncSettings) => {
                shortcuts = Array.isArray(syncSettings.websiteShortcuts) ? syncSettings.websiteShortcuts : [];
                render();
                section.hidden = false;
                if (shortcuts.length > 0) {
                    save();
                }
            });
        });
    }

    async function open() {
        if (document.getElementById("altmenu")) return;

        const overlay = document.createElement("div");
        overlay.id = "altmenu";
        overlay.setAttribute("role", "presentation");
        document.body.appendChild(overlay);

        try {
            overlay.innerHTML = await loadTemplate();
        } catch (error) {
            console.error(error);
            close();
            return;
        }

        const extensionIcon = overlay.querySelector("[data-extension-icon]");
        if (extensionIcon) {
            extensionIcon.src = chrome.runtime.getURL("info.png");
        }

        const closeButton = overlay.querySelector(".bcs-alternate-menu-close");
        const exampleButton = overlay.querySelector(".bcs-alternate-menu-example-button");
        const exampleStatus = overlay.querySelector(".bcs-alternate-menu-example-status");

        closeButton?.addEventListener("click", close);
        exampleButton?.addEventListener("click", () => {
            if (exampleStatus) {
                exampleStatus.textContent = "The example button works.";
            }
        });
        loadThemePicker(overlay);
        loadBackgroundPicker(overlay);
        loadWebsiteShortcuts(overlay);
        loadWebsiteShortcutEditor(overlay);
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) close();
        });
        overlay.addEventListener("keydown", (event) => {
            if (event.key === "Escape") close();
        });
        closeButton?.focus();
    }

    window.BCSAltMenu = { open };
})();
