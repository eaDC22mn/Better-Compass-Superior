(() => {
    const FILE_FORMAT = "better-compass-settings";
    const FILE_VERSION = 1;
    const BACKGROUND_IMAGE_KEY = "backgroundImage";
    const TIMETABLE_COLOUR_PREFIX = "compass-color-";

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
                local: excludeBackgroundImage(local),
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
            local: excludeBackgroundImage(backup.data.local),
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

    async function importBackup(file, type) {
        const backup = parseBackup(await file.text(), type);
        if (type === "full-settings" &&
            !window.confirm("Importing full settings will replace current extension settings. Your background image will remain unchanged. Continue?")) {
            return false;
        }
        await replaceStorageArea("local", backup.local, type);
        await replaceStorageArea("sync", backup.sync, type);
        return true;
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
    }

    window.BCSSettingsTransfer = { initialize };
})();
