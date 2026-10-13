"""Merge the per-row progress panels, write final progress.json / loop.json, print validation tables."""
import json, sys

GT = {  # Table 1, Avg@4 success rate (%)
    "Turn On Lights": {"Gemini 3 Pro Preview": 44.17, "GPT-5": 28.33, "Gemini 2.5 Pro": 29.17, "gpt-oss-120b (high)": 27.50,
        "DeepSeek-V3.2": 18.33, "Grok 4 Fast": 14.17, "Qwen3-235B-A22B-Instruct": 15.00, "Qwen3-30B-A3B-Instruct": 11.67,
        "gpt-oss-120b (medium)": 16.67, "GLM-4-32B-0414": 14.17, "gpt-oss-120b (low)": 7.50, "Llama 3.3 70B Instruct": 6.67,
        "Qwen3-4B-Instruct": 0.00, "Llama 3.1 8B Instruct": 6.67, "GLM-4-9B-Chat": 0.00},
    "Repo System": {"Gemini 3 Pro Preview": 65.83, "GPT-5": 62.50, "Gemini 2.5 Pro": 50.00, "gpt-oss-120b (high)": 18.33,
        "DeepSeek-V3.2": 48.33, "Grok 4 Fast": 38.33, "Qwen3-235B-A22B-Instruct": 15.83, "Qwen3-30B-A3B-Instruct": 26.67,
        "gpt-oss-120b (medium)": 2.50, "GLM-4-32B-0414": 9.17, "gpt-oss-120b (low)": 9.17, "Llama 3.3 70B Instruct": 19.17,
        "Qwen3-4B-Instruct": 13.33, "Llama 3.1 8B Instruct": 0.00, "GLM-4-9B-Chat": 0.00},
}
ORDER = list(GT["Turn On Lights"].keys())

def clean(v):
    v = round(v, 4)
    return 0.0 if v == 0 else v

# ---------------- progress ----------------
raw = json.load(open("progress_rows_raw.json"))  # produced by extract_progress.py (one panel per row x env)
merged = {}
for row_i, p in enumerate(raw["panels"]):
    env = p["env"]
    m = merged.setdefault(env, {"env": env, "x_label": p["x_label"], "y_label": p["y_label"], "x_max": p["x_max"],
                                "y_lim": p["y_lim"], "series": [], "random": None})
    if m["random"] is None:
        m["random"] = [[x, clean(y)] for x, y in p["random"]]
    else:
        assert m["random"] == [[x, clean(y)] for x, y in p["random"]], "random differs between rows for " + env
    m["y_lim"] = [min(m["y_lim"][0], p["y_lim"][0]), max(m["y_lim"][1], p["y_lim"][1])]
    for s in p["series"]:
        m["series"].append({"model": s["model"], "color": s["color"], "figure_row": 1 + row_i // 3, "points": [[x, clean(y)] for x, y in s["points"]]})
    m["random_color"] = p["random_color"]
envs = ["Turn On Lights", "AI Trading", "Repo System"]
final_prog = {"source": "combined_progress-all.pdf (cross-checked against combined_progress.pdf: identical for the 9 shared models)",
              "x_step": 10,
              "note": ("Curves are sampled every 10 steps in the source figure (21 points for x<=200, 13 for x<=120). "
                       "'figure_row' records which of the two legend rows of the source figure the model belongs to "
                       "(colours are reused between rows). The AI Trading panel shares the row's 'Success Rate' y-label but its "
                       "values are not multiples of 1/120 and can be negative; its metric is not stated in the figure."),
              "panels": []}
for env in envs:
    m = merged[env]
    m["series"].sort(key=lambda s: ORDER.index(s["model"]))
    final_prog["panels"].append(m)
json.dump(final_prog, open("progress.json", "w"), indent=1)

print("=== Progress curves: final y (x = x_max) vs Table 1 Avg@4/100 ===")
print(f"{'env':16s} {'model':26s} {'final_y':>8s} {'table1':>8s} {'diff':>8s}")
worst = 0
for env in ("Turn On Lights", "Repo System"):
    m = merged[env]
    for s in m["series"]:
        fy = s["points"][-1][1]; gt = GT[env][s["model"]] / 100
        d = fy - gt; worst = max(worst, abs(d))
        flag = "  <-- |diff| > 0.01" if abs(d) > 0.01 else ""
        print(f"{env:16s} {s['model']:26s} {fy:8.4f} {gt:8.4f} {d:+8.4f}{flag}")
    print(f"{env:16s} {'random':26s} {m['random'][-1][1]:8.4f} {'-':>8s}")
print("max |diff| progress:", round(worst, 4))

# ---------------- loop ----------------
lr = json.load(open("loop_raw.json"))
final_loop = {"source": "loop_sr.pdf (scatter digitized from the raster embedded in the PowerPoint-exported PDF; "
                        "'Infeasible Region' triangles taken from the PDF vector paths)",
              "legend": lr["legend"], "panels": []}
print("\n=== Scatter: success_rate vs Table 1 Avg@4/100 ===")
print(f"{'env':16s} {'model':26s} {'loop':>8s} {'sr':>8s} {'table1':>8s} {'diff':>8s}")
worst = 0
for p in lr["panels"]:
    env = p["env"]
    pts = []
    for q in sorted(p["points"], key=lambda q: ORDER.index(q["model"])):
        pts.append({"model": q["model"], "loop_ratio": clean(q["loop_ratio"]), "success_rate": clean(q["success_rate"])})
        gt = GT[env][q["model"]] / 100; d = q["success_rate"] - gt; worst = max(worst, abs(d))
        flag = "  <-- |diff| > 0.01" if abs(d) > 0.01 else ""
        print(f"{env:16s} {q['model']:26s} {q['loop_ratio']:8.4f} {q['success_rate']:8.4f} {gt:8.4f} {d:+8.4f}{flag}")
    panel = {"env": env, "points": pts, "axes": p["axes"],
             "infeasible": [[v[0], v[1]] for v in p["infeasible"]],
             "infeasible_axes_fraction": p["infeasible_axes_fraction"]}
    if p["axes"].get("x_break"):
        panel["infeasible_segment"] = [v[2] for v in p["infeasible"]]
        panel["note"] = ("Panel has a broken x-axis (left part ~0 to 0.07, right part ~0.29 to 0.35, different scales). "
                         "'infeasible' vertices are mapped through the sub-axis each vertex lies in ('infeasible_segment'); "
                         "the hypotenuse is a straight line in display space, not in data space, so use "
                         "'infeasible_axes_fraction' (x, y as fractions of the full axes box, origin bottom-left) to redraw it.")
    final_loop["panels"].append(panel)
print("max |diff| scatter:", round(worst, 4))
json.dump(final_loop, open("loop.json", "w"), indent=1)
print("\nwrote progress.json, loop.json")
