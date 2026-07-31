/**
 * Lightweight EN/AR internationalisation + RTL toggle for the static site.
 * English is the source of truth (the element's own markup); Arabic lives in
 * data-ar="…" as plain text. The original English markup is snapshotted into
 * data-en-html so switching back restores inline tags like <strong>.
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

            /* Snapshot the original English *markup* once, before anything
               overwrites it. Some data-ar elements wrap inline markup — e.g.
               <li data-ar="…">Led <strong>PeopleGPT</strong>, …</li> — and the
               bold sits mid-sentence, so it cannot be split into leaf spans
               without splitting the Arabic sentence too.

               Kept on the element rather than in a JS Map because the shell and
               each sub-page run their own copy of this script against the same
               document; an attribute gives them one shared source of truth.
               The sub-page's own copy always runs first (DOMContentLoaded
               precedes the shell's iframe load handler), so the snapshot is
               always taken from pristine English. */
            if (!el.hasAttribute("data-en-html")) {
                el.setAttribute("data-en-html", el.innerHTML);
            }

            if (lang === "ar") {
                el.textContent = el.getAttribute("data-ar");
            } else {
                // Restore markup, not just text — assigning textContent here is
                // what previously stripped every <strong> on the Projects page,
                // in English as well as Arabic.
                el.innerHTML = el.getAttribute("data-en-html");
            }
        }

        var toggle = doc.getElementById("lang-toggle");
        if (toggle) {
            toggle.textContent = lang === "ar" ? "EN" : "ع";  // ع
            toggle.setAttribute(
                "aria-label",
                lang === "ar" ? "Switch to English" : "التبديل إلى العربية"
            );
        }

        // Keep the backdrop buttons' labels in the current language
        applyStarfieldState(doc);
        applyTechState(doc);
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

    /* ---- Circuit background preference ---- */
    /* The alternative backdrop being trialled against the starfield: a trace grid
       with Game-of-Life cells on it. Deliberately independent of the starfield, so
       all four combinations are reachable. Off by default — a visitor who has never
       touched it still gets the starfield. Same split as above: the class is set
       pre-paint in <head>, this only handles the click, the label, and starting or
       stopping the animation loop in tech-bg.js. */
    function techOn() {
        return localStorage.getItem("tech") === "on";
    }

    function applyTechState(doc) {
        var btn = doc.getElementById("tech-toggle");
        if (!btn) return;  // only the shell has the control
        var on = techOn();
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.setAttribute(
            "aria-label",
            currentLang() === "ar"
                ? (on ? "إخفاء الخلفية التقنية" : "إظهار الخلفية التقنية")
                : (on ? "Turn off the circuit background" : "Turn on the circuit background")
        );
    }

    function toggleTech() {
        localStorage.setItem("tech", techOn() ? "off" : "on");
        document.documentElement.classList.toggle("tech-bg", techOn());
        applyTechState(document);
        syncPrefUrl("tech", techOn() ? "on" : null);
        // Start or cancel the cell loop, so the variant costs nothing while off
        if (window.techBgSync) window.techBgSync();
    }

    /* Keep the address bar in step with the current view, so the URL is always
       copy-pasteable as "what I am looking at right now". Defaults are omitted
       rather than spelled out, so a plain visit keeps a clean URL.
       Skipped inside the shell's iframe — that is not the URL the visitor sees,
       and writing history from a frame would touch the frame's own entry. */
    function syncPrefUrl(key, value) {
        if (window.self !== window.top) return;
        try {
            var url = new URL(location.href);
            if (value === null) url.searchParams.delete(key);
            else url.searchParams.set(key, value);
            history.replaceState(history.state, "", url);
        } catch (e) {}
    }

    function toggleStarfield() {
        localStorage.setItem("starfield", starfieldOn() ? "off" : "on");
        document.documentElement.classList.toggle("no-starfield", !starfieldOn());
        applyStarfieldState(document);
        syncPrefUrl("stars", starfieldOn() ? null : "off");
    }

    function toggleLang() {
        localStorage.setItem("lang", currentLang() === "ar" ? "en" : "ar");
        applyLang(document);
        syncPrefUrl("lang", currentLang() === "ar" ? "ar" : null);
        var frame = document.getElementById("contentFrame");
        if (frame) {
            // reload the sub-page so its content (incl. the typewriter) re-renders
            try { frame.contentWindow.location.reload(); }
            catch (e) { frame.src = frame.src; }
        }
    }

    /* Wire the header controls here rather than with inline onclick attributes.
       This script is deferred, so it executes after the buttons are parsed —
       with inline handlers there was a brief window where a button was painted
       and clickable but the function did not exist yet, so the click silently
       did nothing. Attaching the listener in the same task that defines the
       handler closes that window by construction. */
    function wireControls(doc) {
        var lang = doc.getElementById("lang-toggle");
        if (lang) lang.addEventListener("click", toggleLang);

        var starfield = doc.getElementById("starfield-toggle");
        if (starfield) starfield.addEventListener("click", toggleStarfield);

        var tech = doc.getElementById("tech-toggle");
        if (tech) tech.addEventListener("click", toggleTech);
    }

    window.i18nApply = applyLang;
    window.toggleLang = toggleLang;
    window.toggleStarfield = toggleStarfield;
    window.toggleTech = toggleTech;

    /* Only for this document — never for the iframe's, which has no controls and
       whose applyLang runs via i18nApply (calling this there would double-bind). */
    function init() {
        applyLang(document);
        wireControls(document);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
