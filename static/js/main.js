/* ==========================================================================
   OdysseyArena — page behaviour
   Theme toggle, nav, reveal-on-scroll and copy-to-clipboard.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- theme
     The boot script in <head> sets data-theme before first paint; this only
     handles the toggle and tells the charts to repaint. */
  function theme() {
    var btn = document.getElementById("themeToggle");
    var root = document.documentElement;
    function label() {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      if (btn) btn.setAttribute("aria-label", "Switch to " + next + " theme");
    }
    label();
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("odyssey-theme", next); } catch (e) { /* private mode */ }
      label();
      window.dispatchEvent(new CustomEvent("odyssey:theme", { detail: next }));
    });
  }

  /* ------------------------------------------------------------------ nav */
  function nav() {
    var el = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!el) return;

    function onScroll() { el.classList.toggle("stuck", window.scrollY > 40); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    function closeMenu() {
      if (!links || !toggle) return;
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
    if (toggle && links) {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      links.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
      document.addEventListener("click", function (e) { if (!links.contains(e.target)) closeMenu(); });
    }

    var more = document.getElementById("navMore");
    var setOpen = function () {};
    if (more) {
      var moreBtn = more.querySelector("button");
      setOpen = function (v) {
        more.setAttribute("data-open", String(v));
        moreBtn.setAttribute("aria-expanded", String(v));
      };
      moreBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(more.getAttribute("data-open") !== "true");
      });
      document.addEventListener("click", function (e) { if (!more.contains(e.target)) setOpen(false); });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setOpen(false); closeMenu(); }
    });

    /* scroll-spy over the section links */
    var map = {};
    Array.prototype.forEach.call(document.querySelectorAll('.nav-links > li > a[href^="#"]'), function (a) {
      var id = a.getAttribute("href").slice(1);
      var s = document.getElementById(id);
      if (s) map[id] = { a: a, s: s };
    });
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var m = map[en.target.id];
        if (m && en.isIntersecting) {
          Object.keys(map).forEach(function (k) { map[k].a.classList.remove("active"); });
          m.a.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (k) { io.observe(map[k].s); });
  }

  /* --------------------------------------------------------------- reveal */
  function reveal() {
    var items = document.querySelectorAll(".rise");
    if (!("IntersectionObserver" in window) || reduced) {
      Array.prototype.forEach.call(items, function (n) { n.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    Array.prototype.forEach.call(items, function (n) { io.observe(n); });
  }

  /* ----------------------------------------------------------------- copy */
  function copyBib() {
    var btn = document.getElementById("copyBib");
    var pre = document.getElementById("bibtex");
    if (!btn || !pre) return;
    btn.addEventListener("click", function () {
      var text = pre.textContent;
      var done = function () {
        btn.classList.add("done");
        btn.querySelector("span").textContent = "Copied";
        setTimeout(function () {
          btn.classList.remove("done");
          btn.querySelector("span").textContent = "Copy";
        }, 1800);
      };
      var legacy = function () {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, legacy);
      else legacy();
    });
  }

  function init() {
    [reveal, theme, nav, copyBib].forEach(function (step) {
      try { step(); } catch (e) { if (window.console) console.error(e); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
