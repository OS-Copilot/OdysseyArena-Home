/* ==========================================================================
   OdysseyArena — leaderboard (Table 1 of the paper)
   Sortable, one environment at a time or all four. The human row stays on
   top as the reference; proprietary rows carry a tint; the best model per
   column is bold. Class namespace: lb- plus the shared table styles.
   ========================================================================== */
window.OdysseyLeaderboard = function (root, D) {
  "use strict";

  var ENV_COLS = {
    lights:  [{ k: "avg4", t: "Avg@4" }, { k: "pass4", t: "Pass@4" }],
    trading: [{ k: "avg4", t: "Avg@4" }, { k: "best4", t: "Best@4" }],
    energy:  [{ k: "avg4", t: "Avg@4" }, { k: "pass4", t: "Pass@4" }],
    repo:    [{ k: "avg4", t: "Avg@4" }, { k: "pass4", t: "Pass@4" }]
  };
  var state = { env: "all", sort: null, dir: -1, filter: "all" };

  root.innerHTML =
    '<div class="controls">' +
      '<span class="ctl-label">Environment</span><div class="seg lb-env" role="group" aria-label="Environment"></div>' +
      '<span class="spacer"></span>' +
      '<span class="ctl-label">Models</span><div class="seg lb-filter" role="group" aria-label="Model filter">' +
        '<button type="button" data-f="all" aria-pressed="true">All</button>' +
        '<button type="button" data-f="prop" aria-pressed="false">Proprietary</button>' +
        '<button type="button" data-f="open" aria-pressed="false">Open weight</button></div>' +
    "</div>" +
    '<div class="table-shell"><div class="table-scroll"><table class="data"><thead></thead><tbody></tbody></table></div></div>' +
    '<div class="lb-legend"><span><i class="h"></i>human participants</span><span><i class="p"></i>proprietary model</span>' +
      '<span>Avg@4: mean over four runs · Pass@4: solved in any run · Best@4: best profit of four runs</span></div>';

  var elEnv = root.querySelector(".lb-env");
  var elFilter = root.querySelector(".lb-filter");
  var thead = root.querySelector("thead");
  var tbody = root.querySelector("tbody");

  [{ k: "all", n: "All four" }].concat(D.envs.map(function (e) { return { k: e.key, n: e.name, c: e.color }; })).forEach(function (o) {
    var b = document.createElement("button");
    b.type = "button";
    b.innerHTML = (o.c ? '<span class="dot" style="width:8px;height:8px;border-radius:50%;background:' + o.c + '"></span>' : "") + o.n;
    b.setAttribute("aria-pressed", String(o.k === state.env));
    b.addEventListener("click", function () {
      state.env = o.k; state.sort = null;
      Array.prototype.forEach.call(elEnv.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      render();
    });
    elEnv.appendChild(b);
  });
  Array.prototype.forEach.call(elFilter.children, function (b) {
    b.addEventListener("click", function () {
      state.filter = b.getAttribute("data-f");
      Array.prototype.forEach.call(elFilter.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      render();
    });
  });

  function cols() {
    var envs = state.env === "all" ? D.envs.map(function (e) { return e.key; }) : [state.env];
    var out = [];
    envs.forEach(function (e) {
      ENV_COLS[e].forEach(function (c) { out.push({ env: e, k: c.k, t: c.t, id: e + "." + c.k }); });
    });
    return out;
  }

  function val(row, c) { return row[c.env][c.k]; }

  function render() {
    var cs = cols();
    var envs = state.env === "all" ? D.envs : [D.envByKey[state.env]];
    thead.innerHTML = "";
    var g = document.createElement("tr"); g.className = "group";
    g.innerHTML = '<th></th><th></th>' + envs.map(function (e) {
      return '<th colspan="2"><span class="env-dot" style="background:' + e.color + '"></span>' + e.name + (e.key === "trading" ? " (profit)" : "") + "</th>";
    }).join("");
    thead.appendChild(g);
    var h = document.createElement("tr");
    h.innerHTML = '<th class="rank">#</th><th>Model</th>' + cs.map(function (c) {
      var sorted = state.sort === c.id;
      return '<th class="sortable" data-id="' + c.id + '"' + (sorted ? ' aria-sort="' + (state.dir < 0 ? "descending" : "ascending") + '"' : "") + ">" + c.t + '<span class="arrow">' + (sorted && state.dir > 0 ? "▲" : "▼") + "</span></th>";
    }).join("");
    thead.appendChild(h);
    Array.prototype.forEach.call(h.querySelectorAll("th.sortable"), function (th) {
      th.addEventListener("click", function () {
        var id = th.getAttribute("data-id");
        if (state.sort === id) state.dir = -state.dir; else { state.sort = id; state.dir = -1; }
        render();
      });
    });

    var rows = D.mainResults.filter(function (r) {
      if (r.human) return false;
      if (state.filter === "prop") return r.open === false;
      if (state.filter === "open") return r.open === true;
      return true;
    });
    if (state.sort) {
      var c = cs.filter(function (x) { return x.id === state.sort; })[0];
      rows = rows.slice().sort(function (a, b) { return (val(a, c) - val(b, c)) * state.dir; });
    }
    var best = {}, max = {};
    cs.forEach(function (c) {
      best[c.id] = Math.max.apply(null, rows.map(function (r) { return val(r, c); }));
      max[c.id] = Math.max(1e-9, Math.max.apply(null, D.mainResults.map(function (r) { return Math.abs(val(r, c)); })));
    });
    var human = D.mainResults.filter(function (r) { return r.human; })[0];
    tbody.innerHTML = "";
    if (human) tbody.appendChild(rowEl(human, cs, "", null, max));
    rows.forEach(function (r, i) { tbody.appendChild(rowEl(r, cs, String(i + 1), best, max)); });
  }

  function cell(v, c, isBest, max) {
    var isProfit = c.env === "trading";
    var s = isProfit ? (v >= 0 ? "+" : "") + v.toFixed(2) + "%" : v.toFixed(2);
    var w = Math.max(0, Math.min(1, Math.abs(v) / max[c.id]));
    return '<td' + (isBest ? ' class="best"' : "") + '><span class="cellbar">' + s + '<i style="transform:scaleX(' + w.toFixed(3) + ')"></i></span></td>';
  }

  function rowEl(r, cs, rank, best, max) {
    var tr = document.createElement("tr");
    if (r.human) tr.className = "human";
    else if (r.open === false) tr.className = "prop";
    var logo = r.human
      ? '<span class="hu" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.6-4 3.8-6.5 7.5-6.5s6.9 2.5 7.5 6.5"/></svg></span>'
      : (r.logo ? '<img src="' + r.logo + '" alt="">' : "");
    var tag = r.human ? "" : '<span class="tag ' + (r.open ? "open" : "closed") + '">' + (r.open ? "open" : "proprietary") + "</span>";
    tr.innerHTML = '<td class="rank">' + rank + '</td><td><span class="model-cell">' + logo + '<span class="nm">' + r.model + "</span>" + tag + "</span></td>" +
      cs.map(function (c) { return cell(val(r, c), c, best && val(r, c) === best[c.id], max); }).join("");
    return tr;
  }

  render();
  return { el: root, update: function (o) { Object.assign(state, o || {}); render(); } };
};
