function applyThemeAndBackground() {
    chrome.storage.sync.get(["theme"], (settings) => {
        const theme = settings.theme || "default";

        document.body.classList.forEach(cls => {
            if (cls.startsWith("theme-")) {
                document.body.classList.remove(cls);
            }
        });

        document.body.classList.add("theme-" + theme);
    });

    chrome.storage.local.get(["backgroundImage"], (localSettings) => {
        applyBackgroundImage(localSettings.backgroundImage);
    });
}

let customBackgroundLayer;

function ensureBackgroundLayer() {
    if (customBackgroundLayer) {
        return customBackgroundLayer;
    }

    function clearCompassRootBackground() {
    const selectors = [
        '#root',
        '.x-viewport',
        '.x-box-inner',
        '.x-box-target',
        '.newLNFActivity',
        '.newLNF',
        '.app-container',
        '.main-container',
        '.MuiBox-root',
        '.MuiContainer-root'
    ];

    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.style.backgroundColor = 'transparent';
            el.style.backgroundImage = 'none';
        });
    });
 }



    customBackgroundLayer = document.createElement("div");
    customBackgroundLayer.id = "betterCompassBackgroundLayer";
    customBackgroundLayer.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center center;
        background-attachment: fixed;
        opacity: 1;
        background-color: transparent;
    `;

    document.body.appendChild(customBackgroundLayer);
    if (!document.body.style.position) {
        document.body.style.position = "relative";
    }

    return customBackgroundLayer; 
}

function clearPageBackgroundBlockers() {
    const blockers = Array.from(document.body.children).filter(
        el => el.id !== "betterCompassBackgroundLayer"
    );

    blockers.forEach(el => {
        const computed = window.getComputedStyle(el);
        if (computed.backgroundImage && computed.backgroundImage !== "none") {
            if (!el.dataset.bcsBgImage) {
                el.dataset.bcsBgImage = el.style.backgroundImage || "";
            }
            el.style.backgroundImage = "none";
        }

        if (computed.backgroundColor && computed.backgroundColor !== "transparent" && computed.backgroundColor !== "rgba(0, 0, 0, 0)") {
            if (!el.dataset.bcsBgColor) {
                el.dataset.bcsBgColor = el.style.backgroundColor || "";
            }
            el.style.backgroundColor = "transparent";
        }
    });
}

function restorePageBackgroundBlockers() {
    const blockers = Array.from(document.body.children).filter(
        el => el.id !== "betterCompassBackgroundLayer"
    );

    blockers.forEach(el => {
        if (el.dataset.bcsBgImage !== undefined) {
            el.style.backgroundImage = el.dataset.bcsBgImage;
            delete el.dataset.bcsBgImage;
        }
        if (el.dataset.bcsBgColor !== undefined) {
            el.style.backgroundColor = el.dataset.bcsBgColor;
            delete el.dataset.bcsBgColor;
        }
    });
}

const TRANSPARENT_WITH_CUSTOM_BACKGROUND_SELECTORS = [
    ".x-box-inner",
    ".x-box-target",
    "--card"
];

function applyBackgroundTransparencyState(isActive) {
    const selectorList = TRANSPARENT_WITH_CUSTOM_BACKGROUND_SELECTORS.filter(Boolean).join(", ");
    if (!selectorList) return;

    document.querySelectorAll(selectorList).forEach((element) => {
        if (!element) return;

        if (isActive) {
            if (element.dataset.bcsOriginalOpacity === undefined) {
                element.dataset.bcsOriginalOpacity = element.style.opacity || "";
            }
            if (element.dataset.bcsOriginalVisibility === undefined) {
                element.dataset.bcsOriginalVisibility = element.style.visibility || "";
            }

            element.style.setProperty("opacity", "0", "!important");
            element.style.setProperty("visibility", "visible", "important");
            element.style.setProperty("pointer-events", "auto", "important");
        } else {
            if (element.dataset.bcsOriginalOpacity !== undefined) {
                element.style.opacity = element.dataset.bcsOriginalOpacity;
                delete element.dataset.bcsOriginalOpacity;
            } else {
                element.style.removeProperty("opacity");
            }

            if (element.dataset.bcsOriginalVisibility !== undefined) {
                element.style.visibility = element.dataset.bcsOriginalVisibility;
                delete element.dataset.bcsOriginalVisibility;
            } else {
                element.style.removeProperty("visibility");
            }

            element.style.removeProperty("pointer-events");
        }
    });
}

function applyBackgroundImage(url) {
    const imageUrl = url?.trim();
    if (imageUrl) {
        const layer = ensureBackgroundLayer();
        layer.style.backgroundImage = `url("${imageUrl}")`;
        document.body.classList.add("has-custom-background");
        applyBackgroundTransparencyState(true);
        // Do NOT clear page backgrounds (breaks site). If any backgrounds
        // were previously cleared, restore them so the page remains usable.
        restorePageBackgroundBlockers();
    } else {
        if (customBackgroundLayer) {
            customBackgroundLayer.style.backgroundImage = "";
        }
        document.body.classList.remove("has-custom-background");
        applyBackgroundTransparencyState(false);
        restorePageBackgroundBlockers();
    }
}

applyThemeAndBackground();

const PERMANENT_Z_INDEX_SELECTORS = [
    ".x-box-inner",
    ".x-box-target",
    ".newLNF",
    ".MuiBox-root",
    ".MuiContainer-root",
    ".x-calendar-list",
    ".x-panel-body",
    ".css-1dpvdu2",
    ".newLNF #c_bar",
    ".x-toolbar",
    ".topbar",
    ".header",
    ".masthead",
    ".navbar",
    ".navigation",
    ".app-bar",
    "#mnu_right",
    ".mnu-right",
    ".nav-right",
    ".topbar-right",
    ".header-right",
    ".actions-right",
    ".right-menu",
    ".toolbar-right",
    ".css-szig0z .css-dt2n38"
];

const PERMANENT_Z_INDEX_EXCLUDED_SELECTORS = [
    "#productNavBar.newLNF",
    "#mnuMenuContainer.newLNF",
   
];

function applyPermanentZIndex() {
    if (!document.body) return;

    const selectorList = PERMANENT_Z_INDEX_SELECTORS.filter(Boolean).join(", ");
    if (!selectorList) return;

    document.querySelectorAll(selectorList).forEach((element) => {
        if (!element || element === document.body || element === document.documentElement) {
            return;
        }

        if (element.matches(PERMANENT_Z_INDEX_EXCLUDED_SELECTORS.join(", ")) || element.closest(PERMANENT_Z_INDEX_EXCLUDED_SELECTORS.join(", "))) {
            return;
        }

        const currentPosition = window.getComputedStyle(element).position;
        if (currentPosition === "static") {
            element.style.setProperty("position", "relative", "important");
        }

        element.style.setProperty("z-index", "2", "important");
    });
}

function startPermanentZIndexObserver() {
    applyPermanentZIndex();

    const observer = new MutationObserver(() => {
        applyPermanentZIndex();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"]
    });
}

if (document.body) {
    requestAnimationFrame(() => {
        startPermanentZIndexObserver();
    });
} else {
    window.addEventListener("load", startPermanentZIndexObserver, { once: true });
}

/*zindex alter f8unction*/

let zIndexToolPanel = null;
let zIndexSelectionMode = false;
let zIndexTargetElement = null;
const Z_INDEX_STORAGE_KEY = "betterCompassZIndexSelection";

function escapeSelectorValue(value) {
    return String(value).replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

function buildElementSelector(element) {
    if (!element || element.nodeType !== 1) return null;

    const tag = element.tagName.toLowerCase();
    const parts = [tag];

    if (element.id) {
        parts.push(`#${escapeSelectorValue(element.id)}`);
        return parts.join("");
    }

    const classes = Array.from(element.classList || []).filter(Boolean);
    if (classes.length) {
        classes.forEach(cls => parts.push(`.${escapeSelectorValue(cls)}`));
    }

    const parent = element.parentElement;
    if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter(child => child.tagName === element.tagName);
        const index = sameTagSiblings.indexOf(element) + 1;
        if (sameTagSiblings.length > 1 && index > 0) {
            parts.push(`:nth-of-type(${index})`);
        }
    }

    return parts.join("");
}

