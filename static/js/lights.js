/* ==========================================================================
   OdysseyArena — Turn On Lights
   A faithful miniature of the environment in Appendix A.1: N lights, a hidden
   partial order, one activation condition per light over lights earlier in
   that order (AND / OR / NOT), one toggle per step, a generic failure message
   when the condition does not hold. Every instance is checked solvable by
   search and the shortest solution is kept.

   OdysseyLightsCore  the instance generator, the solver and the bulb markup,
                      shared by the hero tile (hero.js) and the console below
   OdysseyLights      the playable console (Environments section, "Play")
   ========================================================================== */
window.OdysseyLightsCore = (function () {
  "use strict";

  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* A condition is {kind, a, b, na, nb}: kind "true" | "one" | "and" | "or";
     a, b are light indices; na, nb negate them. */
  function evalCond(c, s) {
    function lit(i, neg) { var v = (s >> i) & 1; return neg ? !v : !!v; }
    if (c.kind === "true") return true;
    if (c.kind === "one") return lit(c.a, c.na);
    if (c.kind === "and") return lit(c.a, c.na) && lit(c.b, c.nb);
    return lit(c.a, c.na) || lit(c.b, c.nb);
  }

  function makeRules(n) {
    var order = shuffle(Array.apply(null, Array(n)).map(function (_, i) { return i; }));
    var cond = new Array(n);
    cond[order[0]] = { kind: "true" };
    for (var k = 1; k < n; k++) {
      var i = order[k];
      var pool = order.slice(0, k);
      var two = k >= 2 && Math.random() < 0.55;
      var a = pool[rnd(pool.length)];
      if (!two) {
        cond[i] = { kind: "one", a: a, na: Math.random() < 0.28 };
      } else {
        var b = a;
        while (b === a) b = pool[rnd(pool.length)];
        cond[i] = Math.random() < 0.5
          ? { kind: "and", a: a, b: b, na: false, nb: Math.random() < 0.4 }
          : { kind: "or", a: a, b: b, na: false, nb: false };
      }
    }
    return { n: n, order: order, cond: cond };
  }

  /* Breadth-first search over the 2^n states; returns the shortest sequence
     of toggles from all-off to all-on, or null. */
  function solve(p) {
    var goal = (1 << p.n) - 1;
    var prev = new Int32Array(1 << p.n).fill(-1);
    var via = new Int8Array(1 << p.n).fill(-1);
    var seen = new Uint8Array(1 << p.n);
    var q = [0]; seen[0] = 1;
    for (var h = 0; h < q.length; h++) {
      var s = q[h];
      if (s === goal) {
        var path = [];
        while (s !== 0) { path.push(via[s]); s = prev[s]; }
        return path.reverse();
      }
      for (var i = 0; i < p.n; i++) {
        if (!evalCond(p.cond[i], s)) continue;
        var t = s ^ (1 << i);
        if (!seen[t]) { seen[t] = 1; prev[t] = s; via[t] = i; q.push(t); }
      }
    }
    return null;
  }

  function makePuzzle(n, minSteps) {
    var best = null;
    for (var tries = 0; tries < 400; tries++) {
      var p = makeRules(n);
      var path = solve(p);
      if (!path) continue;
      p.path = path; p.optimal = path.length;
      if (path.length >= minSteps) return p;
      if (!best || path.length > best.optimal) best = p;
    }
    return best;
  }

  function condText(c) {
    function lit(i, neg) { return "<b>light " + (i + 1) + "</b> is " + (neg ? "off" : "on"); }
    if (c.kind === "true") return "always responds";
    if (c.kind === "one") return "responds when " + lit(c.a, c.na);
    if (c.kind === "and") return "responds when " + lit(c.a, c.na) + " and " + lit(c.b, c.nb);
    return "responds when " + lit(c.a, c.na) + " or " + lit(c.b, c.nb);
  }

  /* One set of gradients for every bulb on the page. */
  function ensureDefs() {
    if (document.getElementById("bulbOn")) return;
    var d = document.createElement("div");
    d.className = "bulb-defs";
    d.setAttribute("aria-hidden", "true");
    d.innerHTML =
      '<svg width="0" height="0"><defs>' +
        '<radialGradient id="bulbOn" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#fff7d9"/><stop offset="0.42" stop-color="#ffd166"/><stop offset="1" stop-color="#f08c0a"/></radialGradient>' +
        '<radialGradient id="bulbOff" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.03"/></radialGradient>' +
        '<radialGradient id="bulbOffLight" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#142524" stop-opacity="0.04"/><stop offset="1" stop-color="#142524" stop-opacity="0.14"/></radialGradient>' +
        '<linearGradient id="bulbScrew" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e9a98"/><stop offset="0.5" stop-color="#e3e9e7"/><stop offset="1" stop-color="#6f7c7a"/></linearGradient>' +
        '<filter id="bulbBloom" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>' +
      "</defs></svg>";
    document.body.appendChild(d);
  }

  var BULB =
    '<svg class="bulb" viewBox="0 0 48 64" aria-hidden="true">' +
      '<circle class="bloom" cx="24" cy="23" r="20" filter="url(#bulbBloom)"/>' +
      '<path class="glass" d="M24 3C13 3 5 11 5 21c0 7 3.8 11 8 15.5V43h22v-6.5c4.2-4.5 8-8.5 8-15.5C43 11 35 3 24 3Z"/>' +
      '<ellipse class="sheen" cx="16.5" cy="17" rx="4.2" ry="7.5" transform="rotate(-18 16.5 17)"/>' +
      '<path class="fil" d="M18 36l2.5-9 3.5 5 3.5-5 2.5 9"/>' +
      '<rect class="screw" x="14" y="44" width="20" height="3.6" rx="1.4"/>' +
      '<rect class="screw" x="14" y="49" width="20" height="3.6" rx="1.4"/>' +
      '<rect class="screw" x="15" y="54" width="18" height="3.2" rx="1.4"/>' +
      '<rect class="cap" x="18" y="58" width="12" height="4.5" rx="2"/>' +
    "</svg>";

  return { makePuzzle: makePuzzle, evalCond: evalCond, condText: condText, ensureDefs: ensureDefs, BULB: BULB };
})();


