/**
 * Puts the About intro on the page.
 *
 * This used to type the text out a character at a time. On About that took 10.1
 * seconds before the paragraph was readable - longer than most visitors give a page
 * before deciding whether to stay - so the text now appears at once. The name is kept
 * so the call sites below did not have to change.
 *
 * @param {string} targetId - The ID of the target element
 * @param {string} text - The text to show
 */
function initTypewriter(targetId, text) {
    const typeTarget = document.getElementById(targetId);
    if (!typeTarget) return;
    typeTarget.textContent = text;
}

// Define text constants
const HOME_TEXT = "Hi, I'm Ibrahim Shaheen, a Digital Transformation professional specializing in AI, HRIS, and strategic digitalization. Currently at NEOM, I lead initiatives that turn complex processes into intelligent, automated systems, automating 90% of HR processes and earning SAP's Best HCM Innovation & Automation Award in KSA.";
const ABOUT_TEXT = "Hello! I'm Ibrahim Shaheen (Ibra), a Saudi Digital Transformation professional focused on AI, HRIS, and strategic digitalization.\n\nAs a People Technology Senior Specialist at NEOM, I lead initiatives that turn complex processes into intelligent, automated systems, automating 90% of HR processes and earning SAP's Best HCM Innovation & Automation Award in KSA.\n\nI'm passionate about using AI to solve real problems, from streamlining HRIS platforms like SAP SuccessFactors to building AI agents that support people around the clock.";

// Arabic (draft — pending review). Technical terms kept in Latin per convention.
const HOME_TEXT_AR = "مرحبًا، أنا إبراهيم شاهين، متخصّص في التحوّل الرقمي مع تركيز على الذكاء الاصطناعي وأنظمة الموارد البشرية (HRIS) والرقمنة الاستراتيجية. أعمل حاليًا في نيوم، حيث أقود مبادرات تُحوّل العمليات المعقّدة إلى أنظمة ذكية ومؤتمتة، حتى بلغت أتمتة عمليات الموارد البشرية 90%، وقد حصلتُ على جائزة SAP لأفضل ابتكار وأتمتة في نظام SAP SuccessFactors بالمملكة العربية السعودية.";
const ABOUT_TEXT_AR = "مرحبًا! أنا إبراهيم شاهين (إبرا)، متخصّص سعودي في التحوّل الرقمي مع تركيز على الذكاء الاصطناعي وأنظمة الموارد البشرية (HRIS) والرقمنة الاستراتيجية.\n\nبصفتي أخصائيًا أول في تقنيات الموارد البشرية لدى نيوم، أقود مبادرات تُحوّل العمليات المعقّدة إلى أنظمة ذكية ومؤتمتة، حتى بلغت أتمتة عمليات الموارد البشرية 90%، وقد حصلتُ على جائزة SAP لأفضل ابتكار وأتمتة في نظام SAP SuccessFactors بالمملكة العربية السعودية.\n\nأنا شغوف باستخدام الذكاء الاصطناعي لحل المشكلات الواقعية، من تبسيط منصّات أنظمة الموارد البشرية مثل SAP SuccessFactors إلى بناء وكلاء ذكاء اصطناعي يدعمون الأفراد على مدار الساعة.";

/* ---- shared by the typed pieces ----
   The shell's backdrop & animation switch calls window.typedSync() in this frame when
   it flips; every typed piece registers its own check here. */
var typedSyncs = [];
function registerTypedSync(fn) {
    typedSyncs.push(fn);
    window.typedSync = function () { typedSyncs.forEach(function (f) { f(); }); };
}
function motionReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function backdropIsOff() {
    // the shell's own class is the truth; standalone, this page's pre-paint class
    try { if (window.parent !== window) return window.parent.document.documentElement.classList.contains('no-backdrop'); }
    catch (e) {}
    return document.documentElement.classList.contains('no-backdrop');
}
function graphemes(s, ar) {
    if (window.Intl && Intl.Segmenter) {
        var seg = new Intl.Segmenter(ar ? 'ar' : 'en', { granularity: 'grapheme' });
        return Array.from(seg.segment(s), function (x) { return x.segment; });
    }
    return Array.from(s);
}
// Calls fn once this page can be seen: loaded (that is what makes the shell fade the
// frame in), fonts ready, and the tab in front.
function whenVisible(fn) {
    var loaded = new Promise(function (r) {
        if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true });
    });
    Promise.all([loaded, document.fonts && document.fonts.ready]).then(function () {
        function go() { setTimeout(fn, 160); }               // the shell's fade-in
        if (!document.hidden) { go(); return; }
        document.addEventListener('visibilitychange', function v() {
            if (document.hidden) return;
            document.removeEventListener('visibilitychange', v);
            go();
        });
    });
}

