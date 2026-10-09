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

/**
 * Typed role line: the line under the name on Home.
 *
 * Runs once per visit, not forever. The full line is on the page from the start, so
 * nothing waits on the animation. Once the page can actually be seen (loaded, fonts
 * in, tab in front) it holds, then erases and types a few focus areas the chips below
 * do not already show, returns to the full line, blinks the caret a few times and
 * stops. About twenty seconds, then still.
 *
 * Stays still (just the full line) when any of these hold:
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

    var TYPE = 55, ERASE = 26, HOLD = 1800, FIRST_HOLD = 3000, GAP = 340, SETTLE = 2400;
    // One pass: through the focus areas and back to the full line.
    var order = phrases.slice(1).concat([phrases[0]]);
    var step = -1;                          // index into order; -1 = the first hold
    var timer = null, next = null, nextDelay = 0, running = false, done = false;

    function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    function backdropOff() {
        // the shell's own class is the truth; standalone, this page's pre-paint class
        try { if (window.parent !== window) return window.parent.document.documentElement.classList.contains('no-backdrop'); }
        catch (e) {}
        return document.documentElement.classList.contains('no-backdrop');
    }
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
        next = fn; nextDelay = ms;
        if (document.hidden) { timer = null; return; }   // parked until the tab is seen
        timer = setTimeout(function () { timer = null; next = null; fn(); }, ms);
    }
    function busy(on) { line.classList.toggle('is-busy', on); }   // solid caret while moving
    function type(chars, n) {
        busy(true);
        show(chars.slice(0, n).join(''));
        if (n < chars.length) { later(TYPE, function () { type(chars, n + 1); }); return; }
        busy(false);
        if (step === order.length - 1) { later(SETTLE, finish); return; }   // back on the full line
        later(HOLD, function () { erase(chars.slice()); });
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
    function finish() {
        done = true;
        halt();
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
        later(FIRST_HOLD, function () { erase(split(phrases[0])); });
    }

    // One place decides whether it should be moving.
    function sync() {
        if (reduced() || backdropOff() || !fitsOneRow()) { if (running) halt(); return; }
        if (!running && !done) run();
    }
    window.typedSync = sync;

    reserve();
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
        if (next && !timer) later(step === -1 ? FIRST_HOLD : Math.min(nextDelay, HOLD), next);
    });
}

// Home: start the role line now, while this script runs at the end of <body>.
(function () {
    var typed = document.querySelector('.hero-role .typed');
    if (typed) initTypedRotator(typed);
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