/* --------------------------------------------------------------------------
   The playable console
   -------------------------------------------------------------------------- */
window.OdysseyLights = function (root, opts) {
  "use strict";
  opts = opts || {};
  var Core = window.OdysseyLightsCore;
  Core.ensureDefs();

  var DIFF = {
    easy:   { n: 5, minSteps: 5,  label: "5 lights" },
    medium: { n: 7, minSteps: 8,  label: "7 lights" },
    hard:   { n: 9, minSteps: 11, label: "9 lights" }
  };
  var state = { diff: opts.difficulty || "medium", puzzle: null, s: 0, steps: 0, done: false, revealed: false, log: [] };

  root.classList.add("pg");
  root.innerHTML =
    '<div class="pg-stage">' +
      '<div class="pg-top"><span>Goal: <b>every light on</b>. A light only responds when its hidden condition holds.</span>' +
        '<span class="steps">step <b class="pg-n">0</b></span></div>' +
      '<div class="pg-bulbs" role="group" aria-label="Lights"></div>' +
      '<div class="pg-log" aria-live="polite" aria-label="Interaction log"></div>' +
      '<div class="pg-done" aria-hidden="true"><div class="box"><h4>All lights on</h4><p class="pg-done-p"></p>' +
        '<button type="button" class="wt-btn pg-again">New instance</button></div></div>' +
      '<div class="pg-rules" aria-hidden="true"><h4>Hidden rules of this instance<button type="button" class="pg-close">Hide</button></h4><ul></ul></div>' +
    "</div>" +
    '<div class="pg-foot">' +
      '<button type="button" class="wt-btn pg-new">New instance</button>' +
      '<button type="button" class="wt-btn amber pg-reveal" aria-pressed="false">Reveal rules</button>' +
      '<div class="seg pg-diff" role="group" aria-label="Difficulty"></div>' +
      '<span class="hint">Click a bulb. The log is what an agent is given.</span>' +
    "</div>";

  var elBulbs = root.querySelector(".pg-bulbs");
  var elLog = root.querySelector(".pg-log");
  var elN = root.querySelector(".pg-n");
  var elDone = root.querySelector(".pg-done");
  var elDoneP = root.querySelector(".pg-done-p");
  var elRules = root.querySelector(".pg-rules");
  var elRulesList = elRules.querySelector("ul");
  var btnReveal = root.querySelector(".pg-reveal");
  var elDiff = root.querySelector(".pg-diff");
  var bulbs = [];

  function newPuzzle() {
    var d = DIFF[state.diff];
    state.puzzle = Core.makePuzzle(d.n, d.minSteps);
    state.s = 0; state.steps = 0; state.done = false; state.log = [];
    pushLog("sys", "", "new instance: " + d.n + " lights, all off, rules hidden. Click a bulb to toggle it.");
    buildBulbs();
    render();
  }

  function bits() {
    var out = "";
    for (var i = 0; i < state.puzzle.n; i++) out += (state.s >> i) & 1;
    return out;
  }

  function pushLog(kind, a, r) {
    state.log.push({ kind: kind, n: kind === "sys" ? "" : String(state.steps), a: a, r: r });
    if (state.log.length > 80) state.log.shift();
  }

  function toggle(i) {
    if (state.done || !state.puzzle) return;
    var p = state.puzzle;
    state.steps++;
    var wrap = bulbs[i];
    if (Core.evalCond(p.cond[i], state.s)) {
      state.s ^= (1 << i);
      var on = (state.s >> i) & 1;
      pushLog("ok", "toggle " + (i + 1), "light " + (i + 1) + (on ? " on" : " off") + " · " + bits());
      var svg = wrap.querySelector(".bulb");
      svg.classList.remove("flash"); void svg.getBoundingClientRect(); svg.classList.add("flash");
    } else {
      pushLog("no", "toggle " + (i + 1), "action failed · " + bits());
      var w = wrap.querySelector(".bulb-wrap");
      w.classList.remove("deny"); void w.offsetWidth; w.classList.add("deny");
    }
    if (state.s === (1 << p.n) - 1) {
      state.done = true;
      pushLog("win", "", "all lights on in " + state.steps + " steps (shortest " + p.optimal + ")");
    }
    render();
  }

  function buildBulbs() {
    elBulbs.innerHTML = "";
    bulbs = [];
    for (var i = 0; i < state.puzzle.n; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pg-bulb";
      b.setAttribute("aria-label", "Toggle light " + (i + 1));
      b.innerHTML = '<span class="bulb-wrap">' + Core.BULB + '<span class="idx">' + (i + 1) + "</span></span>";
      b.addEventListener("click", toggle.bind(null, i));
      elBulbs.appendChild(b);
      bulbs.push(b);
    }
  }

  Object.keys(DIFF).forEach(function (k) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = DIFF[k].label;
    b.setAttribute("aria-pressed", String(k === state.diff));
    b.addEventListener("click", function () {
      state.diff = k;
      Array.prototype.forEach.call(elDiff.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      newPuzzle();
    });
    elDiff.appendChild(b);
  });
  root.querySelector(".pg-new").addEventListener("click", newPuzzle);
  root.querySelector(".pg-again").addEventListener("click", newPuzzle);
  function setReveal(v) {
    state.revealed = v;
    btnReveal.setAttribute("aria-pressed", String(v));
    btnReveal.textContent = v ? "Hide rules" : "Reveal rules";
    elRules.classList.toggle("open", v);
    elRules.setAttribute("aria-hidden", String(!v));
    render();
  }
  btnReveal.addEventListener("click", function () { setReveal(!state.revealed); });
  root.querySelector(".pg-close").addEventListener("click", function () { setReveal(false); });

  function render() {
    var p = state.puzzle;
    if (!p) return;
    for (var i = 0; i < p.n; i++) {
      var on = !!((state.s >> i) & 1);
      bulbs[i].querySelector(".bulb").classList.toggle("on", on);
      bulbs[i].querySelector(".bulb-wrap").classList.toggle("on", on);
    }
    elN.textContent = String(state.steps);
    elLog.innerHTML = state.log.map(function (l) {
      if (l.kind === "sys") return '<div class="ln sys"><span class="n"></span><span class="r">' + l.r + "</span></div>";
      if (l.kind === "win") return '<div class="ln win"><span class="n">' + l.n + '</span><span class="r">' + l.r + "</span></div>";
      return '<div class="ln ' + l.kind + '"><span class="n">' + l.n + '</span><span><span class="a">' + l.a + '</span><span class="st">→</span><span class="r">' + l.r + "</span></span></div>";
    }).join("");
    elLog.scrollTop = elLog.scrollHeight;
    elDone.classList.toggle("show", state.done);
    elDone.setAttribute("aria-hidden", String(!state.done));
    if (state.done) elDoneP.textContent = state.steps + " steps; the shortest solution takes " + p.optimal + ".";
    if (state.revealed) {
      elRulesList.innerHTML = p.order.map(function (i) {
        var c = p.cond[i];
        return '<li class="' + (Core.evalCond(c, state.s) ? "sat" : "") + '"><span class="k">light ' + (i + 1) + '</span><span class="cond">' + Core.condText(c) + "</span></li>";
      }).join("");
    }
  }

  newPuzzle();
  return { el: root, reset: newPuzzle };
};