function saveZIndexSelection(selector, value) {
    if (!selector) return;
    chrome.storage.local.set({
        [Z_INDEX_STORAGE_KEY]: {
            selector,
            value: Number.isFinite(value) ? value : 0
        }
    });
}

function applyZIndexValue(element, value, inputElement, statusElement) {
    if (!element || element === document.body || element === document.documentElement) {
        return false;
    }

    const parsedValue = parseInt(value, 10);
    if (Number.isNaN(parsedValue)) {
        return false;
    }

    const style = window.getComputedStyle(element);
    if (style.position === "static") {
        element.style.position = "relative";
    }

    element.style.zIndex = String(parsedValue);

    if (inputElement) {
        inputElement.value = String(parsedValue);
    }

    if (statusElement) {
        statusElement.textContent = `Updated: ${element.tagName.toLowerCase()} (${parsedValue})`;
    }

    return true;
}

function restoreSavedZIndexSelection(inputElement, statusElement) {
    chrome.storage.local.get([Z_INDEX_STORAGE_KEY], (result) => {
        const saved = result[Z_INDEX_STORAGE_KEY];
        if (!saved?.selector) return;

        const target = document.querySelector(saved.selector);
        if (!target) {
            setTimeout(() => restoreSavedZIndexSelection(inputElement, statusElement), 1500);
            return;
        }

        zIndexTargetElement = target;
        applyZIndexValue(target, saved.value, inputElement, statusElement);

        if (statusElement) {
            statusElement.textContent = `Restored: ${target.tagName.toLowerCase()}`;
        }
    });
}

