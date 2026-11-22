/* ==================================================================
   MAMAMIA 64  —  GAME INTRO  +  FIRST-TIME CONTROLS SCREEN
   ==================================================================

   HOW TO ADD THIS TO ANY GAME (only 2 steps):
   ------------------------------------------------------------------
   1) Put this file (mamamia64-intro.js) in the same folder as your game.

   2) In your game's HTML file, paste this line as the FIRST thing
      inside <body> (before your game's own scripts):

          <script src="mamamia64-intro.js"><\/script>

   WANT YOUR STUDIO INTRO FIRST? (Nano & Clock, then Mamamia 64)
   ------------------------------------------------------------------
      <script src="nano-clock-intro.js"><\/script>
      <script src="mamamia64-intro.js"><\/script>
   This intro waits for the Nano & Clock intro to finish, then plays.
   (It also works with clock-intro.js the same way.)

   CONTROLS SCREEN:
   ------------------------------------------------------------------
   The FIRST time someone plays, a "HOW TO PLAY" screen shows the
   controls after the logo. After that it is skipped (the browser
   remembers). Change the keys in the SETTINGS box to match your game!

   OPTIONAL — make your game wait until the intro is finished:
   ------------------------------------------------------------------
      if (window.Mamamia64Intro) {
          Mamamia64Intro.onDone(startMyGame);   // wait for the intro
      } else {
          startMyGame();                        // no intro? start anyway
      }

   OTHER THINGS YOU CAN CALL:
      Mamamia64Intro.skip();          // ends the intro right away
      Mamamia64Intro.play();          // plays the intro again
      Mamamia64Intro.showControls();  // shows the controls screen (e.g. from a pause menu)
      Mamamia64Intro.resetControls(); // forget it was seen -> shows again next time

   "Mamamia64Intro is not defined" ERROR?
      The game page could not find mamamia64-intro.js. Put it in the
      SAME folder as your game's .html file, spelled exactly the same.

   NOTE: Lines that start with //  are COMMENTS (notes for people).
   The computer ignores them. Change things in the SETTINGS box only.
   ================================================================== */

