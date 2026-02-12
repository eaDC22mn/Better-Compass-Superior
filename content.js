// ---------------------------
// APPLY THEME
// ---------------------------
function applyTheme() {
    chrome.storage.sync.get(["theme"], (settings) => {
        const theme = settings.theme || "default";

        document.body.classList.forEach(cls => {
            if (cls.startsWith("theme-")) {
                document.body.classList.remove(cls);
            }
        });

        document.body.classList.add("theme-" + theme);
    });
}

applyTheme();





(function () {
  const picker = document.createElement("div");
  picker.style.cssText = `
    position: absolute;
    z-index: 9999;
    background: rgba(20, 20, 20, 0.95);
    color: #fff;
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
    if (!currentBlock) return;
    const color = hsl();
    preview.style.background = color;
    if (currentBlock) currentBlock.style.backgroundColor = color;
    const key = getKey(currentBlock);
    if (key) chrome.storage.local.set({ [key]: color });
  }

  function show(block) {
    if (!block) return;
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
    if (currentBlock === pinnedBlock) return;
    hideTimeout = setTimeout(() => {
      picker.style.display = "none";
      currentBlock = null;
    }, 8000);
  }

 function applySavedColors() {
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
}

  document.addEventListener("mouseover", e => {
    if (!e.target) return;
    if (
      e.target.closest(".x-box-inner, .x-box-target") ||
      e.target.closest(".menu-svg-icon.menu-svg-icon-calendar")
    ) return;
    const block = e.target.closest('[class*="timetable"], [class*="calendar"], .event');
    if (!block) return;
    show(block);
  });

  document.addEventListener("mouseout", e => {
    if (!e.relatedTarget || !e.relatedTarget.closest?.('[class*="timetable"], [class*="calendar"], .event')) {
      hideDelayed();
    }
  });

  document.addEventListener("contextmenu", e => {
    if (!e.target) return;
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

})();


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

        return true; // async
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
            sendResponse({ ok: true });
        });

        return true; // async
    }
});

// Inject a script into the page that can dispatch events
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
    btn.textContent = "BCS Settings";

    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.zIndex = "999999";
    btn.style.padding = "8px 12px";
    btn.style.borderRadius = "6px";
    btn.style.background = "#333";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("BCS_OPEN_OPTIONS"));
    });

    document.body.appendChild(btn);
}

addOpenOptionsButton();
setInterval(addOpenOptionsButton, 2000);