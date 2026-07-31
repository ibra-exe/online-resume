/**
 * Slow pixel field for the "circuit" background variant (?tech=on).
 *
 * An even lattice of cells — one every 30px, so two to each 60px grid square —
 * each fading up and back down on its own long cycle. Position is a fixed
 * lattice and only the *timing* varies, so the field is evenly distributed by
 * construction: no part of the screen is ever busier than another, and there is
 * nothing to drift, clump or die out.
 *
 * This started as Conway's Game of Life, which is what the effect it is modelled
 * on uses. Life is the wrong tool here: it inherently produces clusters and
 * empty regions, wanders, and settles into blinkers that then need topping up
 * with fresh random soup. All of that reads as busy and arbitrary. A staggered
 * lattice gives the same "board quietly doing something" impression while
 * staying calm and uniform.
 *
 * Each cell is dark for most of its cycle and rises and falls smoothly over a
 * few seconds, at a low peak alpha. About a third are lit at any moment and most
 * of those are barely visible, which is what keeps it in the background.
 *
 * Paused whenever the backdrop is switched off (html.no-starfield) — the loop is
 * cancelled outright rather than drawing into a hidden layer, so a visitor who
 * prefers the flat black background pays nothing for this. requestAnimationFrame
 * rather than setInterval, so the browser also parks it in a hidden tab instead of
 * burning battery behind another window.
 */
(function () {
    var canvas = document.getElementById("tech-cells");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");

    var STEP = 30;              // css px between cells; two to a 60px grid square
    var SIZE = 9;               // css px of the cell itself, so cells never touch
    var INSET = 10;             // where the cell sits inside its step
    /* Timing is what makes this calm rather than busy. A cell takes
       PERIOD * LIT / 2 to go from dark to its peak — 2.6 to 5.2 seconds here — so
       at any instant nothing on screen is moving quickly.

       Two earlier passes bracket this: 8-14s periods over a narrower lit window
       gave a 1.2s fade, which still read as blinking; 20-40s gave a 4-8s fade,
       which was calm but sluggish. This sits between them, nearer the slow end.
       To retune, change only these two numbers — everything else is derived. */
    var FRAME_MS = 70;          // ~14fps; a 2.6s fade moves ~0.013 alpha per frame,
                                // one quantisation step, so no visible stepping
    var LEVELS = 24;            // alpha buckets (see draw) — steps are imperceptible
    var PERIOD_MIN = 13000;     // ms for one full dark -> lit -> dark cycle
    var PERIOD_MAX = 26000;
    var LIT = 0.4;              // fraction of its cycle a cell is lit at all
    var PEAK_MIN = 0.12;        // dimmest a cell ever gets at its brightest
    var PEAK_MAX = 0.3;         // and the brightest

    var still =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var dpr = 1, count = 0;
    var xs, ys, phase, period, peak;
    var buckets = [];
    var raf = null, last = 0, acc = 0;

    for (var b = 0; b < LEVELS; b++) buckets.push([]);

    /* Deterministic per-cell values: the same cell always gets the same phase and
       period, so nothing shifts around between frames, and the pattern of who is
       lit when is fixed rather than re-rolled. */
    function hash(i, j, salt) {
        var v = Math.sin(i * 12.9898 + j * 78.233 + salt * 37.719) * 43758.5453;
        return v - Math.floor(v);
    }

    function build() {
        var w = canvas.clientWidth || window.innerWidth;
        var h = canvas.clientHeight || window.innerHeight;
        // Capped at 2: past that the extra pixels buy nothing on 9px squares.
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);

        var cols = Math.ceil(w / STEP);
        var rows = Math.ceil(h / STEP);
        count = cols * rows;
        xs = new Int16Array(count);
        ys = new Int16Array(count);
        phase = new Float32Array(count);
        period = new Float32Array(count);
        peak = new Float32Array(count);

        var k = 0;
        for (var j = 0; j < rows; j++) {
            for (var i = 0; i < cols; i++) {
                xs[k] = i * STEP + INSET;
                ys[k] = j * STEP + INSET;
                phase[k] = hash(i, j, 1);
                period[k] = PERIOD_MIN + hash(i, j, 2) * (PERIOD_MAX - PERIOD_MIN);
                peak[k] = PEAK_MIN + hash(i, j, 3) * (PEAK_MAX - PEAK_MIN);
                k++;
            }
        }
    }

    function draw(now) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var i;
        for (i = 0; i < LEVELS; i++) buckets[i].length = 0;

        /* Bucket by quantised alpha, then draw a bucket at a time. Setting
           fillStyle is the expensive part of a canvas fill, so this pays it 20
           times a frame instead of once per cell. */
        for (i = 0; i < count; i++) {
            var u = (now / period[i] + phase[i]) % 1;
            if (u >= LIT) continue;                       // dark for most of the cycle
            var a = Math.sin(Math.PI * (u / LIT)) * peak[i];   // smooth rise and fall
            var level = Math.round((a / PEAK_MAX) * (LEVELS - 1));
            if (level > 0) buckets[level].push(i);
        }

        var s = SIZE * dpr;
        for (var lv = 1; lv < LEVELS; lv++) {
            var bucket = buckets[lv];
            if (!bucket.length) continue;
            var alpha = ((lv / (LEVELS - 1)) * PEAK_MAX).toFixed(3);
            ctx.fillStyle = "rgba(183, 102, 255, " + alpha + ")";
            for (i = 0; i < bucket.length; i++) {
                var c = bucket[i];
                ctx.fillRect(xs[c] * dpr, ys[c] * dpr, s, s);
            }
        }
    }

    function frame(t) {
        raf = window.requestAnimationFrame(frame);
        if (!last) last = t;
        acc += t - last;
        last = t;
        if (acc < FRAME_MS) return;   // rAF runs at 60fps; ~20 is plenty for a slow fade
        acc = 0;
        draw(t);
    }

    function start() {
        if (raf !== null) return;
        if (!count) build();
        if (still) { draw(0); return; }   // one static frame, no loop
        last = 0;
        acc = 0;
        raf = window.requestAnimationFrame(frame);
    }

    function stop() {
        if (raf !== null) {
            window.cancelAnimationFrame(raf);
            raf = null;
        }
    }

    function backdropOn() {
        return !document.documentElement.classList.contains("no-starfield");
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
        if (!backdropOn()) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { stop(); build(); start(); }, 200);
    });

    /* Called by the backdrop toggle in i18n.js, which owns the preference itself. */
    window.techBgSync = function () {
        if (backdropOn()) start();
        else stop();
    };

    window.techBgSync();
})();
