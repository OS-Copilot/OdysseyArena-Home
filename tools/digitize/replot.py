import json, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

prog = json.load(open("progress.json"))
loop = json.load(open("loop.json"))

# ---------- progress: 2 rows x 3 panels like the original ----------
fig, axes = plt.subplots(2, 3, figsize=(15, 9))
for row in (1, 2):
    for ci, panel in enumerate(prog["panels"]):
        ax = axes[row - 1, ci]
        for s in panel["series"]:
            if s["figure_row"] != row: continue
            xs, ys = zip(*s["points"])
            ax.plot(xs, ys, color=s["color"], lw=3, label=s["model"])
        xs, ys = zip(*panel["random"])
        ax.plot(xs, ys, color=panel["random_color"], lw=3, ls="--", label="random")
        ax.set_xlim(0, panel["x_max"]); ax.set_title(panel["env"]); ax.set_xlabel("Step"); ax.grid(alpha=.3)
        if ci == 0: ax.set_ylabel(panel["y_label"])
        if ci == 2: ax.legend(fontsize=7, loc="upper left")
fig.tight_layout(); fig.savefig("raster/replot_progress.png", dpi=80)

# ---------- loop scatter ----------
MK = {e["model"]: e["marker"] for e in loop["legend"]}
COL = {e["model"]: tuple(c / 255 for c in e["rgb"]) for e in loop["legend"]}
fig = plt.figure(figsize=(12, 6))
# panel a
ax = fig.add_axes([0.08, 0.12, 0.38, 0.75])
pa = loop["panels"][0]
for q in pa["points"]:
    ax.scatter(q["loop_ratio"], q["success_rate"], marker=MK[q["model"]], color=COL[q["model"]], s=160, alpha=.8, label=q["model"])
ax.add_patch(plt.Polygon(pa["infeasible"], closed=True, color=(0.918, 0.906, 0.933), zorder=0))
ax.set_xlim(*pa["axes"]["x_lim"]); ax.set_ylim(*pa["axes"]["y_lim"]); ax.set_title("(a) " + pa["env"]); ax.set_xlabel("Loop Ratio"); ax.set_ylabel("Success Rate")
ax.legend(fontsize=6, loc="upper right", ncol=2)
# panel b with broken x axis: two sub-axes with widths from the axes fractions
pb = loop["panels"][1]; A = pb["axes"]
x0, w = 0.56, 0.40
fl, fr = A["left_axes_fraction"], A["right_axes_fraction"]
axl = fig.add_axes([x0, 0.12, w * fl, 0.75]); axr = fig.add_axes([x0 + w * (1 - fr), 0.12, w * fr, 0.75])
for q in pb["points"]:
    for a_, lim in ((axl, A["x_lim_left"]), (axr, A["x_lim_right"])):
        if lim[0] <= q["loop_ratio"] <= lim[1]:
            a_.scatter(q["loop_ratio"], q["success_rate"], marker=MK[q["model"]], color=COL[q["model"]], s=160, alpha=.8)
axl.set_xlim(*A["x_lim_left"]); axr.set_xlim(*A["x_lim_right"]); axl.set_ylim(*A["y_lim"]); axr.set_ylim(*A["y_lim"])
axr.set_yticks([]); axl.spines["right"].set_visible(False); axr.spines["left"].set_visible(False)
axl.set_xticks([0.0, 0.05]); axr.set_xticks([0.30, 0.35])
# infeasible polygon in axes-fraction coords over the whole panel box
ov = fig.add_axes([x0, 0.12, w, 0.75]); ov.set_xlim(0, 1); ov.set_ylim(0, 1); ov.axis("off"); ov.set_zorder(-1)
ov.add_patch(plt.Polygon(pb["infeasible_axes_fraction"], closed=True, color=(0.918, 0.906, 0.933)))
axl.set_facecolor("none"); axr.set_facecolor("none")
axl.set_title("(b) " + pb["env"], x=1.0); axl.set_xlabel("Loop Ratio", x=1.0)
fig.savefig("raster/replot_loop.png", dpi=80)

# ---------- side-by-side composites ----------
def side(orig, new, out):
    a = Image.open(orig).convert("RGB"); b = Image.open(new).convert("RGB")
    h = 700
    a = a.resize((int(a.width * h / a.height), h)); b = b.resize((int(b.width * h / b.height), h))
    c = Image.new("RGB", (a.width + b.width + 20, h), "white"); c.paste(a, (0, 0)); c.paste(b, (a.width + 20, 0)); c.save(out)
side("raster/combined_progress-all-1.png", "raster/replot_progress.png", "raster/compare_progress.png")
side("raster/loop_sr-1.png", "raster/replot_loop.png", "raster/compare_loop.png")
print("ok")
