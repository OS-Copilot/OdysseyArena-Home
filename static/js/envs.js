/* ==========================================================================
   OdysseyArena — environment walkthroughs
   Four tabs, one replayed trajectory each (data: ODYSSEY.walkthroughs).
   Left, what the agent observes after the current action; right, the
   action log with the environment's feedback. Class namespace: ew-.
   ========================================================================== */
window.OdysseyEnvs = function (root, D) {
  "use strict";

  var ICONS = {
    lights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5.6 1.2.6 1.7V16h6v-.5c0-.5 0-1.2.6-1.7A6 6 0 0 0 12 3Z"/></svg>',
    trading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 5-7 4 4"/><path d="M3 21h18"/></svg>',
    energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
    repo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 7.2v9.6M18 11.2c0 3.5-3 4-6 4.5-2.5.4-4 1.2-4 3"/></svg>'
  };

  var state = { env: "lights", i: 0, timer: null, mode: "replay", play: null };

  root.classList.add("ew-card");
  root.innerHTML =
    '<div class="ew-tabs" role="tablist"></div>' +
    '<div class="ew-modebar"><span class="ew-modelabel"></span><div class="seg ew-mode" role="group" aria-label="Mode">' +
      '<button type="button" data-mode="replay" aria-pressed="true">Replay a trajectory</button>' +
      '<button type="button" data-mode="play" aria-pressed="false">Play it yourself</button></div></div>' +
    '<div class="ew-playground" hidden></div>' +
    '<div class="ew-body">' +
      '<div class="ew-obs"><p class="ew-h"><i></i>What the agent sees</p><div class="ew-screen"></div></div>' +
      '<div class="ew-act"><p class="ew-h"><i></i>Action and feedback</p><div class="ew-steps"></div>' +
        '<div class="ew-ctl">' +
          '<button type="button" class="wt-btn ew-prev" aria-label="Previous step">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3 5 8l5 5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<button type="button" class="wt-btn ew-play" aria-pressed="false">Play</button>' +
          '<button type="button" class="wt-btn ew-next" aria-label="Next step">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 3 5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<span class="count"></span>' +
        "</div>" +
      "</div>" +
    "</div>" +
    '<div class="ew-facts"><div><div class="l">Action space</div><div class="v ew-f-a"></div></div>' +
      '<div><div class="l">Observation</div><div class="v ew-f-o"></div></div>' +
      '<div><div class="l">Success</div><div class="v ew-f-s"></div></div></div>';

  var elTabs = root.querySelector(".ew-tabs");
  var elModebar = root.querySelector(".ew-modebar");
  var elMode = root.querySelector(".ew-mode");
  var elPlay = root.querySelector(".ew-playground");
  var elBody = root.querySelector(".ew-body");
  var elScreen = root.querySelector(".ew-screen");
  var elSteps = root.querySelector(".ew-steps");
  var elCount = root.querySelector(".count");
  var btnPlay = root.querySelector(".ew-play");

  D.envs.forEach(function (e) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ew-tab";
    b.setAttribute("role", "tab");
    b.style.setProperty("--env-c", e.color);
    b.innerHTML = '<span class="ico">' + ICONS[e.key] + '</span><span><span class="t">' + e.name + '</span><span class="p">' + e.primitive + "</span></span>";
    b.addEventListener("click", function () { select(e.key); });
    elTabs.appendChild(b);
  });

  root.querySelector(".ew-prev").addEventListener("click", function () { stop(); go(state.i - 1); });
  root.querySelector(".ew-next").addEventListener("click", function () { stop(); go(state.i + 1); });
  btnPlay.addEventListener("click", function () { if (state.timer) stop(); else play(); });
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { stop(); go(state.i + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { stop(); go(state.i - 1); e.preventDefault(); }
  });

  function steps() { return D.walkthroughs[state.env].steps; }

  /* Play mode: the playable console (lights.js), for the environments that have one */
  var PLAYABLE = { lights: true };
  function setMode(mode) {
    if (mode === "play" && !PLAYABLE[state.env]) mode = "replay";
    state.mode = mode;
    Array.prototype.forEach.call(elMode.children, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode)); });
    elBody.hidden = mode === "play";
    elPlay.hidden = mode !== "play";
    if (mode === "play") {
      stop();
      if (!state.play && window.OdysseyLights) state.play = window.OdysseyLights(elPlay, {});
    }
  }
  Array.prototype.forEach.call(elMode.children, function (b) {
    b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
  });
  window.addEventListener("odyssey:select-env", function (e) {
    select(e.detail);
    var top = root.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: top, behavior: "smooth" });
  });

  function select(key) {
    stop();
    state.env = key; state.i = 0;
    var env = D.envByKey[key];
    root.style.setProperty("--env-c", env.color);
    Array.prototype.forEach.call(elTabs.children, function (t, k) { t.setAttribute("aria-selected", String(D.envs[k].key === key)); });
    root.querySelector(".ew-f-a").textContent = env.actions;
    root.querySelector(".ew-f-o").textContent = env.observe;
    root.querySelector(".ew-f-s").textContent = env.success;
    elModebar.hidden = !PLAYABLE[key];
    root.querySelector(".ew-modelabel").textContent = PLAYABLE[key] ? "The trajectory from the paper, or a fresh instance to solve" : "";
    setMode(state.mode);
    buildSteps();
    render();
  }

  function go(i) {
    var n = steps().length;
    state.i = (i + n) % n;
    render();
  }
  function play() {
    btnPlay.setAttribute("aria-pressed", "true"); btnPlay.textContent = "Pause";
    state.timer = setInterval(function () {
      if (state.i >= steps().length - 1) { stop(); return; }
      go(state.i + 1);
    }, 1700);
  }
  function stop() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    btnPlay.setAttribute("aria-pressed", "false"); btnPlay.textContent = "Play";
  }

  function buildSteps() {
    elSteps.innerHTML = "";
    steps().forEach(function (s, k) {
      var d = document.createElement("div");
      d.className = "ew-step";
      d.setAttribute("role", "button");
      d.tabIndex = 0;
      var fb = s.result.split("\n")[0];
      d.innerHTML = '<span class="n">' + (k + 1) + '</span><div><div class="a">' + esc(s.action) + '</div>' +
        '<div class="f ' + (s.kind === "no" ? "no" : s.kind === "win" ? "hi" : "") + '"><i></i><span>' + esc(fb) + (s.note ? ' <span class="dim">· ' + esc(s.note) + "</span>" : "") + "</span></div></div>";
      d.addEventListener("click", function () { stop(); go(k); });
      elSteps.appendChild(d);
    });
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* -------------------------------------------------------- renderers */
  function viewOf(i) {
    var st = steps();
    if (i + 1 < st.length && st[i + 1].obs) return st[i + 1].obs;
    return st[i].final || st[i].obs;
  }

  function bulbSvg(on) {
    return '<svg viewBox="0 0 24 32" aria-hidden="true"><path class="glass" d="M12 1.5C6.5 1.5 2.5 5.7 2.5 10.6c0 3.5 2 5.6 4 7.7V21h11v-2.7c2-2.1 4-4.2 4-7.7 0-4.9-4-9.1-9.5-9.1Z"/><rect class="base" x="7" y="22" width="10" height="3.5" rx="1"/><rect class="base" x="9" y="26.5" width="6" height="2.5" rx="1"/></svg>';
  }

  function renderLights(i) {
    var v = viewOf(i);
    var st = steps()[i];
    var html = '<div class="row" style="justify-content:space-between"><span class="dim">state after step ' + (i + 1) + '</span><span class="dim">goal: every light on · budget ' + D.envByKey.lights.steps + ' steps</span></div>' +
      '<div class="mini-bulbs">' + v.map(function (b, k) {
        return '<div><div class="mb ' + (b ? "on" : "") + '">' + bulbSvg(b) + '</div><div class="mi">' + (k + 1) + "</div></div>";
      }).join("") + "</div>" +
      '<div class="state">lights on: <span class="hi">' + v.reduce(function (a, b) { return a + b; }, 0) + " / " + v.length + "</span></div>" +
      '<div class="state ' + (st.kind === "no" ? "no" : st.kind === "win" ? "ok" : "") + '" style="margin-top:10px">' + esc(st.result) + "</div>";
    elScreen.innerHTML = html;
  }

  function renderTrading(i) {
    var v = viewOf(i);
    var prev = steps()[i].obs;
    var names = D.walkthroughs.trading.stocks;
    var value = v.cash + v.prices.reduce(function (a, p, k) { return a + p * v.hold[k]; }, 0);
    var html = '<div class="row" style="justify-content:space-between"><span>Day <span class="hi">' + v.day + '</span></span><span class="dim">cash ' + v.cash.toFixed(0) + ' · value <span class="hi">' + value.toFixed(0) + "</span></span></div>" +
      '<div class="row" style="margin-top:10px">' + names.map(function (n, k) {
        var p = v.prices[k], q = prev.prices[k];
        var cls = p > q ? "up" : p < q ? "dn" : "";
        var ch = ((p - q) / q * 100);
        return '<div class="tile"><div class="l">' + n + '</div><div class="v ' + cls + '">' + p.toFixed(1) + (v.day !== prev.day ? ' <small>' + (ch >= 0 ? "+" : "") + ch.toFixed(1) + "%</small>" : "") + '</div><div class="s">hold ' + v.hold[k] + "</div></div>";
      }).join("") + "</div>" +
      '<div class="news">' + esc(v.news) + "</div>";
    elScreen.innerHTML = html;
  }

  function renderEnergy(i) {
    var v = viewOf(i);
    var names = ["Thermal", "Wind", "Solar", "Battery"];
    var html = '<div class="row" style="justify-content:space-between"><span>Day <span class="hi">' + v.day + '</span></span><span class="dim">demand ' + v.demand + ' · budget ' + v.budget + "</span></div>" +
      '<div class="row" style="margin-top:10px">' +
        '<div class="tile"><div class="l">Battery</div><div class="v">' + v.battery[0] + " / " + v.battery[1] + "</div></div>" +
        '<div class="tile"><div class="l">Stability</div><div class="v">' + v.stability.toFixed(2) + "</div></div>" +
        '<div class="tile"><div class="l">Carbon</div><div class="v">' + v.carbon.toFixed(2) + "</div></div>" +
      "</div>";
    if (v.prev) {
      html += '<div class="dim" style="margin-top:12px">yesterday: rated plan <span class="k">(grey)</span> vs realized output</div>';
      var max = Math.max.apply(null, v.prev.plan.map(Math.abs).concat(v.prev.real.map(Math.abs))) || 1;
      html += names.map(function (n, k) {
        var pl = Math.abs(v.prev.plan[k]), re = Math.abs(v.prev.real[k]);
        return '<div class="gauge"><span>' + n + '</span><div class="bar"><i class="plan" style="width:' + (pl / max * 100) + '%"></i><i style="width:' + (re / max * 100) + '%;opacity:.85"></i></div><span class="n">' + v.prev.real[k] + ' <span class="k">/ ' + v.prev.plan[k] + "</span></span></div>";
      }).join("");
    } else {
      html += '<div class="dim" style="margin-top:12px">no history yet: the efficiency of each source is unknown</div>';
    }
    elScreen.innerHTML = html;
  }

  function renderRepo(i) {
    var st = steps();
    var lines = ['<span class="dim">' + esc(st[0].obs[0]) + "</span>"];
    for (var k = 0; k <= i; k++) {
      lines.push('<span class="cmd">' + esc(st[k].action) + "</span>");
      var cls = st[k].kind === "no" ? "no" : st[k].kind === "win" ? "ok" : "";
      lines.push('<span class="' + cls + '">' + esc(st[k].result) + "</span>");
    }
    elScreen.innerHTML = '<div class="term">' + lines.join("\n") + "</div>";
    elScreen.scrollTop = elScreen.scrollHeight;
  }

  function render() {
    var st = steps();
    Array.prototype.forEach.call(elSteps.children, function (d, k) { d.classList.toggle("cur", k === state.i); });
    elCount.textContent = (state.i + 1) + " / " + st.length;
    ({ lights: renderLights, trading: renderTrading, energy: renderEnergy, repo: renderRepo })[state.env](state.i);
    var cur = elSteps.children[state.i];
    if (cur && elSteps.scrollHeight > elSteps.clientHeight) {
      // Keep the active step visible without scrolling the page or other ancestors.
      var top = elSteps.getBoundingClientRect().top + elSteps.clientTop;
      var row = cur.getBoundingClientRect();
      if (row.top < top) elSteps.scrollTop += row.top - top;
      else if (row.bottom > top + elSteps.clientHeight) elSteps.scrollTop += row.bottom - top - elSteps.clientHeight;
    }
  }

  select("lights");
  return { el: root, select: select, destroy: stop };
};
