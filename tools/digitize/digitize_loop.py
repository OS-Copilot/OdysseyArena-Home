"""Digitize the scatter embedded as a raster in loop_sr.pdf.

Usage: python3 -I digitize_loop.py <loop_sr.pdf> <embedded.png> <out.json>
"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import fitz

pdf, png, out = sys.argv[1:4]
img = np.array(Image.open(png).convert("RGB")).astype(int)
H, W = img.shape[:2]
dark = img.sum(axis=2) < 200

# ---------- page <-> pixel mapping of the embedded image ----------
page = fitz.open(pdf)[0]
irect = page.get_image_rects(6)[0]
sx = W / (irect.x1 - irect.x0); sy = H / (irect.y1 - irect.y0)
pt2px = lambda x, y: ((x - irect.x0) * sx, (y - irect.y0) * sy)
print(f"image rect {tuple(round(v,2) for v in irect)} px/pt x={sx:.4f} y={sy:.4f}")

# ---------- axes frames ----------
# panel a frame: x 187..976, y 385..965 ; panel b: left spine 1129, right 1935, gap 1615..1632 (from raster_axes.py)
def runs(v):
    o = []; cur = 0; s = 0
    for i, x in enumerate(v):
        if x:
            if cur == 0: s = i
            cur += 1
        else:
            if cur: o.append((s, s + cur)); cur = 0
    if cur: o.append((s, s + cur))
    return o

def spine_rows(xlo, xhi):
    res = []
    for y in range(H):
        for s, e in runs(dark[y, xlo:xhi]):
            if e - s >= 250: res.append((y, xlo + s, xlo + e))
    return res
def spine_cols(ylo, yhi):
    res = []
    for x in range(W):
        for s, e in runs(dark[ylo:yhi, x]):
            if e - s >= 250: res.append((x, ylo + s, ylo + e))
    return res
rows = spine_rows(0, W); cols = spine_cols(0, H)
print("spine rows", rows); print("spine cols", cols)
top = min(r[0] for r in rows); bot = max(r[0] for r in rows)
col_x = sorted(set(c[0] for c in cols))
# merge adjacent columns
frames_x = []
for x in col_x:
    if frames_x and x - frames_x[-1][-1] <= 2: frames_x[-1].append(x)
    else: frames_x.append([x])
frames_x = [np.mean(g) for g in frames_x]
print("top", top, "bottom", bot, "vertical spines", frames_x)
a_left, a_right, b_left, b_right = frames_x
# gap in panel b bottom spine
gap = None
for y, s, e in rows:
    if s > a_right + 50 and e < b_right + 2 and e - s < 600:
        pass
segs = sorted(set((s, e) for y, s, e in rows if s > a_right + 50))
print("panel b spine segments", segs)
b_gap = (max(e for s, e in segs if s < 1400), min(s for s, e in segs if s > 1400))
print("panel b gap px", b_gap)

# ---------- tick marks ----------
ink = (255 - img.mean(axis=2)).clip(0, 255)  # darkness weight
def wcenter(prof, s, e):
    idx = np.arange(s - 2, e + 2); w = prof[idx]
    return float((idx * w).sum() / w.sum())
def ticks_below(y_spine, x0, x1):
    band = dark[int(y_spine) + 2:int(y_spine) + 9, int(x0):int(x1)]
    prof = band.sum(axis=0)
    wprof = ink[int(y_spine) + 2:int(y_spine) + 9, :].sum(axis=0)
    cols_ = [(int(x0) + s, int(x0) + e) for s, e in runs(prof >= 5)]
    return [wcenter(wprof, s, e) for s, e in cols_ if e - s <= 6]
def ticks_left(x_spine, y0, y1):
    band = dark[int(y0):int(y1), int(x_spine) - 9:int(x_spine) - 1]
    prof = band.sum(axis=1)
    wprof = ink[:, int(x_spine) - 9:int(x_spine) - 1].sum(axis=1)
    rows_ = [(int(y0) + s, int(y0) + e) for s, e in runs(prof >= 5)]
    return [wcenter(wprof, s, e) for s, e in rows_ if e - s <= 6]
xt_a = ticks_below(bot, a_left - 30, a_right + 30)
xt_b = ticks_below(bot, b_left - 30, b_right + 30)
yt_a = ticks_left(a_left, top - 10, bot + 10)
yt_b = ticks_left(b_left, top - 10, bot + 10)
print("x ticks a", xt_a); print("x ticks b", xt_b); print("y ticks a", yt_a); print("y ticks b", yt_b)

# tick values read from the figure
XT_A = [0.0, 0.1, 0.2, 0.3]
YT_A = [0.4, 0.3, 0.2, 0.1, 0.0]
XT_B_L = [0.00, 0.05]
XT_B_R = [0.30, 0.35]
YT_B = [0.6, 0.4, 0.2, 0.0]
assert len(xt_a) == len(XT_A), xt_a
assert len(yt_a) == len(YT_A), yt_a
assert len(yt_b) == len(YT_B), yt_b
xt_b_l = [t for t in xt_b if t < b_gap[0]]; xt_b_r = [t for t in xt_b if t > b_gap[1]]
assert len(xt_b_l) == 2 and len(xt_b_r) == 2, (xt_b_l, xt_b_r)

def linfit(px, vals):
    a, b = np.polyfit(px, vals, 1)
    res = max(abs(a * p + b - v) for p, v in zip(px, vals))
    return (float(a), float(b), float(res))
fx_a = linfit(xt_a, XT_A); fy_a = linfit(yt_a, YT_A)
fx_bl = linfit(xt_b_l, XT_B_L); fx_br = linfit(xt_b_r, XT_B_R); fy_b = linfit(yt_b, YT_B)
print("calib a: x", fx_a, "y", fy_a)
print("calib b: xL", fx_bl, "xR", fx_br, "y", fy_b)
# consistency: the two x sub-axes of panel b should share the same scale (px per unit)
print("panel b px/unit left %.1f right %.1f ; panel a %.1f" % (1 / fx_bl[0], 1 / fx_br[0], 1 / fx_a[0]))
print("panel a y px/unit %.1f ; panel b %.1f" % (1 / fy_a[0], 1 / fy_b[0]))

def map_x_b(px):
    if px <= b_gap[0]: return fx_bl[0] * px + fx_bl[1], "L"
    if px >= b_gap[1]: return fx_br[0] * px + fx_br[1], "R"
    return None, "gap"

# ---------- legend ----------
LEGEND = {  # (column index, row index) -> model, marker, from the figure
    (0, 0): ("Gemini 3 Pro Preview", "D"), (0, 1): ("Gemini 2.5 Pro", "D"), (0, 2): ("Grok 4 Fast", "^"),
    (0, 3): ("GLM-4-32B-0414", "v"), (0, 4): ("GLM-4-9B-Chat", "v"),
    (1, 0): ("GPT-5", "*"), (1, 1): ("gpt-oss-120b (high)", "*"), (1, 2): ("gpt-oss-120b (medium)", "*"),
    (1, 3): ("gpt-oss-120b (low)", "*"), (1, 4): ("DeepSeek-V3.2", "s"),
    (2, 0): ("Qwen3-235B-A22B-Instruct", "o"), (2, 1): ("Qwen3-30B-A3B-Instruct", "o"), (2, 2): ("Qwen3-4B-Instruct", "o"),
    (2, 3): ("Llama 3.3 70B Instruct", "p"), (2, 4): ("Llama 3.1 8B Instruct", "p"),
}
white = img.min(axis=2) > 235
nonwhite = ~white
lab, n = ndimage.label(nonwhite[:int(top) - 20, :])
objs = ndimage.find_objects(lab)
sw = []
for i, sl in enumerate(objs, start=1):
    m = lab[sl] == i
    npx = int(m.sum()); w = sl[1].stop - sl[1].start; h = sl[0].stop - sl[0].start
    if npx < 150 or w < 24 or h < 24 or w > 60 or h > 60: continue
    ys, xs = np.nonzero(m)
    col = img[sl][m]
    # colour: median of the most saturated / darkest interior pixels (avoid antialiased edge)
    er = ndimage.binary_erosion(m, iterations=3)
    core = img[sl][er] if er.sum() > 20 else col
    sw.append({"cx": sl[1].start + xs.mean(), "cy": sl[0].start + ys.mean(), "w": w, "h": h,
               "rgb": np.median(core, axis=0)})
# keep only the swatch column of each legend column (leftmost blob in each 600px band)
bands = {}
for s in sw:
    bands.setdefault(int(s["cx"] // 640), []).append(s)
sw2 = []
for b, lst in sorted(bands.items()):
    colx = min(t["cx"] for t in lst)
    sw2.extend(t for t in lst if abs(t["cx"] - colx) < 15)
sw = sorted(sw2, key=lambda s: (int(s["cx"] // 640), s["cy"]))
cols_ = sorted(set(int(s["cx"] // 640) for s in sw))
legend = []
for s in sw:
    ci = cols_.index(int(s["cx"] // 640))
    ri = sum(1 for t in sw if int(t["cx"] // 640) == int(s["cx"] // 640) and t["cy"] < s["cy"])
    model, marker = LEGEND[(ci, ri)]
    legend.append({"model": model, "marker": marker, "rgb": [int(v) for v in s["rgb"]], "cx": s["cx"], "cy": s["cy"], "w": s["w"], "h": s["h"]})
    print(f"legend ({ci},{ri}) {model:26s} {marker} rgb={legend[-1]['rgb']} size={s['w']}x{s['h']} at ({s['cx']:.0f},{s['cy']:.0f})")
assert len(legend) == 15, len(legend)

# ---------- marker classification inside the panels ----------
ALPHA = 0.8
expected = {e["model"]: np.array(e["rgb"]) * ALPHA + 255 * (1 - ALPHA) for e in legend}
names = list(expected.keys())
E = np.stack([expected[n] for n in names])  # 15x3

def classify(region_slice):
    sub = img[region_slice]
    px = sub.reshape(-1, 3)
    d = np.linalg.norm(px[:, None, :] - E[None, :, :], axis=2)  # N x 15
    best = d.argmin(axis=1); bd = d.min(axis=1)
    cls = np.where(bd < 28, best, -1)
    gpt5 = names.index("GPT-5")
    cls = np.where(px.max(axis=1) < 75, gpt5, cls)
    return cls.reshape(sub.shape[:2])

def find_markers(x0, x1, y0, y1, panel_name):
    sl = (slice(int(y0) + 2, int(y1) - 1), slice(int(x0) + 2, int(x1) - 1))
    cls = classify(sl)
    found = []
    for k, name in enumerate(names):
        m = cls == k
        lab_, n_ = ndimage.label(m)
        if n_ == 0: continue
        sizes = ndimage.sum(m, lab_, range(1, n_ + 1))
        best = int(np.argmax(sizes)) + 1
        if sizes[best - 1] < 120:
            print(f"   [{panel_name}] {name}: largest blob only {sizes[best-1]:.0f} px -> not found"); continue
        mm = lab_ == best
        ys, xs = np.nonzero(mm)
        bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
        cen = (xs.mean() + sl[1].start, ys.mean() + sl[0].start)
        bbc = ((bx0 + bx1) / 2 + sl[1].start, (by0 + by1) / 2 + sl[0].start)
        found.append({"model": name, "npx": int(sizes[best - 1]), "w": int(bx1 - bx0 + 1), "h": int(by1 - by0 + 1),
                      "centroid": cen, "bbox_center": bbc,
                      "bbox": [int(bx0 + sl[1].start), int(by0 + sl[0].start), int(bx1 + sl[1].start), int(by1 + sl[0].start)],
                      "other_blobs": int(n_ - 1), "second_blob_px": float(sorted(sizes)[-2]) if n_ > 1 else 0.0})
    return found

fa = find_markers(a_left, a_right, top, bot, "a")
fb = find_markers(b_left, b_right, top, bot, "b")
marker_of = {e["model"]: e["marker"] for e in legend}
# reference (unclipped) marker size per model: max over both panels
ref = {}
for f in fa + fb:
    r = ref.setdefault(f["model"], [0, 0, 0])
    r[0] = max(r[0], f["w"]); r[1] = max(r[1], f["h"]); r[2] = max(r[2], f["npx"])

def center_of(f, others):
    """Marker anchor in px. Triangles: bbox centre (area centroid is offset). Others: centroid.
    If the blob is smaller than the reference size of that marker, the side facing the nearest
    other marker is assumed occluded and the centre is taken from the opposite bbox edge."""
    mk = marker_of[f["model"]]
    w_ref, h_ref, n_ref = ref[f["model"]]
    clipped = (f["w"] < w_ref - 1) or (f["h"] < h_ref - 1) or (f["npx"] < 0.93 * n_ref)
    cx, cy = f["bbox_center"] if mk in "^v" else f["centroid"]
    if clipped:
        ox, oy = min(((o["centroid"][0], o["centroid"][1]) for o in others if o is not f),
                     key=lambda c: (c[0] - cx) ** 2 + (c[1] - cy) ** 2)
        x0, y0, x1, y1 = f["bbox"]
        if f["h"] < h_ref - 1:
            cy = (y0 + (h_ref - 1) / 2) if oy > cy else (y1 - (h_ref - 1) / 2)
        if f["w"] < w_ref - 1:
            cx = (x0 + (w_ref - 1) / 2) if ox > cx else (x1 - (w_ref - 1) / 2)
    return (cx, cy), clipped

result = {"source": pdf, "panels": []}
annot = Image.open(png).convert("RGB"); drw = ImageDraw.Draw(annot)
for pname, env, found, xmap, fy in (
        ("a", "Turn On Lights", fa, lambda px: (fx_a[0] * px + fx_a[1], "single"), fy_a),
        ("b", "Repo System", fb, map_x_b, fy_b)):
    pts = []
    for f in found:
        (cx, cy), clipped = center_of(f, found)
        xv, seg = xmap(cx)
        yv = fy[0] * cy + fy[1]
        pts.append({"model": f["model"], "loop_ratio": round(float(xv), 4), "success_rate": round(float(yv), 4),
                    "_px": [round(cx, 1), round(cy, 1)], "_segment": seg, "_clipped": bool(clipped),
                    "_size": [f["w"], f["h"], f["npx"]], "_extra_blobs": f["other_blobs"], "_second_blob_px": f["second_blob_px"]})
        drw.rectangle(f["bbox"], outline=(255, 0, 0), width=1)
        drw.line([cx - 6, cy, cx + 6, cy], fill=(255, 0, 0)); drw.line([cx, cy - 6, cx, cy + 6], fill=(255, 0, 0))
        drw.text((f["bbox"][2] + 3, f["bbox"][1] - 2), f["model"][:14], fill=(200, 0, 0))
    pts.sort(key=lambda p: -p["success_rate"])
    panel = {"env": env, "points": pts}
    result["panels"].append(panel)
    print(f"--- panel {pname} {env}: {len(pts)} markers")
    for p in pts:
        print(f"   {p['model']:26s} x={p['loop_ratio']:.4f} y={p['success_rate']:.4f} px={p['_px']} seg={p['_segment']} clipped={p['_clipped']} size={p['_size']} extra_blobs={p['_extra_blobs']} ({p['_second_blob_px']:.0f}px)")

# ---------- infeasible region polygons (vector in the PDF) ----------
polys = []
for d in page.get_drawings():
    if d["type"] == "f" and d["fill"] and abs(d["fill"][0] - 0.918) < 0.01:
        v = []
        for it in d["items"]:
            assert it[0] == "l"
            if not v: v.append((it[1].x, it[1].y))
            v.append((it[2].x, it[2].y))
        if v[0] == v[-1]: v = v[:-1]
        polys.append(v)
polys.sort(key=lambda v: min(p[0] for p in v))
assert len(polys) == 2
for pi, (panel, v) in enumerate(zip(result["panels"], polys)):
    pxs = [pt2px(x, y) for x, y in v]
    if pi == 0:
        data = [[round(fx_a[0] * px + fx_a[1], 4), round(fy_a[0] * py + fy_a[1], 4)] for px, py in pxs]
        frac = [[round((px - a_left) / (a_right - a_left), 4), round((bot - py) / (bot - top), 4)] for px, py in pxs]
        panel["axes"] = {"x_lim": [round(fx_a[0] * a_left + fx_a[1], 4), round(fx_a[0] * a_right + fx_a[1], 4)],
                         "y_lim": [round(fy_a[0] * bot + fy_a[1], 4), round(fy_a[0] * top + fy_a[1], 4)]}
    else:
        data = []
        for px, py in pxs:
            xv, seg = map_x_b(px)
            data.append([round(xv, 4), round(fy_b[0] * py + fy_b[1], 4), seg])
        frac = [[round((px - b_left) / (b_right - b_left), 4), round((bot - py) / (bot - top), 4)] for px, py in pxs]
        panel["axes"] = {
            "x_break": True,
            "x_lim_left": [round(fx_bl[0] * b_left + fx_bl[1], 4), round(fx_bl[0] * b_gap[0] + fx_bl[1], 4)],
            "x_lim_right": [round(fx_br[0] * b_gap[1] + fx_br[1], 4), round(fx_br[0] * b_right + fx_br[1], 4)],
            "left_axes_fraction": round((b_gap[0] - b_left) / (b_right - b_left), 4),
            "right_axes_fraction": round((b_right - b_gap[1]) / (b_right - b_left), 4),
            "y_lim": [round(fy_b[0] * bot + fy_b[1], 4), round(fy_b[0] * top + fy_b[1], 4)]}
    panel["infeasible"] = data
    panel["infeasible_axes_fraction"] = frac
    print(f"infeasible panel {pi}: px={[(round(a),round(b)) for a,b in pxs]} data={data} frac={frac}")
    drw.polygon([(px, py) for px, py in pxs], outline=(0, 0, 255))
for e in legend:
    drw.rectangle([e["cx"] - e["w"] / 2, e["cy"] - e["h"] / 2, e["cx"] + e["w"] / 2, e["cy"] + e["h"] / 2], outline=(0, 180, 0), width=2)
    drw.text((e["cx"] + 30, e["cy"] + 14), e["model"][:12], fill=(0, 140, 0))
# tick marks
for t in xt_a + xt_b: drw.line([t, bot + 2, t, bot + 20], fill=(255, 0, 255), width=2)
for t in yt_a: drw.line([a_left - 20, t, a_left - 2, t], fill=(255, 0, 255), width=2)
for t in yt_b: drw.line([b_left - 20, t, b_left - 2, t], fill=(255, 0, 255), width=2)
annot.save("raster/loop_sr_annotated.png")
result["legend"] = [{"model": e["model"], "marker": e["marker"], "rgb": e["rgb"]} for e in legend]
json.dump(result, open(out, "w"), indent=1)
print("wrote", out)
