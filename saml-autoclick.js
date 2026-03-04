(function () {
    function clickButton() {
        const btn = document.getElementById("SamlLoginButton");
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    }

    if (clickButton()) return;

    const observer = new MutationObserver(() => {
        if (clickButton()) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