function createZIndexControl() {
    return null;
}

createZIndexControl();
/* end of fucntion*/

chrome.storage.onChanged.addListener((changes, areaName) => {
    if ((areaName === "sync" && changes.theme) ||
        (areaName === "local" && changes.backgroundImage)) {
        applyThemeAndBackground();
    }
    /* Handle z-index selection changes */

    if (areaName === "local" && changes[Z_INDEX_STORAGE_KEY] && zIndexToolPanel) {
        const saved = changes[Z_INDEX_STORAGE_KEY].newValue;
        if (saved?.selector) {
            const target = document.querySelector(saved.selector);
            if (target) {
                zIndexTargetElement = target;
                applyZIndexValue(target, saved.value, zIndexToolPanel.querySelector(".bcs-zindex-input"), zIndexToolPanel.querySelector(".bcs-zindex-status"));
            }
        }
    }
});

/*end of z-index selection changes*/


let timetableColorPickerEnabled = true;
let colorPickerInitialized = false;
let colorPickerElement = null;
let applySavedColors = null;

function setTimetableColorPickerEnabled(enabled) {
    timetableColorPickerEnabled = enabled;

    if (!enabled && colorPickerElement) {
        colorPickerElement.style.display = "none";
    }

    if (enabled && !colorPickerInitialized) {
        initTimetableColorPicker();
    }
}