(function () {

  // ================================================================
  //  SETTINGS  —  change these!
  // ================================================================
  var SETTINGS = {
    title: "MAMAMIA",                 // the big bouncy word
    number: "64",                     // the big shiny spinning number
    tagline: "THE ADVENTURE BEGINS",  // small words underneath

    // colors for the letters (they take turns)
    letterColors: ["#ff3b3b", "#ffd23b", "#3bd16f", "#3b8bff"],

    // background colors: middle, around it, edges
    background: ["#4b3bff", "#2a1a9e", "#0d0838"],

    sound: true,          // true = sounds on, false = silent
    tapToStart: true,     // "press any key" first (needed for sound)
    canSkip: true,        // click / key to skip the logo
    holdTime: 1500,       // how long (ms) the finished logo stays

    // ---- CONTROLS SCREEN ----
    showControls: "first",   // "first" = only the first time someone plays
                             // "always" = every time
                             // "never"  = don't show it
    controlsTitle: "HOW TO PLAY",
    controlsHint: "PRESS ANY KEY TO PLAY",

    // Each line: the keys (each one becomes a little key button) and what it does.
    // Put "or" between keys to show the word "or".
    controls: [
      { keys: ["W", "A", "S", "D"],              action: "Move" },
      { keys: ["L"],                             action: "Jump (A)" },
      { keys: [","],                             action: "Punch / Attack (B)" },
      { keys: ["K"],                             action: "Crouch (Z)" },
      { keys: ["SHIFT"],                         action: "Camera (R)" },
      { keys: ["←", "↑", "↓", "→"],              action: "Move camera (C)" },
      { keys: ["SPACE"],                         action: "Start / Pause" },
      { keys: ["🎮"],                            action: "Controllers work too!" }
    ],

    saveName: "mamamia64-controls-seen"  // name used to remember (leave it)
  };
  // ================================================================
  //  (You don't need to change anything below this line.)
  // ================================================================

  var doneCallbacks = [], finished = false, active = false;
  var overlay, endTimer, audioCtx, phase = "", phaseAt = 0, mode = "intro";

  window.Mamamia64Intro = {
    onDone: function (fn) { if (finished) fn(); else doneCallbacks.push(fn); },
    skip: function () { if (active) leave(); },
    play: function () { if (!active) start("intro", true); },
    showControls: function () { if (!active) start("controls", true); },
    resetControls: function () { save(false); },
    settings: SETTINGS
  };

  // ---------- Remembering if the controls were seen ----------
  function seen() { try { return localStorage.getItem(SETTINGS.saveName) === "yes"; } catch (e) { return false; } }
  function save(yes) {
    try { if (yes) localStorage.setItem(SETTINGS.saveName, "yes"); else localStorage.removeItem(SETTINGS.saveName); } catch (e) {}
  }
  function needControls() {
    if (SETTINGS.showControls === "always") return true;
    if (SETTINGS.showControls === "never") return false;
    return !seen();
  }

  // ---------- The look (CSS) ----------
  var FONT = "'Arial Black','Arial Rounded MT Bold','Segoe UI Black',Impact,sans-serif";
  var NAVY = "#1b1464";
  var BG = SETTINGS.background;
  var css =
    ".mm-ov{position:fixed;inset:0;z-index:2147483646;overflow:hidden;cursor:pointer;user-select:none;" +
    "font-family:" + FONT + ";color:#fff;" +
    "background:radial-gradient(ellipse at 50% 60%," + BG[0] + " 0%," + BG[1] + " 45%," + BG[2] + " 100%)}" +
    ".mm-out{animation:mm-iris .8s cubic-bezier(.7,0,.3,1) forwards}" +
    "@keyframes mm-iris{from{clip-path:circle(120% at 50% 50%)}to{clip-path:circle(0% at 50% 50%)}}" +
    ".mm-press{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
    "font-size:clamp(14px,2.2vw,22px);letter-spacing:.3em;animation:mm-blink 1.2s infinite}" +
    "@keyframes mm-blink{50%{opacity:.25}}" +
    // stars
    ".mm-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;" +
    "animation:mm-tw 2s infinite ease-in-out}" +
    "@keyframes mm-tw{50%{opacity:.15;transform:scale(.5)}}" +
    // floor glow
    ".mm-floor{position:absolute;left:-10%;right:-10%;bottom:-30vh;height:55vh;border-radius:50%;" +
    "background:radial-gradient(ellipse at 50% 0%,#ffffff33,transparent 70%)}" +
    // logo
    ".mm-logo{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;" +
    "justify-content:center;transition:opacity .35s,transform .35s}" +
    ".mm-title{display:flex;align-items:flex-end;flex-wrap:nowrap;font-weight:900;line-height:1;" +
    "font-size:clamp(34px,10vw,140px);letter-spacing:.02em}" +
    ".mm-l{display:inline-block;transform:translateY(-140vh);transform-origin:50% 100%}" +
    ".mm-go .mm-l{animation:mm-drop .75s cubic-bezier(.3,0,.5,1) forwards,mm-wave .55s ease-in-out forwards}" +
    "@keyframes mm-drop{0%{transform:translateY(-140vh)}55%{transform:translateY(0) scale(1.15,.7)}" +
    "72%{transform:translateY(-.22em) scale(.92,1.1)}86%{transform:translateY(0) scale(1.05,.95)}100%{transform:none}}" +
    "@keyframes mm-wave{0%,100%{transform:none}40%{transform:translateY(-.25em) rotate(-6deg)}70%{transform:translateY(.04em)}}" +
    ".mm-numwrap{position:relative;display:inline-block;margin-left:.22em;perspective:700px}" +
    ".mm-num{display:inline-block;font-size:1.25em;opacity:0;" +
    "background:linear-gradient(180deg,#fffbd0 0%,#ffd84a 40%,#ff9a00 75%,#ff6a00 100%);" +
    "-webkit-background-clip:text;background-clip:text;color:transparent;" +
    "filter:drop-shadow(0 .04em 0 #c24a00) drop-shadow(0 .05em 0 #7a2a00) drop-shadow(0 .08em .08em #0009)}" +
    ".mm-go .mm-num{animation:mm-spin 1s cubic-bezier(.2,.9,.3,1.2) forwards}" +
    "@keyframes mm-spin{0%{opacity:0;transform:scale(0) rotateY(-900deg)}25%{opacity:1}100%{opacity:1;transform:none}}" +
    ".mm-spark{position:absolute;left:50%;top:50%;font-size:.3em;color:#fff6a0;opacity:0;" +
    "text-shadow:0 0 8px #ffd84a}" +
    ".mm-go .mm-spark{animation:mm-spark .9s ease-out forwards}" +
    "@keyframes mm-spark{0%{opacity:1;transform:translate(-50%,-50%) scale(.2)}" +
    "100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.2) rotate(180deg)}}" +
    ".mm-tag{margin-top:4vmin;font-size:clamp(11px,1.8vw,20px);letter-spacing:.5em;padding-left:.5em;" +
    "opacity:0;transform:translateY(14px);text-shadow:0 3px 0 " + NAVY + "}" +
    ".mm-go .mm-tag{animation:mm-up .6s cubic-bezier(.2,.8,.2,1) forwards}" +
    "@keyframes mm-up{to{opacity:1;transform:none}}" +
    ".mm-skip{position:absolute;right:18px;bottom:14px;font-size:11px;letter-spacing:.2em;opacity:.6;" +
    "font-family:Arial,sans-serif;font-weight:700}" +
    // controls screen
    ".mm-ctrl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
    "padding:16px;box-sizing:border-box;opacity:0;pointer-events:none}" +
    ".mm-showctrl .mm-logo{opacity:0;transform:scale(.8)}" +
    ".mm-showctrl .mm-skip{display:none}" +
    ".mm-showctrl .mm-ctrl{animation:mm-pop .5s cubic-bezier(.2,1.5,.4,1) forwards}" +
    "@keyframes mm-pop{0%{opacity:0;transform:scale(.6) rotate(-3deg)}100%{opacity:1;transform:none}}" +
    ".mm-card{background:#fff;color:" + NAVY + ";border:5px solid " + NAVY + ";border-radius:24px;" +
    "box-shadow:0 10px 0 " + NAVY + ",0 24px 40px #0007;padding:clamp(18px,4vmin,36px) clamp(18px,5vmin,48px);" +
    "max-width:560px;width:100%;box-sizing:border-box;max-height:calc(100vh - 40px);overflow:auto}" +
    ".mm-ctitle{text-align:center;font-size:clamp(22px,4.5vw,40px);margin-bottom:.6em;letter-spacing:.04em}" +
    ".mm-ctitle span{display:inline-block}" +
    ".mm-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 0;" +
    "border-top:2px dashed #1b146422}" +
    ".mm-row:first-child{border-top:0}" +
    ".mm-keys{display:flex;flex-wrap:wrap;align-items:center;gap:5px}" +
    ".mm-key{display:inline-block;min-width:1.9em;padding:.35em .5em;box-sizing:border-box;text-align:center;" +
    "font-size:clamp(11px,1.8vw,15px);background:#f4f2ff;border:2px solid " + NAVY + ";border-bottom-width:5px;" +
    "border-radius:8px;line-height:1}" +
    ".mm-or{font-family:Arial,sans-serif;font-weight:700;font-size:12px;opacity:.55;margin:0 3px}" +
    ".mm-act{font-family:Arial,sans-serif;font-weight:800;font-size:clamp(13px,2vw,17px);text-align:right}" +
    ".mm-hint{margin-top:1.1em;text-align:center;font-size:clamp(12px,1.9vw,16px);letter-spacing:.15em;" +
    "color:#ff3b3b;animation:mm-blink 1.2s infinite}";

  // ---------- Sounds (all made with code, no files needed) ----------
  function getAudio() {
    if (!SETTINGS.sound) return null;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }

  function tone(a, at, type, f1, f2, dur, vol) {   // one beep that can slide in pitch
    var t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }

  function boing(a, at, f) {                        // letter lands
    tone(a, at, "square", f * 0.5, f, 0.18, 0.08);
    tone(a, at, "triangle", f, f * 1.5, 0.25, 0.18);
  }

  function spinUp(a, at) {                          // number spins in
    tone(a, at, "sawtooth", 200, 1600, 0.9, 0.05);
    tone(a, at, "triangle", 300, 2400, 0.9, 0.1);
  }

  function ding(a, at) {                            // shiny chord
    [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) {
      tone(a, at + i * 0.03, "sine", f, f, 1.4, 0.12);
    });
  }

  function jingle(a, at) {                          // happy little tune
    var notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach(function (f, i) { tone(a, at + i * 0.09, "square", f, f, 0.14, 0.06); });
  }

  // C major pentatonic, going up
  var SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760];

  // ---------- Building the screen ----------
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function darker(hex, k) {                         // makes a darker color for the 3D sides
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.round(r * k) + "," + Math.round(g * k) + "," + Math.round(b * k) + ")";
  }

  function chunky(color) {                          // stacked shadows = 3D block letters
    var side = darker(color, 0.55), s = [];
    for (var i = 1; i <= 7; i++) s.push("0 " + (i * 0.012).toFixed(3) + "em 0 " + side);
    s.push("0 .03em 0 " + NAVY, "0 .1em .02em " + NAVY, "0 .16em .14em rgba(0,0,0,.45)");
    return s.join(",");
  }

  function starsHTML() {
    var h = "";
    for (var i = 0; i < 45; i++) {
      h += '<div class="mm-star" style="left:' + rnd(0, 100).toFixed(1) + "%;top:" + rnd(0, 70).toFixed(1) +
        "%;animation-delay:" + rnd(0, 2).toFixed(2) + "s;opacity:" + rnd(0.3, 1).toFixed(2) + '"></div>';
    }
    return h + '<div class="mm-floor"></div>';
  }

  function controlsHTML() {
    var rows = "";
    SETTINGS.controls.forEach(function (c) {
      var keys = "";
      c.keys.forEach(function (k) {
        keys += (k === "or") ? '<span class="mm-or">or</span>' : '<span class="mm-key">' + esc(k) + "</span>";
      });
      rows += '<div class="mm-row"><div class="mm-keys">' + keys + '</div><div class="mm-act">' + esc(c.action) + "</div></div>";
    });
    var title = "", cols = SETTINGS.letterColors;
    for (var i = 0, n = 0; i < SETTINGS.controlsTitle.length; i++) {
      var ch = SETTINGS.controlsTitle[i];
      title += ch === " " ? " " : '<span style="color:' + cols[n++ % cols.length] + ";text-shadow:0 3px 0 " + NAVY + '">' + esc(ch) + "</span>";
    }
    return '<div class="mm-ctrl"><div class="mm-card"><div class="mm-ctitle">' + title + "</div>" +
      '<div class="mm-rows">' + rows + '</div><div class="mm-hint">' + esc(SETTINGS.controlsHint) + "</div></div></div>";
  }

  function buildLogo() {
    var html = "", times = [], t = 0.5, cols = SETTINGS.letterColors, word = SETTINGS.title;
    var count = 0, i;
    for (i = 0; i < word.length; i++) if (word[i] !== " ") count++;
    var numAt = 0.5 + count * 0.13 + 0.4;
    var tagAt = numAt + 1.0;
    var waveAt = numAt + 1.35;

    for (i = 0, count = 0; i < word.length; i++) {
      var ch = word[i];
      if (ch === " ") { html += '<span style="display:inline-block;width:.3em"></span>'; continue; }
      var c = cols[count % cols.length];
      html += '<span class="mm-l" style="color:' + c + ";text-shadow:" + chunky(c) + ";" +
        "animation-delay:" + t.toFixed(2) + "s," + (waveAt + count * 0.07).toFixed(2) + 's">' + esc(ch) + "</span>";
      times.push(t + 0.4);   // the moment it lands
      t += 0.13; count++;
    }

    var sparks = "";
    for (i = 0; i < 14; i++) {
      var ang = (i / 14) * Math.PI * 2 + rnd(-0.2, 0.2), d = rnd(1.4, 2.4);
      sparks += '<span class="mm-spark" style="--dx:' + (Math.cos(ang) * d).toFixed(2) + "em;--dy:" +
        (Math.sin(ang) * d).toFixed(2) + "em;animation-delay:" + (numAt + 0.75).toFixed(2) + 's">✦</span>';
    }

    overlay.innerHTML = starsHTML() +
      '<div class="mm-logo"><div class="mm-title">' + html +
      '<span class="mm-numwrap"><span class="mm-num" style="animation-delay:' + numAt.toFixed(2) + 's">' +
      esc(SETTINGS.number) + "</span>" + sparks + "</span></div>" +
      '<div class="mm-tag" style="animation-delay:' + tagAt.toFixed(2) + 's">' + esc(SETTINGS.tagline) + "</div></div>" +
      controlsHTML() +
      (SETTINGS.canSkip ? '<div class="mm-skip">CLICK TO SKIP</div>' : "");

    return { times: times, numAt: numAt, tagAt: tagAt, waveAt: waveAt, count: count };
  }

  // ---------- The steps ----------
  function showLogo() {
    phase = "logo"; phaseAt = performance.now();
    var info = buildLogo();
    void overlay.offsetWidth;
    overlay.classList.add("mm-go");

    var a = getAudio();
    if (a) {
      info.times.forEach(function (t, i) { boing(a, t, SCALE[i % SCALE.length]); });
      spinUp(a, info.numAt);
      ding(a, info.numAt + 0.8);
      jingle(a, info.tagAt);
      for (var i = 0; i < info.count; i++) tone(a, info.waveAt + i * 0.07 + 0.2, "triangle", SCALE[(i + 3) % SCALE.length] * 2, SCALE[(i + 3) % SCALE.length] * 2, 0.12, 0.06);
    }
    endTimer = setTimeout(afterLogo, (info.waveAt + info.count * 0.07 + 0.6) * 1000 + SETTINGS.holdTime);
  }

  function afterLogo() {
    clearTimeout(endTimer);
    if (needControls()) showControlsPanel();
    else leave();
  }

  function showControlsPanel() {
    phase = "controls"; phaseAt = performance.now();
    overlay.classList.add("mm-showctrl");
    save(true);
    var a = getAudio();
    if (a) { tone(a, 0, "triangle", 400, 900, 0.2, 0.15); tone(a, 0.08, "sine", 1318.5, 1318.5, 0.4, 0.08); }
  }

  function leave() {
    if (!active || phase === "leaving") return;
    phase = "leaving";
    clearTimeout(endTimer);
    var ov = overlay;
    var a = getAudio();
    if (a) tone(a, 0, "triangle", 1200, 150, 0.6, 0.15);
    ov.classList.add("mm-out");
    setTimeout(function () {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      active = false; finished = true;
      var list = doneCallbacks; doneCallbacks = [];
      list.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    }, 820);
  }

  // what happens when you press a key or click
  function poke() {
    var since = performance.now() - phaseAt;
    if (phase === "prompt") { getAudio(); showLogo(); }
    else if (phase === "logo" && SETTINGS.canSkip && since > 400) afterLogo();
    else if (phase === "controls" && since > 700) leave();
  }

  // Keys: start / skip, and keep them away from the game while the intro is on
  window.addEventListener("keydown", function (e) {
    if (!active) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (!e.repeat) poke();
  }, true);

  // ---------- Start ----------
  function start(m, noPrompt) {
    mode = m; finished = false; active = true;
    if (!document.getElementById("mm-style")) {
      var st = document.createElement("style");
      st.id = "mm-style"; st.textContent = css;
      document.head.appendChild(st);
    }
    overlay = document.createElement("div");
    overlay.className = "mm-ov";
    overlay.addEventListener("click", poke);
    document.body.appendChild(overlay);

    if (mode === "controls") {               // just the controls screen
      overlay.innerHTML = starsHTML() + controlsHTML();
      void overlay.offsetWidth;
      showControlsPanel();
    } else if (SETTINGS.tapToStart && !noPrompt) {
      phase = "prompt";
      overlay.innerHTML = starsHTML() + '<div class="mm-press">PRESS ANY KEY</div>';
    } else {
      showLogo();
    }
  }

  function boot() {
    // If a studio intro (Nano & Clock / C-L-O-C-K) is on this page, wait for it first.
    // The player already pressed a key for that one, so no "press any key" here.
    var before = window.NanoClockIntro || window.ClockIntro;
    if (before && before.onDone) before.onDone(function () { start("intro", true); });
    else start("intro", false);
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);

})();
