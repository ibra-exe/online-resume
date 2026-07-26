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

        // Keep the starfield button's label in the current language
        applyStarfieldState(doc);
    }

    /* ---- Starfield preference ---- */
    /* The class itself is applied by a tiny inline script in each page's <head>
       so there is never a flash of stars before the preference takes effect.
       This only handles the click and the button's label/state. */
    function starfieldOn() {
        return localStorage.getItem("starfield") !== "off";
    }

    function applyStarfieldState(doc) {
        var btn = doc.getElementById("starfield-toggle");
        if (!btn) return;  // only the shell and 404 have the control
        var on = starfieldOn();
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.setAttribute(
            "aria-label",
            currentLang() === "ar"
                ? (on ? "إخفاء النجوم" : "إظهار النجوم")
                : (on ? "Turn off the starfield" : "Turn on the starfield")
        );
    }

    function toggleStarfield() {
        localStorage.setItem("starfield", starfieldOn() ? "off" : "on");
        document.documentElement.classList.toggle("no-starfield", !starfieldOn());
        applyStarfieldState(document);
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
    window.toggleStarfield = toggleStarfield;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { applyLang(document); });
    } else {
        applyLang(document);
    }
})();
