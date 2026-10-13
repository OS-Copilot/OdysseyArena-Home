/* ==========================================================================
   OdysseyArena — charts
   Dependency-free SVG. Every chart draws into a fixed viewBox (so labels
   keep one size and shrink only on narrow screens), takes its colours from
   the model catalogue or CSS classes, and returns { el, update() }.
   ========================================================================== */
window.OdysseyCharts = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = svg("text", { x: x, y: y, "class": cls || "tick", "text-anchor": anchor || "start" }, parent);
    t.textContent = str;
    return t;
  }
  function fmt(v, d) { return (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0); }

  /* one tooltip for the page */
  var tip = null;
  function tooltip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "wt-tip";
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(html, ev) {
    var t = tooltip();
    t.innerHTML = html;
    t.classList.add("on");
    moveTip(ev);
  }
  function moveTip(ev) {
    var t = tooltip();
    var x = ev.clientX + 14, y = ev.clientY + 14;
    var r = t.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - 14;
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  function hideTip() { if (tip) tip.classList.remove("on"); }
  function bindTip(el, html) {
    el.addEventListener("mouseenter", function (ev) { showTip(typeof html === "function" ? html() : html, ev); });
    el.addEventListener("mousemove", moveTip);
    el.addEventListener("mouseleave", hideTip);
  }

  function mount(target, w) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    el.classList.add("ch");
    if (w) el.style.setProperty("--ch-w", w + "px");
    el.innerHTML = "";
    return el;
  }

  function shortName(name) {
    return name.replace("-Instruct", "").replace(" Instruct", "").replace(" Preview", "").replace("-A22B", "").replace("-A3B", "").replace("-0414", "").replace("-Chat", "");
  }

  /* ------------------------------------------------------------------------
     Rules given vs hidden: paired bars per model for one environment.
     opts: { env, models (names), D }
     ------------------------------------------------------------------------ */
  function rulesBars(target, opts) {
    var D = opts.D;
    var el = mount(target, 680);
    var api = { el: el, update: draw };
    draw(opts);
    return api;

    function draw(o) {
      opts = Object.assign(opts, o || {});
      el.innerHTML = "";
      var env = opts.env;
      var isProfit = env === "trading";
      var rows = opts.models.map(function (n) {
        return D.rulesComparison.filter(function (r) { return r.model === n; })[0];
      }).filter(Boolean);
      var W = 680, H = 300, L = 50, R = 12, Tt = 24, B = 60;
      var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": (isProfit ? "Profit" : "Success rate") + " without and with rules" }, el);
      var vals = [];
      rows.forEach(function (r) { vals.push(r[env].without, r[env].with); });
      var maxV = Math.max.apply(null, vals.concat([isProfit ? 50 : 100]));
      var minV = Math.min(0, Math.min.apply(null, vals));
      var top = isProfit ? Math.ceil(maxV / 50) * 50 : 100;
      var y = function (v) { return Tt + (top - v) / (top - minV) * (H - Tt - B); };
      var grid = svg("g", { "class": "grid" }, s);
      var ticks = isProfit ? [0, 50, 100, 150] : [0, 25, 50, 75, 100];
      ticks.filter(function (t) { return t <= top; }).forEach(function (t) {
        svg("line", { x1: L, x2: W - R, y1: y(t), y2: y(t) }, grid);
        text(s, L - 8, y(t) + 4, isProfit ? "+" + t + "%" : String(t), "tick", "end");
      });
      text(s, L, 12, isProfit ? "Profit, Avg@4" : "Success rate, Avg@4", "alab");
      var gw = (W - L - R) / rows.length;
      var bw = Math.min(26, gw * 0.3);
      rows.forEach(function (r, i) {
        var cx = L + gw * (i + 0.5);
        var m = D.model(r.model);
        var a = r[env].without, b = r[env].with;
        var g = svg("g", {}, s);
        var pat = "hatch-" + env + "-" + i;
        var defs = svg("defs", {}, g);
        var p = svg("pattern", { id: pat, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
        svg("rect", { width: 6, height: 6, fill: m.color, opacity: 0.18 }, p);
        svg("rect", { width: 2.2, height: 6, fill: m.color }, p);
        var r1 = svg("rect", { "class": "bar", x: cx - bw - 2, y: y(Math.max(a, 0)), width: bw, height: Math.abs(y(a) - y(0)), rx: 3, fill: "url(#" + pat + ")", stroke: m.color, "stroke-width": 1 }, g);
        var r2 = svg("rect", { "class": "bar", x: cx + 2, y: y(Math.max(b, 0)), width: bw, height: Math.abs(y(b) - y(0)), rx: 3, fill: m.color }, g);
        text(s, cx - bw / 2 - 2, y(Math.max(a, 0)) - 4, fmt(a, isProfit ? 0 : 1).replace(/\.0$/, ""), "vlab", "middle");
        text(s, cx + bw / 2 + 2, y(Math.max(b, 0)) - 4, fmt(b, isProfit ? 0 : 1).replace(/\.0$/, ""), "vlab", "middle");
        bindTip(r1, "<b>" + r.model + "</b><small>rules hidden: " + fmt(a, 2) + (isProfit ? "%" : "") + "</small>");
        bindTip(r2, "<b>" + r.model + "</b><small>rules given: " + fmt(b, 2) + (isProfit ? "%" : "") + "</small>");
        if (m.logo) {
          svg("image", { "class": "mlogo", href: m.logo, x: cx - 11, y: H - B + 10, width: 22, height: 22 }, s);
        }
        var nm = shortName(r.model);
        text(s, cx, H - B + 46, nm, "tick", "middle");
      });
      svg("line", { "class": "axis", x1: L, x2: W - R, y1: y(0), y2: y(0), stroke: "currentColor" }, svg("g", { "class": "axis" }, s));
      el.appendChild(legend([
        { sw: "hatch", label: "rules hidden (the benchmark)" },
        { color: "var(--accent-400)", label: "rules given in the prompt" }
      ]));
    }
  }

  function legend(items) {
    var d = document.createElement("div");
    d.className = "legend-row";
    d.innerHTML = items.map(function (it) {
      var sw = it.sw === "hatch" ? '<span class="sw hatch"></span>' : '<span class="sw ' + (it.round ? "round" : "") + '" style="background:' + it.color + '"></span>';
      return '<span class="li">' + sw + it.label + "</span>";
    }).join("");
    return d;
  }

  /* ------------------------------------------------------------------------
     Success rate against step, one environment.
     opts: { panel: {env, x_max, series:[{model, points}], random}, D, title }
     ------------------------------------------------------------------------ */
  function stepCurves(target, opts) {
    var D = opts.D, P = opts.panel;
    var el = mount(target, 560);
    var W = 560, H = 300, L = 44, R = 14, Tt = 26, B = 36;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": (P.metric === "profit rate" ? "Profit rate" : "Success rate") + " against step, " + P.env }, el);
    var xmax = P.x_max;
    var ymax = 0;
    P.series.forEach(function (se) { se.points.forEach(function (p) { ymax = Math.max(ymax, p[1]); }); });
    ymax = Math.ceil(ymax * 10 + 0.5) / 10;
    var x = function (v) { return L + v / xmax * (W - L - R); };
    var y = function (v) { return Tt + (ymax - v) / ymax * (H - Tt - B); };
    var grid = svg("g", { "class": "grid" }, s);
    var isProfit = P.metric === "profit rate";
    for (var t = 0; t <= ymax + 1e-9; t += 0.1) {
      svg("line", { x1: L, x2: W - R, y1: y(t), y2: y(t) }, grid);
      text(s, L - 7, y(t) + 4, (isProfit && t > 0 ? "+" : "") + fmt(t * 100, 0) + "%", "tick", "end");
    }
    var xs = xmax === 200 ? [0, 40, 80, 120, 160, 200] : [0, 30, 60, 90, 120];
    xs.forEach(function (v) { text(s, x(v), H - B + 18, String(v), "tick", "middle"); });
    text(s, W - R, H - B + 34, "step", "alab", "end");
    text(s, L, 14, (opts.title || P.env) + (isProfit ? " · profit rate" : " · cumulative success rate"), "title");

    var lines = {};
    function path(points) {
      var d = "";
      points.forEach(function (p, i) { d += (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1); });
      return d;
    }
    if (P.random && P.random.length) {
      svg("path", { "class": "ln human", d: path(P.random), stroke: "var(--text-dim)", "stroke-width": 1.5 }, s);
    }
    P.series.forEach(function (se) {
      var m = D.model(se.model);
      var p = svg("path", { "class": "ln", d: path(se.points), stroke: m.color, "stroke-dasharray": m.dash || "" }, s);
      lines[se.model] = p;
      bindTip(p, function () {
        var last = se.points[se.points.length - 1];
        return "<b>" + se.model + "</b><small>final " + (isProfit ? "profit rate " : "success rate ") + fmt(last[1] * 100, 1) + "%</small>";
      });
      p.addEventListener("mouseenter", function () { focus(se.model); });
      p.addEventListener("mouseleave", function () { focus(null); });
    });
    function focus(name) {
      Object.keys(lines).forEach(function (k) {
        lines[k].classList.toggle("dim", !!name && k !== name);
        lines[k].classList.toggle("hot", k === name);
      });
    }
    /* legend chips toggle lines */
    var chips = document.createElement("div");
    chips.className = "chips";
    chips.style.marginTop = "12px";
    var on = {};
    P.series.forEach(function (se) {
      var m = D.model(se.model);
      on[se.model] = true;
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", "true");
      b.innerHTML = '<span class="dot" style="background:' + m.color + '"></span>' + shortName(se.model);
      b.addEventListener("click", function () {
        on[se.model] = !on[se.model];
        b.setAttribute("aria-pressed", String(on[se.model]));
        lines[se.model].style.display = on[se.model] ? "" : "none";
      });
      b.addEventListener("mouseenter", function () { focus(se.model); });
      b.addEventListener("mouseleave", function () { focus(null); });
      chips.appendChild(b);
    });
    if (P.random && P.random.length) {
      var rb = document.createElement("span");
      rb.className = "chip"; rb.style.cursor = "default";
      rb.innerHTML = '<span class="dot" style="background:var(--text-dim)"></span>random policy';
      chips.appendChild(rb);
    }
    el.appendChild(chips);
    return { el: el };
  }

  /* ------------------------------------------------------------------------
     Loop ratio against success rate, one environment.
     opts: { panel: {env, points:[{model, loop_ratio, success_rate}], infeasible}, D }
     ------------------------------------------------------------------------ */
  function loopScatter(target, opts) {
    var D = opts.D, P = opts.panel, A = P.axes || {};
    var el = mount(target, 560);
    var W = 560, H = 300, L = 44, R = 14, Tt = 26, B = 40;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Loop ratio against success rate, " + P.env }, el);
    var plotW = W - L - R, plotH = H - Tt - B;
    var ylim = A.y_lim || [0, 1];
    var y = function (v) { return Tt + (ylim[1] - v) / (ylim[1] - ylim[0]) * plotH; };
    /* x: one linear axis, or two segments with a break (the paper's Repo System panel) */
    var segs = A.x_break
      ? [{ lim: A.x_lim_left, f0: 0, f1: A.left_axes_fraction }, { lim: A.x_lim_right, f0: 1 - A.right_axes_fraction, f1: 1 }]
      : [{ lim: A.x_lim || [0, 1], f0: 0, f1: 1 }];
    var x = function (v) {
      var sg = segs[0];
      for (var i = 0; i < segs.length; i++) if (v >= segs[i].lim[0] - 1e-9) sg = segs[i];
      return L + (sg.f0 + (v - sg.lim[0]) / (sg.lim[1] - sg.lim[0]) * (sg.f1 - sg.f0)) * plotW;
    };
    var fx = function (f) { return L + f * plotW; };
    var fy = function (f) { return Tt + (1 - f) * plotH; };

    var grid = svg("g", { "class": "grid" }, s);
    for (var t = 0; t <= ylim[1] + 1e-9; t += 0.1) {
      svg("line", { x1: L, x2: W - R, y1: y(t), y2: y(t) }, grid);
      text(s, L - 7, y(t) + 4, fmt(t * 100, 0) + "%", "tick", "end");
    }
    segs.forEach(function (sg) {
      var step = (sg.lim[1] - sg.lim[0]) > 0.2 ? 0.1 : (sg.lim[1] - sg.lim[0]) > 0.1 ? 0.05 : 0.02;
      for (var v = Math.ceil(sg.lim[0] / step) * step; v <= sg.lim[1] + 1e-9; v += step) {
        if (v < -1e-9) continue;
        text(s, x(v), H - B + 18, fmt(v, 2), "tick", "middle");
      }
    });
    if (A.x_break) {
      var bx = fx((segs[0].f1 + segs[1].f0) / 2);
      text(s, bx, H - B + 18, "//", "tick", "middle");
      svg("line", { x1: bx - 3, x2: bx + 3, y1: Tt, y2: H - B, stroke: "var(--chart-axis)", "stroke-dasharray": "2 3" }, s);
    }
    text(s, W - R, H - B + 34, "loop ratio: share of steps that repeat an action the environment just rejected", "alab", "end");
    text(s, L, 14, opts.title || P.env, "title");

    if (P.infeasible_axes_fraction && P.infeasible_axes_fraction.length) {
      var d = P.infeasible_axes_fraction.map(function (p, i) { return (i ? "L" : "M") + fx(p[0]).toFixed(1) + " " + fy(p[1]).toFixed(1); }).join("") + "Z";
      svg("path", { "class": "region", d: d }, s);
      var cf = P.infeasible_axes_fraction.reduce(function (a, p) { return [a[0] + p[0], a[1] + p[1]]; }, [0, 0]);
      text(s, fx(cf[0] / 3) + 10, fy(cf[1] / 3) + 4, "infeasible region", "region-lab", "middle");
    }
    P.points.forEach(function (p) {
      var m = D.model(p.model);
      var g = svg("g", { "class": "pt" }, s);
      var cx = x(p.loop_ratio), cy = y(p.success_rate);
      if (m.open === false) svg("circle", { cx: cx, cy: cy, r: 10.5, fill: "none", stroke: m.color, "stroke-width": 1.2, opacity: 0.7 }, g);
      svg("circle", { cx: cx, cy: cy, r: 6.5, fill: m.color, stroke: "var(--surface-3)", "stroke-width": 1.5 }, g);
      bindTip(g, "<b>" + p.model + "</b><small>loop ratio " + fmt(p.loop_ratio, 3) + " · success " + fmt(p.success_rate * 100, 1) + "%</small>");
    });
    el.appendChild(legend([{ color: "var(--text-dim)", round: true, label: "one marker per model, hover for its name; ringed markers are proprietary" }]));
    return { el: el };
  }

  /* ------------------------------------------------------------------------
     Failure modes: horizontal bars, share of the 47 failed trajectories.
     ------------------------------------------------------------------------ */
  function failureBars(target, opts) {
    var D = opts.D;
    var el = mount(target, 560);
    var rows = D.failureModes;
    var W = 560, rowH = 66, L = 10, R = 54, Tt = 8;
    var H = Tt + rows.length * rowH + 4;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Failure modes" }, el);
    var x = function (v) { return L + v / 100 * (W - L - R); };
    rows.forEach(function (r, i) {
      var yy = Tt + i * rowH;
      text(s, L, yy + 14, r.mode, "title");
      var tr = svg("rect", { x: L, y: yy + 22, width: W - L - R, height: 14, rx: 7, "class": "hl" }, s);
      var bar = svg("rect", { "class": "bar", x: L, y: yy + 22, width: Math.max(2, x(r.percent) - L), height: 14, rx: 7, fill: i === 0 ? "var(--amber-500)" : i === 3 ? "var(--text-faint)" : "var(--accent-400)" }, s);
      text(s, W - R + 8, yy + 34, r.count + "/" + r.total, "vlab");
      var gl = text(s, L, yy + 50, r.gloss, "tick");
      bindTip(bar, "<b>" + r.mode + "</b><small>" + r.count + " of " + r.total + " trajectories (" + fmt(r.percent, 1) + "%)</small>");
      bindTip(tr, "<b>" + r.mode + "</b><small>" + r.count + " of " + r.total + " trajectories (" + fmt(r.percent, 1) + "%)</small>");
    });
    return { el: el };
  }

  /* ------------------------------------------------------------------------
     Reasoning effort: gpt-oss-120b low / medium / high, three environments.
     ------------------------------------------------------------------------ */
  function effortBars(target, opts) {
    var D = opts.D;
    var el = mount(target, 360);
    var envs = ["lights", "trading", "repo"];
    var levels = D.reasoningEffort;
    var W = 360, H = 200, L = 36, R = 6, Tt = 18, B = 40;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Reasoning effort" }, el);
    var vals = [];
    levels.forEach(function (lv) { envs.forEach(function (e) { vals.push(lv.row[e].avg4); }); });
    var top = Math.ceil(Math.max.apply(null, vals) / 10) * 10;
    var y = function (v) { return Tt + (top - v) / top * (H - Tt - B); };
    var grid = svg("g", { "class": "grid" }, s);
    for (var t = 0; t <= top; t += 10) {
      svg("line", { x1: L, x2: W - R, y1: y(t), y2: y(t) }, grid);
      text(s, L - 6, y(t) + 4, String(t), "tick", "end");
    }
    var shades = ["#bfe3e6", "#5fc3ca", "#1a9099"];
    var gw = (W - L - R) / envs.length, bw = Math.min(18, gw / 4);
    envs.forEach(function (e, i) {
      var cx = L + gw * (i + 0.5);
      levels.forEach(function (lv, k) {
        var v = lv.row[e].avg4;
        var b = svg("rect", { "class": "bar", x: cx + (k - 1) * (bw + 3) - bw / 2, y: y(v), width: bw, height: Math.max(0, y(0) - y(v)), rx: 2, fill: shades[k] }, s);
        bindTip(b, "<b>gpt-oss-120b (" + lv.level + ")</b><small>" + D.envByKey[e].name + ": " + fmt(v, 2) + (e === "trading" ? "% profit" : "% success") + "</small>");
      });
      text(s, cx, H - B + 18, D.envByKey[e].name, "tick", "middle");
    });
    text(s, L, 10, "Avg@4 (profit for Trading)", "alab");
    el.appendChild(legend([
      { color: shades[0], label: "low" }, { color: shades[1], label: "medium" }, { color: shades[2], label: "high" }
    ]));
    return { el: el };
  }

  /* ------------------------------------------------------------------------
     Memory window: Repo System Avg@4 against turns of history kept.
     ------------------------------------------------------------------------ */
  function memoryLines(target, opts) {
    var D = opts.D;
    var el = mount(target, 360);
    var rows = D.memoryWindow;
    var turns = [50, 100, 150, 200];
    var W = 360, H = 200, L = 36, R = 10, Tt = 18, B = 40;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Memory window" }, el);
    var top = 100;
    var x = function (v) { return L + (v - 50) / 150 * (W - L - R); };
    var y = function (v) { return Tt + (top - v) / top * (H - Tt - B); };
    var grid = svg("g", { "class": "grid" }, s);
    for (var t = 0; t <= top; t += 25) {
      svg("line", { x1: L, x2: W - R, y1: y(t), y2: y(t) }, grid);
      text(s, L - 6, y(t) + 4, String(t), "tick", "end");
    }
    turns.forEach(function (v) { text(s, x(v), H - B + 18, String(v), "tick", "middle"); });
    text(s, W - R, H - B + 33, "turns of history in the prompt", "alab", "end");
    text(s, L, 10, "Repo System, Avg@4", "alab");
    rows.forEach(function (r) {
      var m = D.model(r.model);
      var d = turns.map(function (tv, i) { return (i ? "L" : "M") + x(tv) + " " + y(r.avg4[String(tv)]); }).join("");
      svg("path", { "class": "ln", d: d, stroke: m.color }, s);
      turns.forEach(function (tv) {
        var c = svg("circle", { "class": "pt", cx: x(tv), cy: y(r.avg4[String(tv)]), r: tv === 100 ? 6 : 4, fill: m.color, stroke: "var(--surface-3)", "stroke-width": 1.5 }, s);
        bindTip(c, "<b>" + m.name + "</b><small>" + tv + " turns: " + fmt(r.avg4[String(tv)], 2) + "% Avg@4</small>");
      });
    });
    el.appendChild(legend(rows.map(function (r) { var m = D.model(r.model); return { color: m.color, label: m.name }; })));
    return { el: el };
  }

  /* ------------------------------------------------------------------------
     One-shot example: before and after, two models, Repo System.
     ------------------------------------------------------------------------ */
  function iclBars(target, opts) {
    var D = opts.D;
    var el = mount(target, 360);
    var rows = D.inContext;
    var W = 360, H = 200, L = 36, R = 6, Tt = 18, B = 40;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "In-context example" }, el);
    var top = 100;
    var y = function (v) { return Tt + (top - v) / top * (H - Tt - B); };
    var grid = svg("g", { "class": "grid" }, s);
    for (var t = 0; t <= top; t += 25) {
      svg("line", { x1: L, x2: W - R, y1: y(t), y2: y(t) }, grid);
      text(s, L - 6, y(t) + 4, String(t), "tick", "end");
    }
    text(s, L, 10, "Repo System, Avg@4", "alab");
    var gw = (W - L - R) / rows.length, bw = 26;
    rows.forEach(function (r, i) {
      var m = D.model(r.model);
      var cx = L + gw * (i + 0.5);
      var a = svg("rect", { "class": "bar", x: cx - bw - 2, y: y(r.avg4), width: bw, height: y(0) - y(r.avg4), rx: 3, fill: m.color, opacity: 0.45 }, s);
      var b = svg("rect", { "class": "bar", x: cx + 2, y: y(r.avg4_icl), width: bw, height: y(0) - y(r.avg4_icl), rx: 3, fill: m.color }, s);
      text(s, cx - bw / 2 - 2, y(r.avg4) - 4, fmt(r.avg4, 1), "vlab", "middle");
      text(s, cx + bw / 2 + 2, y(r.avg4_icl) - 4, fmt(r.avg4_icl, 1), "vlab", "middle");
      bindTip(a, "<b>" + m.name + "</b><small>no example: " + fmt(r.avg4, 2) + "%</small>");
      bindTip(b, "<b>" + m.name + "</b><small>one-shot example: " + fmt(r.avg4_icl, 2) + "%</small>");
      text(s, cx, H - B + 18, shortName(m.name), "tick", "middle");
    });
    el.appendChild(legend([{ color: "var(--text-faint)", label: "no example" }, { color: "var(--accent-400)", label: "one worked example (12 actions) in the prompt" }]));
    return { el: el };
  }

  return {
    rulesBars: rulesBars, stepCurves: stepCurves, loopScatter: loopScatter,
    failureBars: failureBars, effortBars: effortBars, memoryLines: memoryLines, iclBars: iclBars
  };
})();