/**
 * Page heading types itself in: About, Experience, Projects, Contact.
 *
 * Once per visit, under a second. The heading's real text stays in the page (in
 * .type-in-text, which keeps its data-ar for i18n) and is only hidden visually while
 * a copy types in beside it, so screen readers always read the heading and i18n never
 * fights the animation. When the copy is complete the caret blinks a few times, then
 * the copy is removed and the real text shown again: same words, same place.
 * Skipped (heading simply shown) with reduced motion, with the backdrop & animation
 * switch off, or if the heading wraps onto a second row.
 *
 * @param {HTMLElement} h - a heading with class type-in and a .type-in-text child
 */
function initTypeIn(h) {
    var src = h.querySelector('.type-in-text');
    if (!src) return;
    var ar = document.documentElement.lang === 'ar';
    var text = ((ar && src.getAttribute('data-ar')) || src.textContent).replace(/\s+/g, ' ').trim();
    if (motionReduced() || backdropIsOff() || src.getClientRects().length > 1) return;

    var WJ = '\u2060';                     // glues the caret to the last letter
    var live = document.createElement('span');
    live.className = 'type-in-live';
    live.setAttribute('aria-hidden', 'true');
    var caret = document.createElement('span');
    caret.className = 'typed-caret';
    caret.setAttribute('aria-hidden', 'true');
    h.appendChild(live);
    h.appendChild(caret);
    h.classList.add('is-typing');           // real text hidden visually, caret showing

    var chars = graphemes(text, ar), n = 0, timer = null, over = false;
    var TYPE = Math.max(38, Math.min(70, 900 / chars.length));   // under a second in all
    function end() {
        if (over) return;
        over = true;
        clearTimeout(timer);
        live.remove();
        caret.remove();
        h.classList.remove('is-typing', 'is-busy');
    }
    function step() {
        n += 1;
        live.textContent = chars.slice(0, n).join('') + WJ;
        if (n < chars.length) { timer = setTimeout(step, TYPE); return; }
        h.classList.remove('is-busy');      // blink a few times, then done
        timer = setTimeout(end, 2200);
    }
    registerTypedSync(function () { if (motionReduced() || backdropIsOff()) end(); });
    whenVisible(function () {
        if (over) return;
        if (motionReduced() || backdropIsOff()) { end(); return; }
        h.classList.add('is-busy');
        timer = setTimeout(step, 120);
    });
}

/**
 * Typed role line: the line under the name on Home.
 *
 * When it is going to move, the line starts empty with the caret blinking; once the
 * page can actually be seen (loaded, fonts in, tab in front) it types the full line,
 * holds it, then erases and types a few focus areas the chips below do not already
 * show, comes back to the full line, and goes round again for as long as the page is
 * open. The name and summary are never typed, so nothing a visitor needs waits on it.
 * It stops (full line, still) the moment the backdrop & animation switch is turned
 * off or reduced motion is turned on, and pauses in a background tab.
 *
 * Shows the full line, still, from the first paint when any of these hold:
 *   - prefers-reduced-motion, checked live, so switching it on mid-visit stops it;
 *   - the backdrop is off. The shell's backdrop switch ("background & animation")
 *     governs all decorative motion; the shell calls window.typedSync when it flips;
 *   - the full line does not fit on one row (Arabic on a narrow phone). Typing a
 *     wrapping line makes words jump rows and leaves blank rows for short phrases.
 *
 * Letters are split by grapheme (Intl.Segmenter), so an Arabic shadda never comes
 * apart. The caret is an inline element glued to the last letter with a word joiner
 * (U+2060), so it can never break onto a row of its own; it is never absolutely
 * positioned (WebKit misplaces an absolute caret in right-to-left text).
 * Screen readers read the static line from a sibling .sr-only span; this span and the
 * caret are aria-hidden. If this script never runs, i18n translates the span from its
 * own data-ar; when it does run it takes that attribute off, so i18n leaves it alone.
 *
 * @param {HTMLElement} el - the span to type into, with data-phrases / data-phrases-ar
 */
