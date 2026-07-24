/**
 * Lightweight EN/AR internationalisation + RTL toggle for the static site.
 * English is the source of truth (element text); Arabic lives in data-ar="…".
 * Language preference is stored in localStorage and shared across the shell
 * and the iframe sub-pages (same origin).
 */
(function () {
    function currentLang() {
        return localStorage.getItem("lang") === "ar" ? "ar" : "en";
    }

    function applyLang(doc) {
        var lang = currentLang();
        var html = doc.documentElement;
        html.setAttribute("lang", lang);
        html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

        var nodes = doc.querySelectorAll("[data-ar]");
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (!el.hasAttribute("data-en")) {
                el.setAttribute("data-en", el.textContent.trim());
            }
            el.textContent = lang === "ar"
                ? el.getAttribute("data-ar")
                : el.getAttribute("data-en");
        }

        var toggle = doc.getElementById("lang-toggle");
        if (toggle) {
            toggle.textContent = lang === "ar" ? "EN" : "ع";  // ع
            toggle.setAttribute(
                "aria-label",
                lang === "ar" ? "Switch to English" : "التبديل إلى العربية"
            );
        }
    }

    function toggleLang() {
        localStorage.setItem("lang", currentLang() === "ar" ? "en" : "ar");
        applyLang(document);
        var frame = document.getElementById("contentFrame");
        if (frame) {
            // reload the sub-page so its content (incl. the typewriter) re-renders
            try { frame.contentWindow.location.reload(); }
            catch (e) { frame.src = frame.src; }
        }
    }

    window.i18nApply = applyLang;
    window.toggleLang = toggleLang;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { applyLang(document); });
    } else {
        applyLang(document);
    }
})();
