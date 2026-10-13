/* ==========================================================================
   OdysseyArena — page data
   Everything the page shows that is not prose lives here or in the two
   generated files it reads:
     odyssey-tables.js   every table in the paper (tools/parse_paper_tables.py)
     odyssey-curves.js   the step curves and loop-ratio points, digitized from
                         the paper's vector figures (tools/digitize_figures.py)
   This file adds the environment catalogue, the model catalogue (family, logo,
   open or proprietary), the four replayed trajectories and chart settings.
   Each block names its source in the paper.
   ========================================================================== */
window.ODYSSEY = (function () {
  "use strict";

  var T = window.ODYSSEY_TABLES || {};
  var C = window.ODYSSEY_CURVES || null;

  /* ------------------------------------------------------- environments
     Section 3 of the paper: one structural primitive per environment. */
  var envs = [
    {
      key: "lights", name: "Turn On Lights", short: "Lights",
      primitive: "Discrete symbolic rules",
      color: "#e9a12d",
      what: "A network of interdependent lights. Toggling one may cascade through hidden Boolean couplings; the goal is every light on.",
      actions: "Toggle one light per step",
      observe: "The on/off state of every light; nothing about the couplings",
      success: "All lights on within the step budget",
      steps: 200
    },
    {
      key: "trading", name: "AI Trading", short: "Trading",
      primitive: "Continuous stochastic dynamics",
      color: "#3dbcc5",
      what: "A multi-asset market driven by latent factors under noise, with daily news as an indirect hint. The goal is cumulative return.",
      actions: "Buy and sell quantities for every stock, sells before buys",
      observe: "Prices, holdings, cash and the next day's news",
      success: "Profit over the trading horizon, net of transaction costs",
      steps: 120
    },
    {
      key: "energy", name: "Energy Dispatch", short: "Energy",
      primitive: "Periodic temporal patterns",
      color: "#6f9ce6",
      what: "A power grid whose wind and solar efficiency follow hidden cycles. Dispatch thermal, wind, solar and battery to meet demand under budget.",
      actions: "Rated output per source and a battery charge or discharge",
      observe: "Demand, budget, battery level and yesterday's realized output",
      success: "Survive the full horizon, then meet the carbon and stability thresholds",
      steps: 120
    },
    {
      key: "repo", name: "Repo System", short: "Repo",
      primitive: "Relational graph structures",
      color: "#9e81cf",
      what: "A Python project with a hidden package dependency graph. Installing one package may upgrade, downgrade or remove others.",
      actions: "Shell commands: pip install, pip uninstall, pip list, repo tree, python",
      observe: "Terminal output: file trees, install logs, import errors",
      success: "The project's entry point runs; partial fixes earn nothing",
      steps: 120
    }
  ];
  var envByKey = {};
  envs.forEach(function (e) { envByKey[e.key] = e; });

  /* ------------------------------------------------------------- models
     Table 1 order. "family" picks the logo in public/logos/ and the colour. */
  var families = {
    Human:    { color: "#e9a12d", logo: null },
    Gemini:   { color: "#6693d6", logo: "Gemini" },
    GPT:      { color: "#5fae9d", logo: "GPT" },
    DeepSeek: { color: "#d08ba4", logo: "DeepSeek" },
    Grok:     { color: "#6b7a86", logo: "Grok" },
    Qwen:     { color: "#9e81cf", logo: "Qwen" },
    GLM:      { color: "#d78c6e", logo: "GLM" },
    Llama:    { color: "#c9a227", logo: "Llama" }
  };
  var models = [
    { name: "Human",                    family: "Human",    open: null,  human: true },
    { name: "Gemini 3 Pro Preview",     family: "Gemini",   open: false, dash: "" },
    { name: "GPT-5",                    family: "GPT",      open: false, dash: "" },
    { name: "Gemini 2.5 Pro",           family: "Gemini",   open: false, dash: "6 4" },
    { name: "gpt-oss-120b (high)",      family: "GPT",      open: true,  dash: "6 4" },
    { name: "DeepSeek-V3.2",            family: "DeepSeek", open: true,  dash: "" },
    { name: "Grok 4 Fast",              family: "Grok",     open: false, dash: "" },
    { name: "Qwen3-235B-A22B-Instruct", family: "Qwen",     open: true,  dash: "" },
    { name: "Qwen3-30B-A3B-Instruct",   family: "Qwen",     open: true,  dash: "6 4" },
    { name: "gpt-oss-120b (medium)",    family: "GPT",      open: true,  dash: "2 3" },
    { name: "GLM-4-32B-0414",           family: "GLM",      open: true,  dash: "" },
    { name: "gpt-oss-120b (low)",       family: "GPT",      open: true,  dash: "8 3 2 3" },
    { name: "Llama 3.3 70B Instruct",   family: "Llama",    open: true,  dash: "" },
    { name: "Qwen3-4B-Instruct",        family: "Qwen",     open: true,  dash: "2 3" },
    { name: "Llama 3.1 8B Instruct",    family: "Llama",    open: true,  dash: "6 4" },
    { name: "GLM-4-9B-Chat",            family: "GLM",      open: true,  dash: "6 4" }
  ];
  var modelByName = {};
  models.forEach(function (m) {
    var f = families[m.family];
    m.color = f.color;
    m.logo = f.logo ? "public/logos/" + f.logo + ".png" : null;
    modelByName[m.name] = m;
  });
  /* the appendix tables spell one model differently */
  modelByName["gpt-oss-120b-high"] = modelByName["gpt-oss-120b (high)"];

  function model(name) { return modelByName[name] || { name: name, family: "", color: "#888", open: true }; }

  /* ---------------------------------------------------------- Table 1
     OdysseyArena-Lite, Avg@4 and Pass@4 (Best@4 profit for AI Trading). */
  var mainResults = (T.mainResults || []).map(function (r) {
    var m = model(r.model);
    return {
      model: r.model, family: m.family, open: m.open, human: !!m.human, logo: m.logo, color: m.color,
      lights: r.lights, trading: r.trading, energy: r.energy, repo: r.repo
    };
  });

  /* ------------------------------------------- rules given vs hidden
     Appendix Table "rule_comparison": success rate (profit for Trading)
     without and with the latent rules in the prompt. The seven models of the
     paper's Figure 3 are the default subset. */
  var rulesComparison = T.rulesComparison || [];
  var rulesFigureModels = [
    "Llama 3.3 70B Instruct", "GLM-4-32B-0414", "Qwen3-235B-A22B-Instruct",
    "DeepSeek-V3.2", "Grok 4 Fast", "GPT-5", "Gemini 3 Pro Preview"
  ];

  /* ------------------------------------------------- failure modes
     Section 6.1: 47 failed Gemini 3 Pro Preview trajectories, each may
     carry several modes. */
  var failureModes = (T.failureModes || []).map(function (f) {
    var label = f.mode.replace("Constrains", "Constraints");
    var gloss = {
      "Exploration Limitations": "converges early on a local strategy and stops testing hypotheses",
      "Memory Constraints": "gathers the right evidence but fails to retrieve it later in a long history",
      "Behavior Stagnation": "repeats an action that the environment has already rejected",
      "Planning Inability": "cannot form a high-level plan at all"
    }[label] || "";
    return { mode: label, count: f.count, percent: f.percent, gloss: gloss, total: 47 };
  });

  /* ------------------------------------------- what helps, what does not
     Reasoning effort: Table 1 rows for gpt-oss-120b. Memory window and the
     one-shot example: appendix tables on Repo System. */
  var reasoningEffort = ["low", "medium", "high"].map(function (lvl) {
    var row = mainResults.filter(function (r) { return r.model === "gpt-oss-120b (" + lvl + ")"; })[0];
    return { level: lvl, row: row };
  });
  var memoryWindow = T.memoryWindow || [];
  var inContext = T.inContext || [];

  /* ------------------------------------------------- benchmark table
     Table 2: inductive requirement, horizon class and deployment. */
  var benchmarkComparison = T.benchmarkComparison || [];

  /* --------------------------------------------------------- suites
     Section 4.2. */
  var suites = {
    lite: { tasksPerEnv: 30, tasks: 120, stepLimits: { lights: 200, trading: 120, energy: 120, repo: 120 }, runs: 4 },
    challenge: { tasksPerEnv: 10, tasks: 40, stepsAtLeast: 1000 }
  };

  /* ------------------------------------------------ walkthroughs
     Four replayed trajectories after the paper's Figure 2. They show the
     interface of each environment, not a scored run: the lights rules, the
     prices, the news and the package names are schematic, the dispatch
     numbers are the figure's. "obs" is what the agent sees before acting. */
  var walkthroughs = {
    lights: {
      n: 7,
      steps: [
        { obs: [0, 0, 0, 0, 0, 0, 0], action: "toggle 1", result: "Action failed.", kind: "no",
          note: "Light 1 does not respond. Nothing explains why." },
        { obs: [0, 0, 0, 0, 0, 0, 0], action: "toggle 2", result: "Light 2 toggled.", kind: "ok",
          note: "A first foothold." },
        { obs: [0, 1, 0, 0, 0, 0, 0], action: "toggle 1", result: "Light 1 toggled.", kind: "ok",
          note: "Hypothesis: light 1 needs light 2 on." },
        { obs: [1, 1, 0, 0, 0, 0, 0], action: "toggle 3", result: "Light 3 toggled.", kind: "ok" },
        { obs: [1, 1, 1, 0, 0, 0, 0], action: "toggle 4", result: "Action failed.", kind: "no",
          note: "Another hidden condition." },
        { obs: [1, 1, 1, 0, 0, 0, 0], action: "toggle 5", result: "Light 5 toggled.", kind: "ok" },
        { obs: [1, 1, 1, 0, 1, 0, 0], action: "toggle 4", result: "Light 4 toggled.", kind: "ok",
          note: "Light 4 needed light 5." },
        { obs: [1, 1, 1, 1, 1, 0, 0], action: "toggle 6", result: "Light 6 toggled.", kind: "ok" },
        { obs: [1, 1, 1, 1, 1, 1, 0], action: "toggle 7", result: "Light 7 toggled. All lights on.", kind: "win",
          final: [1, 1, 1, 1, 1, 1, 1] }
      ]
    },
    trading: {
      stocks: ["S1", "S2", "S3"],
      steps: [
        { obs: { day: 1, prices: [5.0, 6.0, 9.0], hold: [0, 0, 0], cash: 1000, news: "Next day: a signal that lifts the factor behind S1" },
          action: '{"sell": {}, "buy": {"S1": 100, "S2": 70}}', result: "Orders filled. Cash 80.", kind: "ok",
          note: "Spread across two stocks while the factor structure is unknown." },
        { obs: { day: 2, prices: [5.4, 5.9, 9.6], hold: [100, 70, 0], cash: 80, news: "Next day: the factor behind S2 weakens" },
          action: '{"sell": {"S2": 70}, "buy": {"S3": 40}}', result: "Sells executed before buys. Cash 109.", kind: "ok",
          note: "S1 moved with the hint; S2 against it." },
        { obs: { day: 3, prices: [5.6, 5.7, 10.3], hold: [100, 0, 40], cash: 109, news: "Next day: both factors rise" },
          action: '{"sell": {}, "buy": {"S1": 19}}', result: "Orders filled. Cash 3.", kind: "ok" },
        { obs: { day: 120, prices: [5.3, 6.1, 11.0], hold: [200, 150, 50], cash: 200, news: "Trading horizon reached" },
          action: "—", result: "Profit ratio +172.50%", kind: "win",
          note: "Scored on the final portfolio value." }
      ]
    },
    energy: {
      steps: [
        { obs: { day: 1, demand: 130, budget: 530, battery: [0, 10], stability: 0.95, carbon: 0.64, prev: null },
          action: '{"Thermal": 100, "Wind": 20, "Solar": 20, "Battery": -10}', result: "Demand unsatisfied last day.", kind: "no",
          note: "Realized output fell short of the rated plan: wind and solar efficiency are hidden." },
        { obs: { day: 2, demand: 165, budget: 750, battery: [10, 10], stability: 0.91, carbon: 0.69,
                 prev: { plan: [100, 20, 20, -10], real: [99.9, 18.8, 20.5, -10] } },
          action: '{"Thermal": 100, "Wind": 40, "Solar": 40, "Battery": 5}', result: "Demand met. Carbon 0.67.", kind: "ok",
          note: "Over-provision the renewables and discharge the battery." },
        { obs: { day: 3, demand: 150, budget: 630, battery: [5, 10], stability: 0.92, carbon: 0.67,
                 prev: { plan: [100, 40, 40, 5], real: [100.2, 37.5, 41.1, 5] } },
          action: '{"Thermal": 90, "Wind": 45, "Solar": 35, "Battery": -5}', result: "Demand met. Carbon 0.66.", kind: "ok",
          note: "The gap between plan and output is the only trace of the efficiency cycle." },
        { obs: { day: 120, demand: 140, budget: 590, battery: [10, 10], stability: 0.93, carbon: 0.58,
                 prev: { plan: [80, 50, 40, 0], real: [80.1, 48.2, 42.6, 0] } },
          action: "—", result: "Horizon survived; carbon and stability within thresholds.", kind: "win" }
      ]
    },
    repo: {
      steps: [
        { obs: ["Welcome to Repo System"], action: "repo tree", kind: "ok",
          result: "run.py\ncore/\n  smoke.py\n  check_io.py\neval/\n  run_evaluation.py" },
        { obs: null, action: "python run.py", kind: "no",
          result: "ImportError: No module named 'pkg1'",
          note: "An error is the only view of a missing edge in the dependency graph." },
        { obs: null, action: "pip install pkg1==1.0", kind: "ok",
          result: "Successfully installed pkg1==1.0" },
        { obs: null, action: "pip install pkg2==1.0", kind: "no",
          result: "ERROR: pkg2==1.0 conflicts with pkg1==1.0" },
        { obs: null, action: "pip install pkg2==1.1", kind: "ok",
          result: "Resolving... upgraded pkg1 1.0 -> 1.1\nSuccessfully installed pkg2==1.1",
          note: "A side effect: the resolver changed a package the command never named." },
        { obs: null, action: "python run.py", kind: "win",
          result: "All required packages installed.\nPackages are compatible.\nRunning successfully." }
      ]
    }
  };

  /* --------------------------------------------- curves and points
     Digitized from Figures 4 and 5 of the paper (see odyssey-curves.js). */
  var curves = C ? C.progress : null;
  var loops = C ? C.loop : null;

  return {
    envs: envs, envByKey: envByKey,
    families: families, models: models, model: model,
    mainResults: mainResults,
    rulesComparison: rulesComparison, rulesFigureModels: rulesFigureModels,
    failureModes: failureModes,
    reasoningEffort: reasoningEffort, memoryWindow: memoryWindow, inContext: inContext,
    benchmarkComparison: benchmarkComparison,
    suites: suites,
    walkthroughs: walkthroughs,
    curves: curves, loops: loops
  };
})();