function initTypedRotator(el) {
    var ar = document.documentElement.lang === 'ar';
    el.removeAttribute('data-ar');
    var phrases;
    try { phrases = JSON.parse(el.getAttribute(ar ? 'data-phrases-ar' : 'data-phrases')); }
    catch (e) { phrases = null; }
    if (!phrases || !phrases.length) return;
    var line = el.parentNode;
    var WJ = '⁠';
    function show(text) { el.textContent = text ? text + WJ : ''; }
    show(phrases[0]);                       // the right language before first paint
    if (phrases.length < 2) return;

    var seg = (window.Intl && Intl.Segmenter) ? new Intl.Segmenter(ar ? 'ar' : 'en', { granularity: 'grapheme' }) : null;
    function split(s) { return seg ? Array.from(seg.segment(s), function (x) { return x.segment; }) : Array.from(s); }

    var TYPE = 55, ERASE = 26, HOLD = 1800, FIRST_HOLD = 3000, GAP = 340, START = 250;
    // Each round: the full line, then the focus areas, then back to the full line.
    var order = phrases.slice(1).concat([phrases[0]]);
    var step = -1;                          // index into order; -1 = the opening full line
    var timer = null, next = null, nextDelay = 0, running = false, inFirstHold = false;

    var reduced = motionReduced, backdropOff = backdropIsOff;
    // Height of the line with the caret showing, so measuring never depends on state.
    function measure(text) {
        var had = line.classList.contains('is-typing');
        line.classList.add('is-typing');
        show(text);
        var h = line.getBoundingClientRect().height;
        if (!had) line.classList.remove('is-typing');
        return h;
    }
    // Rows the full line takes, with the caret showing: an inline span has one client
    // rect per row. (Measuring the line's height would read the reserved min-height.)
    function fitsOneRow() {
        var keep = el.textContent, had = line.classList.contains('is-typing');
        line.classList.add('is-typing');
        show(phrases[0]);
        var rows = el.getClientRects().length;
        if (!had) line.classList.remove('is-typing');
        el.textContent = keep;
        return rows <= 1;
    }
    function reserve() {
        var keep = el.textContent, tallest = 0;
        line.style.minHeight = '';
        phrases.forEach(function (p) { tallest = Math.max(tallest, measure(p)); });
        el.textContent = keep;
        line.style.minHeight = Math.ceil(tallest) + 'px';
    }

    function later(ms, fn) {
        next = fn; nextDelay = ms; inFirstHold = false;
        if (document.hidden) { timer = null; return; }   // parked until the tab is seen
        timer = setTimeout(function () { timer = null; next = null; fn(); }, ms);
    }
    function busy(on) { line.classList.toggle('is-busy', on); }   // solid caret while moving
    function type(chars, n) {
        busy(true);
        show(chars.slice(0, n).join(''));
        if (n < chars.length) { later(TYPE, function () { type(chars, n + 1); }); return; }
        busy(false);
        if (step === order.length - 1) step = -1;          // back on the full line: go round again
        later(step === -1 ? FIRST_HOLD : HOLD, function () { erase(chars.slice()); });
        if (step === -1) inFirstHold = true;
    }
    function erase(chars) {
        busy(true);
        if (!chars.length) {
            busy(false);
            step += 1;
            later(GAP, function () { type(split(order[step]), 1); });
            return;
        }
        chars.pop();
        show(chars.join(''));
        later(ERASE, function () { erase(chars); });
    }
    function halt() {
        if (timer) clearTimeout(timer);
        timer = null; next = null; running = false;
        show(phrases[0]);
        busy(false);
        line.classList.remove('is-typing');
    }
    function run() {
        running = true; step = -1;
        line.classList.add('is-typing');
        show('');
        later(START, function () { type(split(phrases[0]), 1); });
    }
    function moving() { return !reduced() && !backdropOff() && fitsOneRow(); }

    // One place decides whether it should be moving.
    function sync() {
        if (!moving()) { if (running || line.classList.contains('is-typing')) halt(); return; }
        if (!running) run();
    }
    registerTypedSync(sync);

    reserve();
    // If it is going to move, start empty with the caret, so the first paint does not
    // show the full line only to wipe it. (Re-checked on load, when fonts are in.)
    if (moving()) { line.classList.add('is-typing'); show(''); }
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', sync); else if (mq.addListener) mq.addListener(sync); }
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { reserve(); sync(); }, 150);
    });

    // Start only once the line can be seen: this frame's load event is what makes the
    // shell fade it in, fonts are blocking until ready, and a background tab waits.
    var loaded = new Promise(function (r) {
        if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true });
    });
    Promise.all([loaded, document.fonts && document.fonts.ready]).then(function () {
        reserve();
        setTimeout(sync, 160);              // the shell's fade-in
    });

    // Pause in a background tab. Resuming in the first hold restarts it in full, so the
    // full line is always seen before anything moves.
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (timer) { clearTimeout(timer); timer = null; }
            return;
        }
        if (next && !timer) {
            var first = inFirstHold;
            later(first ? FIRST_HOLD : Math.min(nextDelay, HOLD), next);
            inFirstHold = first;
        }
    });
}

// Start now, while this script runs at the end of <body>: Home's role line, and the
// page heading on every other page.
(function () {
    var typed = document.querySelector('.hero-role .typed');
    if (typed) initTypedRotator(typed);
    var heading = document.querySelector('.type-in');
    if (heading) initTypeIn(heading);
})();

function currentLang() {
    return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en';
}

// Auto-initialize based on page
document.addEventListener('DOMContentLoaded', function() {
    // For home page
    if (document.getElementById('type-target')) {
        initTypewriter('type-target', currentLang() === 'ar' ? HOME_TEXT_AR : HOME_TEXT);
    }
    
    // For about page
    if (document.getElementById('about-type-target')) {
        initTypewriter('about-type-target', currentLang() === 'ar' ? ABOUT_TEXT_AR : ABOUT_TEXT);
        
        // Fade in profile picture if it exists
        const profilePic = document.getElementById('profile-pic');
        if (profilePic) {
            profilePic.classList.add('fade-in');
        }
    }
});
