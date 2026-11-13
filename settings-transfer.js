(() => {
    const FILE_FORMAT = "better-compass-settings";
    const FILE_VERSION = 1;
    const BACKGROUND_IMAGE_KEY = "backgroundImage";
    const TIMETABLE_COLOUR_PREFIX = "compass-color-";
    const BUNDLED_BACKGROUND_PATHS = [
        "backgrounds/campus.jpg",
        "backgrounds/sunset.jpg",
        "backgrounds/forest.jpg",
        "backgrounds/ocean.jpg",
        "backgrounds/city.jpg",
        "backgrounds/tech.jpg",
        "backgrounds/galaxy.jpg",
        "backgrounds/hk.jpg",
        "backgrounds/mc.jpg",
        "backgrounds/other.jpg"
    ];

    function storageCall(area, method, argument) {
        return new Promise((resolve, reject) => {
            chrome.storage[area][method](argument, (result) => {
                const error = chrome.runtime.lastError;
                if (error) {
                    reject(new Error(error.message));
                    return;
                }
                resolve(result);
            });
        });
    }

    function isRecord(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function filterTimetableColours(values) {
        return Object.fromEntries(Object.entries(values).filter(([key]) =>
            key.startsWith(TIMETABLE_COLOUR_PREFIX)
        ));
    }

    function excludeBackgroundImage(values) {
        return Object.fromEntries(Object.entries(values).filter(([key]) =>
            key !== BACKGROUND_IMAGE_KEY
        ));
    }

    function getBundledBackgroundPath(backgroundImage) {
        if (typeof backgroundImage !== "string") return null;
        return BUNDLED_BACKGROUND_PATHS.find(path =>
            backgroundImage === path || backgroundImage === chrome.runtime.getURL(path)
        ) || null;
    }

    function includeBundledBackgroundPath(values) {
        const filtered = excludeBackgroundImage(values);
        const backgroundPath = getBundledBackgroundPath(values[BACKGROUND_IMAGE_KEY]);
        if (backgroundPath) filtered[BACKGROUND_IMAGE_KEY] = backgroundPath;
        return filtered;
    }

    function restoreBundledBackgroundImage(values) {
        const filtered = excludeBackgroundImage(values);
        const backgroundPath = getBundledBackgroundPath(values[BACKGROUND_IMAGE_KEY]);
        if (backgroundPath) {
            filtered[BACKGROUND_IMAGE_KEY] = chrome.runtime.getURL(backgroundPath);
        }
        return filtered;
    }

    function setStatus(section, message, isError = false) {
        const status = section.querySelector("[data-settings-transfer-status]");
        if (!status) return;
        status.textContent = message;
        status.dataset.state = isError ? "error" : "success";
    }

    async function readStorageArea(area) {
        return await storageCall(area, "get", null);
    }

    async function makeBackup(type) {
        const local = await readStorageArea("local");
        if (type === "timetable-colours") {
            const sync = await readStorageArea("sync");
            return {
                format: FILE_FORMAT,
                version: FILE_VERSION,
                type,
                createdAt: new Date().toISOString(),
                data: {
                    local: filterTimetableColours(local),
                    sync: filterTimetableColours(sync)
                }
            };
        }

        const sync = await readStorageArea("sync");
        return {
            format: FILE_FORMAT,
            version: FILE_VERSION,
            type,
            createdAt: new Date().toISOString(),
            data: {
                local: includeBundledBackgroundPath(local),
                sync: excludeBackgroundImage(sync)
            }
        };
    }

    function downloadBackup(backup) {
        const blob = new Blob([JSON.stringify(backup, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `better-compass-${backup.type}-${date}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function parseBackup(text, expectedType) {
        let backup;
        try {
            backup = JSON.parse(text);
        } catch {
            throw new Error("The selected file is not valid JSON.");
        }

        if (!isRecord(backup) ||
            backup.format !== FILE_FORMAT ||
            backup.version !== FILE_VERSION ||
            backup.type !== expectedType ||
            !isRecord(backup.data) ||
            !isRecord(backup.data.local) ||
            !isRecord(backup.data.sync)) {
            throw new Error(`This file is not a valid ${expectedType} backup.`);
        }

        if (expectedType === "timetable-colours") {
            for (const area of ["local", "sync"]) {
                const values = backup.data[area];
                for (const [key, value] of Object.entries(values)) {
                    if (!key.startsWith(TIMETABLE_COLOUR_PREFIX) || typeof value !== "string") {
                        throw new Error("The timetable colour backup contains invalid data.");
                    }
                }
            }
        }

        return {
            local: expectedType === "full-settings"
                ? restoreBundledBackgroundImage(backup.data.local)
                : excludeBackgroundImage(backup.data.local),
            sync: excludeBackgroundImage(backup.data.sync)
        };
    }

    async function replaceStorageArea(area, imported, type) {
        const existing = await readStorageArea(area);
        let keysToRemove;

        if (type === "timetable-colours") {
            const importedKeys = new Set(Object.keys(imported));
            keysToRemove = Object.keys(existing).filter(key =>
                key.startsWith(TIMETABLE_COLOUR_PREFIX) && !importedKeys.has(key)
            );
        } else {
            const importedKeys = new Set(Object.keys(imported));
            keysToRemove = Object.keys(existing).filter(key =>
                key !== BACKGROUND_IMAGE_KEY && !importedKeys.has(key)
            );
        }

        if (keysToRemove.length) {
            await storageCall(area, "remove", keysToRemove);
        }
        if (Object.keys(imported).length) {
            await storageCall(area, "set", imported);
        }
    }

    async function importBackupText(text, type, sourceLabel = "backup") {
        const backup = parseBackup(text, type);
        if (type === "full-settings" &&
            !window.confirm(`Importing ${sourceLabel} will replace current extension settings. A bundled preset background will be restored; otherwise, your current background will remain unchanged. Continue?`)) {
            return false;
        }
        await replaceStorageArea("local", backup.local, type);
        await replaceStorageArea("sync", backup.sync, type);
        return true;
    }

    async function importBackup(file, type) {
        return await importBackupText(await file.text(), type);
    }

    function initialize(root) {
        root.querySelectorAll("[data-settings-export]").forEach((button) => {
            button.addEventListener("click", async () => {
                const section = button.closest(".bcs-settings-transfer");
                try {
                    setStatus(section, "Preparing backup...");
                    downloadBackup(await makeBackup(button.dataset.settingsExport));
                    setStatus(section, "Backup downloaded.");
                } catch (error) {
                    console.error("Settings backup export failed:", error);
                    setStatus(section, `Export failed: ${error.message}`, true);
                }
            });
        });

        root.querySelectorAll("[data-settings-import-trigger]").forEach((button) => {
            button.addEventListener("click", () => {
                const type = button.dataset.settingsImportTrigger;
                button.closest(".bcs-settings-transfer")
                    ?.querySelector(`[data-settings-import="${type}"]`)
                    ?.click();
            });
        });

        root.querySelectorAll("[data-settings-import]").forEach((input) => {
            input.addEventListener("change", async () => {
                const section = input.closest(".bcs-settings-transfer");
                const file = input.files?.[0];
                if (!file) return;

                try {
                    setStatus(section, "Importing backup...");
                    const imported = await importBackup(file, input.dataset.settingsImport);
                    setStatus(section, imported ? "Backup imported." : "Import cancelled.");
                } catch (error) {
                    console.error("Settings backup import failed:", error);
                    setStatus(section, `Import failed: ${error.message}`, true);
                } finally {
                    input.value = "";
                }
            });
        });

        root.querySelectorAll("[data-settings-preset]").forEach((button) => {
            button.addEventListener("click", async () => {
                const section = button.closest(".bcs-settings-transfer");
                const preset = button.dataset.settingsPreset;
                if (!["1", "2", "3", "4"].includes(preset)) {
                    setStatus(section, "Unknown settings preset.", true);
                    return;
                }

                try {
                    setStatus(section, `Loading preset ${preset}...`);
                    const response = await fetch(chrome.runtime.getURL(`presets/${preset}.json`));
                    if (!response.ok) {
                        throw new Error(`Could not load preset ${preset} (${response.status}).`);
                    }
                    const imported = await importBackupText(
                        await response.text(),
                        "full-settings",
                        `settings preset ${preset}`
                    );
                    setStatus(section, imported ? `Preset ${preset} loaded.` : "Preset loading cancelled.");
                } catch (error) {
                    console.error(`Settings preset ${preset} load failed:`, error);
                    setStatus(section, `Preset ${preset} failed: ${error.message}`, true);
                }
            });
        });
    }

    window.BCSSettingsTransfer = { initialize };
})();