function initTimetableColorPicker() {
    if (colorPickerInitialized) return;
    colorPickerInitialized = true;

    const picker = document.createElement("div");
    picker.id = "bcsColorPicker";
    picker.style.cssText = `
        position: absolute;
        z-index: 9999;
        background: rgba(20, 20, 20, 0.95);
        color: #000000;
        padding: 3px;
        border-radius: 4px;
        font-family: system-ui, sans-serif;
        font-size: 10px;
        display: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        width: 150px;
    `;

    picker.innerHTML = `
<div id="preview" style="height:18px;border-radius:3px;margin-bottom:3px;border:1px solid #333;"></div>
<label style="font-size:11px;">Hue</label>
<input id="h" type="range" min="0" max="360">
<label style="font-size:11px;">Sat</label>
<input id="s" type="range" min="0" max="100">
<label style="font-size:11px;">Light</label>
<input id="l" type="range" min="0" max="100">
`;

    document.body.appendChild(picker);
    colorPickerElement = picker;

    function updatePickerBackground() {
        if (!picker) return;
        if (document.body.classList.contains('has-custom-background')) {
            picker.style.background = 'transparent';
            picker.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
            picker.style.color = '#fff';
        } else {
            picker.style.background = 'transparent';
            picker.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
            picker.style.color = '#fff';
        }
    }

    const bodyObserver = new MutationObserver(() => updatePickerBackground());
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    updatePickerBackground();

    let currentBlock = null;
    let hideTimeout = null;
    let pinnedBlock = null;

    const h = picker.querySelector("#h");
    const s = picker.querySelector("#s");
    const l = picker.querySelector("#l");
    const preview = picker.querySelector("#preview");

    function hsl() {
        return `hsl(${h.value}, ${s.value}%, ${l.value}%)`;
    }

    function getKey(el) {
        if (!el) return null;
        const text = el.innerText?.trim();
        return text ? `compass-color-${text}` : null;
    }

    function applyColor() {
        if (!timetableColorPickerEnabled || !currentBlock) return;
        const color = hsl();
        preview.style.background = color;
        if (currentBlock) currentBlock.style.backgroundColor = color;
        const key = getKey(currentBlock);
        if (key) chrome.storage.local.set({ [key]: color });
    }

    function show(block) {
        if (!timetableColorPickerEnabled || !block) return;
        clearTimeout(hideTimeout);
        currentBlock = block;

        const rect = block.getBoundingClientRect();
        const pickerWidth = 150;
        let leftPos = rect.right + 4;
        if (rect.right + pickerWidth + 10 > window.innerWidth) {
            leftPos = rect.left - pickerWidth - 4;
        }

        picker.style.top = `${rect.top + window.scrollY}px`;
        picker.style.left = `${leftPos + window.scrollX}px`;
        picker.style.width = `${pickerWidth}px`;
        picker.style.display = "block";

        const key = getKey(block);

        chrome.storage.local.get([key], result => {
            const saved = result[key] || "hsl(200,60%,50%)";

            const match = saved.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                h.value = match[1];
                s.value = match[2];
                l.value = match[3];
            }

            applyColor();
        });
    }

    function hideDelayed() {
        if (!timetableColorPickerEnabled) return;
        if (currentBlock === pinnedBlock) return;
        hideTimeout = setTimeout(() => {
            picker.style.display = "none";
            currentBlock = null;
        }, 8000);
    }

    applySavedColors = function () {
        if (!timetableColorPickerEnabled) return;
        chrome.storage.local.get(null, all => {
            const blocks = document.querySelectorAll('[class*="timetable"], [class*="calendar"], .event');

            blocks.forEach(block => {
                const key = getKey(block);
                if (!key) return;

                const saved = all[key];
                if (saved) {
                    block.style.backgroundColor = saved;
                }
            });
        });
    };

    document.addEventListener("mouseover", e => {
        if (!timetableColorPickerEnabled || !e.target) return;
        if (
            e.target.closest(".x-box-inner, .x-box-target") ||
            e.target.closest(".menu-svg-icon.menu-svg-icon-calendar")
        ) return;
        const block = e.target.closest('[class*="timetable"], [class*="calendar"], .event');
        if (!block) return;
        show(block);
    });

    document.addEventListener("mouseout", e => {
        if (!timetableColorPickerEnabled) return;
        if (!e.relatedTarget || !e.relatedTarget.closest?.('[class*="timetable"], [class*="calendar"], .event')) {
            hideDelayed();
        }
    });

    document.addEventListener("contextmenu", e => {
        if (!timetableColorPickerEnabled || !e.target) return;
        if (
            e.target.closest(".x-box-inner, .x-box-target") ||
            e.target.closest(".menu-svg-icon.menu-svg-icon-calendar")
        ) return;
        const block = e.target.closest('[class*="timetable"], [class*="calendar"], .event');
        if (!block) return;
        e.preventDefault();
        pinnedBlock = block;
        show(block);
    });

    picker.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
    picker.addEventListener("mouseleave", hideDelayed);

    [h, s, l].forEach(slider => slider.addEventListener("input", applyColor));

    window.addEventListener("load", applySavedColors);
    setTimeout(applySavedColors, 3000);

    const style = document.createElement("style");
    style.id = "avatar-style";
    style.textContent = `
    .MuiAvatar-root.MuiAvatar-circular.box-content.border-white.border-16.border-solid.w-\\[120px\\].h-\\[120px\\].css-zawysc {
      filter: none !important;
      background-color: initial !important;
    }
  `;
    document.head.appendChild(style);
}

