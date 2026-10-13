/* ==========================================================================
   OdysseyArena — the arena (hero key art)
   Four tiles, one per environment, each running a scripted agent on a fresh
   instance: Turn On Lights (the generator in lights.js), AI Trading and Energy
   Dispatch (small simulations after Section 3 of the paper), Repo System (a
   typed trajectory). Hovering a tile pauses it; clicking opens that
   environment in the Environments section. Class namespace: ar-, tile-.
   ========================================================================== */
window.OdysseyHero = function (root, D) {
  "use strict";
  var Core = window.OdysseyLightsCore;
  Core.ensureDefs();

  var ICONS = {
    lights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5.6 1.2.6 1.7V16h6v-.5c0-.5 0-1.2.6-1.7A6 6 0 0 0 12 3Z"/></svg>',
    trading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 5-7 4 4"/><path d="M3 21h18"/></svg>',
    energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
    repo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 7.2v9.6M18 11.2c0 3.5-3 4-6 4.5-2.5.4-4 1.2-4 3"/></svg>'
  };

  root.classList.add("ar");
  root.innerHTML =
    '<div class="ar-back" aria-hidden="true"><div class="ar-blob a"></div><div class="ar-blob b"></div><div class="ar-ring"></div></div>' +
    '<div class="ar-grid"></div>';
  var grid = root.querySelector(".ar-grid");

  function tile(env, cls, body) {
    var e = D.envByKey[env];
    var t = document.createElement("button");
    t.type = "button";
    t.className = "tile tile-" + cls;
    t.style.setProperty("--c", e.color);
    t.setAttribute("aria-label", e.name + ": open in the Environments section");
    t.innerHTML =
      '<div class="tile-head"><span class="ico">' + ICONS[env] + "</span><span>" + e.name + '</span><span class="st"></span></div>' +
      '<div class="tile-body">' + body + "</div>" +
      '<div class="tile-foot"><span class="t"></span></div>' +
      '<span class="hint">open ↓</span>';
    t.addEventListener("click", function () {
      window.dispatchEvent(new CustomEvent("odyssey:select-env", { detail: env }));
    });
    grid.appendChild(t);
    return { el: t, st: t.querySelector(".st"), foot: t.querySelector(".tile-foot"), body: t.querySelector(".tile-body") };
  }

  function foot(t, html, chip, kind) {
    t.foot.innerHTML = (chip ? '<span class="chip ' + (kind || "") + '">' + chip + "</span>" : "") + '<span class="t">' + html + "</span>";
  }

  /* --------------------------------------------------------------- runner
     Each scene exposes reset() and tick() -> delay in ms until the next tick.
     The runner pauses on hover, when the tab is hidden and when the hero has
     scrolled away. */
  var scenes = [];
  var PACE = 1.38;   /* every delay below is multiplied by this (1.15, then 20 % slower again) */
  function run(scene, t) {
    var timer = null, paused = false, hover = false;
    function schedule(ms) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (paused || hover || document.hidden) { schedule(300); return; }
        var next = 700;
        try { next = scene.tick() || 700; } catch (e) { if (window.console) console.error(e); next = 1500; }
        schedule(next * PACE);
      }, ms);
    }
    t.el.addEventListener("mouseenter", function () { hover = true; });
    t.el.addEventListener("mouseleave", function () { hover = false; });
    scene.reset();
    schedule(600 + Math.random() * 900);
    scenes.push({ pause: function (v) { paused = v; } });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      scenes.forEach(function (s) { s.pause(!en[0].isIntersecting); });
    }, { threshold: 0.05 }).observe(root);
  }

  /* ====================================================== Turn On Lights
     A scripted explorer: it follows the shortest solution but probes a
     random light or two before each successful move, as an agent without
     the rules would. */
  (function () {
    var t = tile("lights", "lights", '<div class="row"></div><div class="ledger"></div>');
    var row = t.body.querySelector(".row"), ledger = t.body.querySelector(".ledger");
    var p, s, step, plan, wraps, fails, idx;
    function reset() {
      p = Core.makePuzzle(6, 7); s = 0; step = 0; idx = 0; fails = 0;
      plan = [];
      var sim = 0;
      p.path.forEach(function (i) {
        var probes = Math.random() < 0.5 ? 1 : Math.random() < 0.3 ? 2 : 0;
        var dead = [];
        for (var j = 0; j < p.n; j++) if (j !== i && !Core.evalCond(p.cond[j], sim)) dead.push(j);
        for (var k = 0; k < probes && dead.length; k++) plan.push({ i: dead[Math.floor(Math.random() * dead.length)], probe: true });
        plan.push({ i: i, probe: false });
        sim ^= (1 << i);
      });
      row.innerHTML = "";
      wraps = [];
      for (var i = 0; i < p.n; i++) {
        var w = document.createElement("span");
        w.className = "bulb-wrap";
        w.innerHTML = Core.BULB + '<span class="idx">' + (i + 1) + "</span>";
        row.appendChild(w); wraps.push(w);
      }
      ledger.innerHTML = p.path.map(function () { return "<i></i>"; }).join("");
      t.st.innerHTML = "step <b>0</b>";
      foot(t, "new instance · rules hidden");
      paint();
    }
    function paint() {
      for (var i = 0; i < p.n; i++) {
        var on = !!((s >> i) & 1);
        wraps[i].classList.toggle("on", on);
        wraps[i].querySelector(".bulb").classList.toggle("on", on);
        wraps[i].classList.toggle("cursor", idx < plan.length && plan[idx].i === i);
      }
      var lit = 0; for (var k = 0; k < p.n; k++) lit += (s >> k) & 1;
      Array.prototype.forEach.call(ledger.children, function (c, k) { c.classList.toggle("on", k < lit); });
    }
    var endWait = 0;
    function tick() {
      if (s === (1 << p.n) - 1) {
        if (endWait++ < 3) return 900;
        endWait = 0; reset(); return 700;
      }
      if (idx >= plan.length) { reset(); return 700; }
      var a = plan[idx]; idx++; step++;
      var w = wraps[a.i];
      if (Core.evalCond(p.cond[a.i], s)) {
        s ^= (1 << a.i);
        var svg = w.querySelector(".bulb");
        svg.classList.remove("flash"); void svg.getBoundingClientRect(); svg.classList.add("flash");
        foot(t, "light " + (a.i + 1) + " responds", "toggle " + (a.i + 1));
      } else {
        fails++;
        w.classList.remove("deny"); void w.offsetWidth; w.classList.add("deny");
        foot(t, "no effect: a condition is unmet", "toggle " + (a.i + 1), "no");
      }
      t.st.innerHTML = "step <b>" + step + "</b>";
      paint();
      if (s === (1 << p.n) - 1) {
        foot(t, "all on in " + step + " steps · shortest " + p.optimal, "solved", "win");
        return 1400;
      }
      return 620;
    }
    run({ reset: reset, tick: tick }, t);
  })();

  /* ========================================================= AI Trading
     Three stocks driven by two latent factors (Section 3.3). The news names
     a factor and its direction for the next day. The agent holds cash while
     it learns which stocks load on which factor, then trades on the news. */
  (function () {
    var t = tile("trading", "trading", '<div class="chart"><svg viewBox="0 0 268 104" preserveAspectRatio="none"></svg></div><div class="news"></div>');
    var svg = t.body.querySelector("svg"), news = t.body.querySelector(".news");
    var COLORS = ["#4cc3cb", "#f3c06a", "#8fb3ec"];
    function themeColors() {
      var cs = getComputedStyle(t.el);
      var c = ["--s-teal", "--s-amber", "--s-blue"].map(function (k) { return cs.getPropertyValue(k).trim(); });
      if (c.every(Boolean)) COLORS = c;
    }
    var NAMES = ["S1", "S2", "S3"];
    var DAYS = 28, LEARN = 6;
    var W, z, prices, hist, cash, hold, day, est, trades, endWait;
    function g() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function reset() {
      W = [[0.9, 0.2], [-0.35, 0.85], [0.5, -0.6]].map(function (r) { var f = Math.random() < 0.5 ? 1 : -1; return [r[0] * f * 0.021, r[1] * (Math.random() < 0.5 ? 1 : -1) * 0.021]; });
      z = []; for (var d = 0; d <= DAYS; d++) z.push([(Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random()), (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random())]);
      prices = [10 + Math.random() * 20, 10 + Math.random() * 20, 10 + Math.random() * 20];
      hist = [prices.slice()]; cash = 1000; hold = [0, 0, 0]; day = 0; trades = []; endWait = 0;
      est = [[0, 0], [0, 0], [0, 0]];
      draw(); t.st.innerHTML = "day <b>0</b>"; news.innerHTML = ""; foot(t, "watching the market");
    }
    function value() { return cash + hold.reduce(function (a, h, i) { return a + h * prices[i]; }, 0); }
    function tick() {
      if (day >= DAYS) {
        if (endWait++ < 3) return 900;
        reset(); return 800;
      }
      var k = Math.floor(Math.random() * 2);
      var zn = z[day + 1];
      var hint = (k ? "B" : "A") + " " + (zn[k] > 0 ? "↑" : "↓");
      news.innerHTML = 'news: factor <span class="hi">' + hint + "</span> tomorrow";
      /* act on the hint once enough days have been seen */
      var action = null;
      if (day >= LEARN) {
        var best = -1, bestv = 0;
        for (var i = 0; i < 3; i++) { var v = est[i][k] * zn[k]; if (v > bestv) { bestv = v; best = i; } }
        for (var j = 0; j < 3; j++) { if (hold[j] && j !== best) { cash += hold[j] * prices[j]; hold[j] = 0; } }
        if (best >= 0 && cash > 0) {
          var q = Math.floor(cash / prices[best]);
          if (q > 0) { hold[best] = (hold[best] || 0) + q; cash -= q * prices[best]; action = "buy " + NAMES[best] + " ×" + q; trades.push({ d: day + 1, i: best }); }
        } else if (best < 0) action = "hold cash";
      }
      /* the market moves */
      var ret = [];
      for (var m = 0; m < 3; m++) {
        var r = W[m][0] * zn[0] + W[m][1] * zn[1] + 0.004 * g();
        ret.push(r);
        prices[m] = Math.max(1, prices[m] * (1 + r));
      }
      for (var e = 0; e < 3; e++) { est[e][0] += ret[e] * zn[0]; est[e][1] += ret[e] * zn[1]; }
      day++; hist.push(prices.slice());
      draw();
      var pnl = (value() / 1000 - 1) * 100;
      t.st.innerHTML = "day <b>" + day + "</b> · " + (pnl >= 0 ? "+" : "") + pnl.toFixed(1) + "%";
      if (day < LEARN) foot(t, "learning which stocks load on factor " + (k ? "B" : "A"), "observe");
      else if (action) foot(t, "factor " + hint + " → " + action, action.indexOf("hold") === 0 ? "hold" : "trade");
      if (day >= DAYS) { foot(t, "horizon reached · " + (pnl >= 0 ? "+" : "") + pnl.toFixed(1) + "% profit", "done", pnl >= 0 ? "win" : "no"); return 1500; }
      return 640;
    }
    function draw() {
      themeColors();
      var Wd = 268, H = 104, L = 2, R = 34, T = 6, B = 6;
      var n = hist.length;
      var lo = Infinity, hi = -Infinity;
      hist.forEach(function (row) { row.forEach(function (p, i) { var v = p / hist[0][i]; lo = Math.min(lo, v); hi = Math.max(hi, v); }); });
      lo = Math.min(lo, 0.95); hi = Math.max(hi, 1.05);
      var x = function (d) { return L + d / DAYS * (Wd - L - R); };
      var y = function (v) { return T + (hi - v) / (hi - lo) * (H - T - B); };
      var out = '<g class="grid">';
      [0.25, 0.5, 0.75].forEach(function (f) { var yy = T + f * (H - T - B); out += '<line x1="' + L + '" x2="' + (Wd - R) + '" y1="' + yy + '" y2="' + yy + '"/>'; });
      out += '<line class="base" x1="' + L + '" x2="' + (Wd - R) + '" y1="' + y(1) + '" y2="' + y(1) + '"/></g>';
      var labels = [];
      for (var i = 0; i < 3; i++) {
        var pts = hist.map(function (row, d) { return x(d).toFixed(1) + "," + y(row[i] / hist[0][i]).toFixed(1); }).join(" ");
        out += '<polyline class="ln" points="' + pts + '" stroke="' + COLORS[i] + '"/>';
        var last = hist[n - 1][i] / hist[0][i];
        out += '<circle class="pt" cx="' + x(n - 1).toFixed(1) + '" cy="' + y(last).toFixed(1) + '" r="2.6" fill="' + COLORS[i] + '"/>';
        labels.push({ i: i, y: y(last) });
      }
      /* keep the three price labels apart */
      labels.sort(function (a, b) { return a.y - b.y; });
      for (var l = 1; l < labels.length; l++) if (labels[l].y - labels[l - 1].y < 11) labels[l].y = labels[l - 1].y + 11;
      for (var l2 = labels.length - 1; l2 >= 0; l2--) { if (labels[l2].y > H - B) labels[l2].y = H - B; if (l2 < labels.length - 1 && labels[l2 + 1].y - labels[l2].y < 11) labels[l2].y = labels[l2 + 1].y - 11; }
      labels.forEach(function (lb) {
        out += '<text class="lab" x="' + (Wd - R + 4).toFixed(1) + '" y="' + (lb.y + 3).toFixed(1) + '" fill="' + COLORS[lb.i] + '">' + NAMES[lb.i] + " " + hist[n - 1][lb.i].toFixed(1) + "</text>";
      });
      trades.forEach(function (tr) {
        if (tr.d < n) out += '<circle class="trade" cx="' + x(tr.d).toFixed(1) + '" cy="' + y(hist[tr.d][tr.i] / hist[0][tr.i]).toFixed(1) + '" r="5"/>';
      });
      svg.innerHTML = out;
    }
    window.addEventListener("odyssey:theme", function () { draw(); });
    run({ reset: reset, tick: tick }, t);
  })();

  /* ===================================================== Energy Dispatch
     Wind and solar deliver a hidden, periodic fraction of their rated
     output (Section 3.4). The agent plans from the efficiencies it saw
     yesterday and must keep demand met within budget, day after day. */
  (function () {
    var t = tile("energy", "energy",
      '<div class="supply"><div class="track"><i class="thermal"></i><i class="wind"></i><i class="solar"></i><i class="battery"></i><b class="dtick"></b></div><span class="lab"></span></div>' +
      '<div class="bars">' + ["thermal", "wind", "solar", "battery"].map(function (n) {
        return '<div class="bar ' + n + '"><div class="plan"></div><div class="real"></div><span class="e"></span><span class="n">' + n + "</span></div>";
      }).join("") + "</div>");
    var bars = ["thermal", "wind", "solar", "battery"].map(function (n) { return t.body.querySelector(".bar." + n); });
    var supplyEl = t.body.querySelector(".supply");
    var segs = ["thermal", "wind", "solar", "battery"].map(function (n) { return supplyEl.querySelector("i." + n); });
    var DAYS = 24, CAP = [120, 70, 60, 20], COST = [3, 1.2, 1, 0.5], SCALE = 130;
    var day, Tw, Ts, phw, phs, estW, estS, prevPlan, store, misses, therm, total, stab, endWait, collapsed;
    function eff(d) { return [0.98, 0.78 + 0.2 * Math.sin(2 * Math.PI * d / Tw + phw), 0.8 + 0.22 * Math.sin(2 * Math.PI * d / Ts + phs), 1]; }
    function demandAt(d) { return 152 + 26 * Math.sin(2 * Math.PI * d / 9 + 0.4) + 6 * Math.sin(d * 1.7); }
    function reset() {
      day = 0; Tw = 6 + Math.random() * 4; Ts = 5 + Math.random() * 4; phw = Math.random() * 6; phs = Math.random() * 6;
      estW = 1; estS = 1; prevPlan = null; store = 10; misses = 0; therm = 0; total = 0; stab = 1; endWait = 0; collapsed = false;
      paint([0, 0, 0, 0], [0, 0, 0, 0], demandAt(0), null);
      t.st.innerHTML = "day <b>0</b>"; foot(t, "efficiencies unknown · plan at face value");
    }
    function paint(plan, real, D, effv) {
      bars.forEach(function (b, i) {
        b.querySelector(".plan").style.height = (Math.abs(plan[i]) / SCALE * 100) + "%";
        b.querySelector(".real").style.height = (Math.abs(real[i]) / SCALE * 100) + "%";
        var e = b.querySelector(".e");
        e.textContent = effv && i > 0 && i < 3 ? Math.round(effv[i] * 100) + "%" : "";
        e.style.bottom = "calc(" + (Math.abs(real[i]) / SCALE * 100) + "% + 3px)";
      });
      var supply = Math.max(0, real[0]) + Math.max(0, real[1]) + Math.max(0, real[2]) + Math.max(0, real[3]);
      var span = Math.max(D, supply, 1) * 1.08;
      segs.forEach(function (sg, i) { sg.style.width = (Math.max(0, real[i]) / span * 100) + "%"; });
      supplyEl.querySelector(".dtick").style.left = (D / span * 100) + "%";
      supplyEl.querySelector(".lab").textContent = "supply " + Math.round(supply) + " / demand " + Math.round(D);
      supplyEl.classList.toggle("short", supply < D && supply > 0);
    }
    function tick() {
      if (day >= DAYS || collapsed) {
        if (endWait++ < 3) return 900;
        reset(); return 800;
      }
      var D = demandAt(day), B = 4.2 * D;
      /* plan from yesterday's efficiencies */
      var plan = [0, CAP[1], CAP[2], 0];
      var expected = plan[1] * estW + plan[2] * estS;
      var gap = D * 1.05 - expected;
      if (gap > 0 && store > 0) { plan[3] = Math.min(CAP[3], store, gap); gap -= plan[3]; }
      plan[0] = Math.max(0, Math.min(CAP[0], gap / 0.98));
      if (gap <= 0 && store < 30) plan[3] = -Math.min(10, 30 - store, -gap);
      var cost = plan[0] * COST[0] + plan[1] * COST[1] + plan[2] * COST[2] + Math.max(0, plan[3]) * COST[3];
      if (cost > B) plan[0] = Math.max(0, plan[0] - (cost - B) / COST[0]);
      var ev = eff(day);
      var real = plan.map(function (p, i) { return i === 3 ? p : p * ev[i]; });
      var supply = real[0] + real[1] + real[2] + real[3];
      store = Math.max(0, Math.min(30, store - plan[3]));
      estW = real[1] / Math.max(1, plan[1]); estS = real[2] / Math.max(1, plan[2]);
      var met = supply >= D;
      misses = met ? 0 : misses + 1;
      therm += real[0]; total += real[0] + real[1] + real[2];
      if (prevPlan) { var ch = 0; for (var i = 0; i < 3; i++) ch += Math.abs(plan[i] - prevPlan[i]) / CAP[i]; stab = 0.9 * stab + 0.1 * (1 - ch / 3); }
      prevPlan = plan;
      day++;
      paint(plan, real, D, ev);
      var carbon = total ? therm / total : 0;
      t.st.innerHTML = "day <b>" + day + "</b>";
      if (!met) {
        t.el.classList.remove("miss"); void t.el.offsetWidth; t.el.classList.add("miss");
        foot(t, "wind delivered " + Math.round(ev[1] * 100) + "% of its rated plan", "unsatisfied", "no");
      } else {
        foot(t, "carbon " + carbon.toFixed(2) + " · stability " + stab.toFixed(2), "demand met");
      }
      if (misses >= 3) { collapsed = true; foot(t, "three misses in a row · grid collapsed on day " + day, "terminated", "no"); return 1600; }
      if (day >= DAYS) { foot(t, "survived " + DAYS + " days · carbon " + carbon.toFixed(2) + " · stability " + stab.toFixed(2), "done", "win"); return 1600; }
      return 760;
    }
    run({ reset: reset, tick: tick }, t);
  })();

  /* ========================================================= Repo System
     The dependency graph as the agent uncovers it: a node appears when an
     error names it, turns coral on a conflict and settles once the version
     that resolves it is installed. One command line below. */
  (function () {
    var t = tile("repo", "repo", '<div class="graph"><svg viewBox="0 0 268 150"></svg></div><div class="line"></div>');
    var svg = t.body.querySelector("svg"), line = t.body.querySelector(".line");
    /* nodes: id, label, x, y; edges: from -> to; steps: command, output, kind, node states after */
    var SCENES = [
      {
        nodes: [{ id: "run", l: "run.py", x: 134, y: 28, root: true }, { id: "numkit", l: "numkit", x: 70, y: 100 }, { id: "gridio", l: "gridio", x: 198, y: 100 }],
        edges: [["run", "numkit"], ["run", "gridio"], ["gridio", "numkit"]],
        steps: [
          { c: "python run.py", o: "ImportError: numkit", k: "no", f: "an error names the first missing node", st: { numkit: ["bad", ""] }, ed: {} },
          { c: "pip install numkit==1.0", o: "installed", k: "ok", f: "one edge found", st: { numkit: ["have", "1.0"] }, ed: { "run-numkit": "solid" } },
          { c: "python run.py", o: "ImportError: gridio", k: "no", f: "the next missing node", st: { gridio: ["bad", ""] } },
          { c: "pip install gridio==1.0", o: "conflicts with numkit==1.0", k: "no", f: "a hidden version constraint", st: { gridio: ["bad", "1.0"] }, ed: { "gridio-numkit": "bad" } },
          { c: "pip install gridio==1.1", o: "installed · numkit 1.0 → 1.1", k: "ok", f: "side effect: the resolver changed numkit", st: { gridio: ["have", "1.1"], numkit: ["have", "1.1"] }, ed: { "gridio-numkit": "solid", "run-gridio": "solid" } },
          { c: "python run.py", o: "running", k: "win", f: "the entry point runs", st: { run: ["ok", ""], numkit: ["ok", "1.1"], gridio: ["ok", "1.1"] } }
        ]
      },
      {
        nodes: [{ id: "run", l: "run.py", x: 134, y: 28, root: true }, { id: "tensorly", l: "tensorly", x: 134, y: 100 }],
        edges: [["run", "tensorly"]],
        steps: [
          { c: "python run.py", o: "ImportError: tensorly", k: "no", f: "a missing dependency", st: { tensorly: ["bad", ""] } },
          { c: "pip install tensorly", o: "installed 2.0", k: "ok", f: "latest by default", st: { tensorly: ["have", "2.0"] }, ed: { "run-tensorly": "solid" } },
          { c: "python run.py", o: "AttributeError: needs tensorly 1.x", k: "no", f: "the code wants an older major", st: { tensorly: ["bad", "2.0"] }, ed: { "run-tensorly": "bad" } },
          { c: "pip install tensorly==1.4", o: "downgraded 2.0 → 1.4", k: "ok", f: "pin the right major version", st: { tensorly: ["have", "1.4"] }, ed: { "run-tensorly": "solid" } },
          { c: "python run.py", o: "running", k: "win", f: "the entry point runs", st: { run: ["ok", ""], tensorly: ["ok", "1.4"] } }
        ]
      }
    ];
    var si = 0, sc, step, phase, pos, endWait, nodeEls, edgeEls;
    function build() {
      sc = SCENES[si % SCENES.length];
      var out = "";
      var byId = {}; sc.nodes.forEach(function (n) { byId[n.id] = n; });
      sc.edges.forEach(function (e) {
        var a = byId[e[0]], b = byId[e[1]];
        out += '<path class="edge" data-e="' + e[0] + "-" + e[1] + '" d="M' + a.x + " " + (a.y + 14) + " C" + a.x + " " + (a.y + 44) + ", " + b.x + " " + (b.y - 44) + ", " + b.x + " " + (b.y - 14) + '"/>';
      });
      sc.nodes.forEach(function (n) {
        out += '<g class="node' + (n.root ? " root" : "") + '" data-n="' + n.id + '" transform="translate(' + n.x + " " + n.y + ')">' +
          '<rect x="-40" y="-14" width="80" height="28" rx="8"/>' +
          '<text x="0" y="4" text-anchor="middle">' + n.l + '<tspan class="ver"></tspan></text></g>';
      });
      svg.innerHTML = out;
      nodeEls = {}; edgeEls = {};
      Array.prototype.forEach.call(svg.querySelectorAll(".node"), function (g) { nodeEls[g.getAttribute("data-n")] = g; });
      Array.prototype.forEach.call(svg.querySelectorAll(".edge"), function (e) { edgeEls[e.getAttribute("data-e")] = e; });
      /* only the root is known at the start */
      sc.nodes.forEach(function (n) { if (!n.root) nodeEls[n.id].style.opacity = "0"; });
      sc.edges.forEach(function (e) { edgeEls[e[0] + "-" + e[1]].style.opacity = "0"; });
    }
    function reset() {
      step = 0; phase = 0; pos = 0; endWait = 0;
      build();
      line.innerHTML = '<span class="cur"></span>';
      t.st.innerHTML = "step <b>0</b>"; foot(t, "a project with a hidden dependency graph");
    }
    function apply(s) {
      Object.keys(s.st || {}).forEach(function (id) {
        var g = nodeEls[id]; if (!g) return;
        g.style.opacity = "1";
        g.classList.remove("have", "bad", "ok", "run");
        if (s.st[id][0]) g.classList.add(s.st[id][0]);
        g.querySelector(".ver").textContent = s.st[id][1] ? " " + s.st[id][1] : "";
        sc.edges.forEach(function (e) { if (e[1] === id || e[0] === id) { var ed = edgeEls[e[0] + "-" + e[1]]; if (nodeEls[e[0]].style.opacity === "1" && nodeEls[e[1]].style.opacity === "1") ed.style.opacity = "1"; } });
      });
      Object.keys(s.ed || {}).forEach(function (k) {
        var ed = edgeEls[k]; if (!ed) return;
        ed.classList.remove("solid", "bad"); ed.classList.add(s.ed[k]); ed.style.opacity = "1";
      });
      if (s.k === "win") Object.keys(nodeEls).forEach(function (id) { nodeEls[id].classList.add("run"); });
    }
    function tick() {
      if (step >= sc.steps.length) {
        if (endWait++ < 3) return 900;
        si++; reset(); return 700;
      }
      var s = sc.steps[step];
      if (phase === 0) {
        pos++;
        line.innerHTML = '<span class="cmd">' + s.c.slice(0, pos) + '</span><span class="cur"></span>';
        if (pos >= s.c.length) { phase = 1; return 480; }
        return 28 + Math.random() * 30;
      }
      line.innerHTML = '<span class="cmd">' + s.c + '</span><span class="out ' + (s.k === "win" ? "ok" : s.k) + '">' + s.o + "</span>";
      apply(s);
      step++; phase = 0; pos = 0;
      t.st.innerHTML = "step <b>" + step + "</b>";
      foot(t, s.f, s.k === "win" ? "success" : s.k === "no" ? "error" : "ok", s.k === "win" ? "win" : s.k === "no" ? "no" : "");
      return s.k === "win" ? 1600 : 1000;
    }
    run({ reset: reset, tick: tick }, t);
  })();

  return { el: root };
};
