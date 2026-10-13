/* ==========================================================================
   OdysseyArena — page wiring
   Mounts every interactive component on its element. Each mount is guarded,
   so a missing file or element leaves the rest of the page working.
   ========================================================================== */
(function () {
  "use strict";

  function guard(name, fn) {
    try { return fn(); } catch (e) { if (window.console) console.error("[odyssey] " + name, e); }
    return null;
  }
  function $(id) { return document.getElementById(id); }

  function init() {
    var D = window.ODYSSEY;
    if (!D) return;
    var CH = window.OdysseyCharts;

    /* hero: four live environments */
    if ($("arena") && window.OdysseyHero) guard("arena", function () { window.OdysseyHero($("arena"), D); });

    /* environments: trajectory replay */
    if ($("env-walk") && window.OdysseyEnvs) guard("env-walk", function () { window.OdysseyEnvs($("env-walk"), D); });

    /* benchmark: suites, the interaction loop, the comparison table */
    guard("suites", function () {
      var L = D.suites.lite, Cc = D.suites.challenge;
      var set = function (id, v) { var el = $(id); if (el) el.textContent = v; };
      set("lite-tasks", L.tasksPerEnv + " per environment, " + L.tasks + " in all");
      set("lite-steps", D.envs.map(function (e) { return e.short + " " + L.stepLimits[e.key]; }).join(" · "));
      set("lite-runs", L.runs + " runs per task");
      set("chal-tasks", Cc.tasksPerEnv + " per environment, " + Cc.tasks + " in all");
      set("chal-steps", "more than " + Cc.stepsAtLeast.toLocaleString() + " per task");
      var lt = $("lite-horizon"), ct = $("chal-horizon");
      if (lt) lt.style.width = (200 / Cc.stepsAtLeast * 100) + "%";
      if (ct) ct.style.width = "100%";
    });
    guard("loop", function () {
      var fns = Array.prototype.slice.call(document.querySelectorAll("#bf-loop .bf-fn"));
      if (!fns.length) return;
      var i = 0;
      setInterval(function () {
        fns.forEach(function (f, k) { f.classList.toggle("lit", k === i); });
        i = (i + 1) % fns.length;
      }, 1100);
    });
    guard("cmp", function () {
      var tb = $("cmp-body");
      if (!tb) return;
      tb.innerHTML = D.benchmarkComparison.map(function (r) {
        var ours = /Odyssey/.test(r.benchmark);
        return "<tr" + (ours ? ' class="ours"' : "") + "><td>" + r.benchmark + "</td>" +
          '<td class="' + (r.inductive ? "y" : "n") + '">' + (r.inductive ? "✓ required" : "✗") + "</td>" +
          '<td><span class="pill ' + (r.horizon === "X-Long" ? "xl" : "") + '">' + r.horizon.replace("X-Long", "Extra long") + "</span></td>" +
          "<td>" + r.deploy + "</td></tr>";
      }).join("");
    });

    /* results */
    if ($("leaderboard") && window.OdysseyLeaderboard) guard("leaderboard", function () { window.OdysseyLeaderboard($("leaderboard"), D); });
    if ($("chart-rules") && CH) guard("rules", function () {
      var chart = CH.rulesBars($("chart-rules"), { D: D, env: "lights", models: D.rulesFigureModels });
      var seg = $("rules-env");
      if (!seg) return;
      D.envs.forEach(function (e, k) {
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = '<span class="dot" style="width:8px;height:8px;border-radius:50%;background:' + e.color + '"></span>' + e.name;
        b.setAttribute("aria-pressed", String(k === 0));
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(seg.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
          chart.update({ env: e.key });
        });
        seg.appendChild(b);
      });
    });

    /* analysis: one card per figure, a segmented control picks the environment */
    function panelSwitch(chartId, segId, panels, draw) {
      var host = $(chartId), seg = $(segId);
      if (!host || !panels || !panels.length) return;
      var order = ["Turn On Lights", "AI Trading", "Repo System"];
      panels = panels.slice().sort(function (a, b) { return order.indexOf(a.env) - order.indexOf(b.env); });
      draw(host, panels[0]);
      if (!seg) return;
      panels.forEach(function (p, k) {
        var env = D.envs.filter(function (e) { return e.name === p.env; })[0];
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = (env ? '<span class="dot" style="width:8px;height:8px;border-radius:50%;background:' + env.color + '"></span>' : "") + p.env;
        b.setAttribute("aria-pressed", String(k === 0));
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(seg.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
          draw(host, p);
        });
        seg.appendChild(b);
      });
    }
    if (CH && D.curves) guard("curves", function () {
      panelSwitch("chart-curves", "curves-env", D.curves.panels, function (host, p) {
        CH.stepCurves(host, { D: D, panel: p, title: p.env });
      });
    });
    if (CH && D.loops) guard("loops", function () {
      panelSwitch("chart-loops", "loops-env", D.loops.panels, function (host, p) {
        CH.loopScatter(host, { D: D, panel: p, title: p.env });
      });
    });
    if (CH && $("chart-failures")) guard("failures", function () { CH.failureBars($("chart-failures"), { D: D }); });
    if (CH && $("chart-effort")) guard("effort", function () { CH.effortBars($("chart-effort"), { D: D }); });
    if (CH && $("chart-memory")) guard("memory", function () { CH.memoryLines($("chart-memory"), { D: D }); });
    if (CH && $("chart-icl")) guard("icl", function () { CH.iclBars($("chart-icl"), { D: D }); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