chrome.storage.sync.get(["colorPickerEnabled"], (settings) => {
    setTimetableColorPickerEnabled(settings.colorPickerEnabled !== false);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.colorPickerEnabled) {
        setTimetableColorPickerEnabled(changes.colorPickerEnabled.newValue !== false);
    }
});


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "exportColors") {
        chrome.storage.local.get(null, all => {
            const backup = {};

            for (const key in all) {
                if (key.startsWith("compass-color-")) {
                    backup[key] = all[key];
                }
            }

            sendResponse({ backup });
        });

        return true;
    }

    if (msg.action === "importColors") {
        const data = msg.data;
        const toStore = {};

        for (const key in data) {
            if (key.startsWith("compass-color-")) {
                toStore[key] = data[key];
            }
        }

        chrome.storage.local.set(toStore, () => {
            applySavedColors();
            sendResponse({ ok: true });
        });

        return true;
    }
});

function injectBridge() {
    const script = document.createElement("script");
    script.textContent = `
        window.addEventListener("BCS_OPEN_OPTIONS", () => {
            window.postMessage({ type: "BCS_OPEN_OPTIONS" }, "*");
        });
    `;
    document.documentElement.appendChild(script);
    script.remove();
}

injectBridge();

window.addEventListener("message", (event) => {
    if (event.data?.type === "BCS_OPEN_OPTIONS") {
        chrome.runtime.openOptionsPage();
    }
});

function addOpenOptionsButton() {
    if (document.getElementById("openOptionsBtn")) return;

    const btn = document.createElement("button");
    btn.id = "openOptionsBtn";
    btn.textContent = "BCS Options";

    btn.style.zIndex = "999999";
    btn.style.padding = "6px 12px";
    btn.style.borderRadius = "6px";
    btn.style.background = "rgba(112, 112, 112, 0.7)";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.fontFamily = "system-ui, sans-serif";
    btn.style.maxWidth = "120px";
    btn.style.whiteSpace = "nowrap";

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage({ action: "openOptions" });
    });

    const topBarSelectors = [
        '#productNavBar.newLNF',
        '.newLNF #c_bar',
        '.x-toolbar',
        '.topbar',
        '.header',
        '.masthead',
        'header',
        '.navbar',
        '.navigation',
        '.app-bar'
    ];

    const topBar = topBarSelectors
        .map(sel => document.querySelector(sel))
        .find(el => el !== null);

    const rightGroupSelectors = [
        '#mnuMenuContainer.newLNF > #mnu_right',
        '#mnu_right',
        '.mnu-right',
        '.nav-right',
        '.topbar-right',
        '.header-right',
        '.actions-right',
        '.right-menu',
        '.toolbar-right'
    ];

    const rightGroup = rightGroupSelectors
        .map(sel => document.querySelector(sel))
        .find(el => el !== null);

    const profileSelectors = [
        '.user-avatar',
        '.avatar',
        '.profile',
        '.profile-menu',
        '.account',
        '.userMenu',
        '[aria-label*="Profile"]',
        '[aria-label*="Account"]',
        '[data-testid*="profile"]',
        '[data-test*="profile"]',
        '[title*="Profile"]',
        '[title*="Account"]',
        '.x-icon-button',
        '.menu-svg-icon'
    ];

    const profileButton = (rightGroup || topBar)
        ? profileSelectors
            .map(sel => (rightGroup || topBar).querySelector(sel))
            .find(el => el !== null)
        : null;

    const buttonContainer = rightGroup || topBar;

    btn.style.position = "relative";
    btn.style.marginLeft = "10px";
    btn.style.marginRight = "8px";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.flexShrink = "0";

    if (buttonContainer) {
        buttonContainer.style.display = buttonContainer.style.display || "flex";
        buttonContainer.style.alignItems = buttonContainer.style.alignItems || "center";
        buttonContainer.style.flexWrap = buttonContainer.style.flexWrap || "nowrap";

        if (profileButton && profileButton.parentElement) {
            const parent = profileButton.parentElement;
            const style = window.getComputedStyle(parent);
            if (style.display === 'flex' || style.display === 'inline-flex') {
                parent.insertBefore(btn, profileButton);
            } else {
                buttonContainer.appendChild(btn);
            }
        } else {
            buttonContainer.appendChild(btn);
        }
    } else {
        btn.style.position = "fixed";
        btn.style.bottom = "20px";
        btn.style.right = "20px";
        document.body.appendChild(btn);
    }
}

addOpenOptionsButton();
setInterval(addOpenOptionsButton, 2000);
