"""Extract success-rate-vs-step curves from a matplotlib vector PDF.

Usage: python3 -I extract_progress.py <pdf> <out.json>
"""
import sys, json, re
import fitz
import numpy as np

NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")
PANEL_FILL = (0.9607, 0.9608, 0.9607)


def is_panel_fill(d):
    f = d.get("fill")
    return d["type"] == "f" and f is not None and all(abs(f[i] - PANEL_FILL[i]) < 2e-3 for i in range(3))


def path_points(d):
    pts = []
    for it in d["items"]:
        if it[0] == "l":
            if not pts:
                pts.append((it[1].x, it[1].y))
            pts.append((it[2].x, it[2].y))
        else:
            raise ValueError("unexpected path item %s" % it[0])
    return pts


def main(pdf, out):
    page = fitz.open(pdf)[0]
    dr = page.get_drawings()
    td = page.get_text("dict")
    spans = []
    for b in td["blocks"]:
        if b["type"] != 0:
            continue
        for l in b["lines"]:
            for s in l["spans"]:
                spans.append({"text": s["text"].strip(), "bbox": s["bbox"]})

    panels = [fitz.Rect(d["rect"]) for d in dr if is_panel_fill(d)]
    panels.sort(key=lambda r: (round(r.y0), r.x0))
    print("panels:", [tuple(round(v, 1) for v in r) for r in panels])

    # gridlines (white strokes)
    vgrid, hgrid = [], []
    for d in dr:
        if d["type"] == "s" and d["color"] == (1.0, 1.0, 1.0):
            pts = path_points(d)
            (x0, y0), (x1, y1) = pts[0], pts[-1]
            if abs(x0 - x1) < 0.5:
                vgrid.append((x0, min(y0, y1), max(y0, y1)))
            elif abs(y0 - y1) < 0.5:
                hgrid.append((y0, min(x0, x1), max(x0, x1)))

    # series strokes (width 5) and legend swatches
    series, swatches = [], []
    for d in dr:
        if d["type"] != "s" or d["color"] == (1.0, 1.0, 1.0):
            continue
        if abs((d.get("width") or 0) - 5.0) > 0.01:
            continue
        pts = path_points(d)
        key = (tuple(round(c, 4) for c in d["color"]), d.get("dashes") or "")
        if len(pts) <= 3:
            swatches.append({"key": key, "pts": pts, "rect": fitz.Rect(d["rect"])})
        else:
            series.append({"key": key, "pts": pts, "rect": fitz.Rect(d["rect"])})

    # legend entries: swatch -> label text to its right
    legend = []
    for sw in swatches:
        yc = (sw["pts"][0][1] + sw["pts"][-1][1]) / 2
        xr = max(p[0] for p in sw["pts"])
        best = None
        for s in spans:
            x0, y0, x1, y1 = s["bbox"]
            syc = (y0 + y1) / 2
            if x0 >= xr - 2 and x0 - xr < 40 and abs(syc - yc) < 12:
                dist = x0 - xr
                if best is None or dist < best[0]:
                    best = (dist, s["text"])
        if best is None:
            raise RuntimeError("legend swatch without label at %s" % (sw["pts"],))
        legend.append({"key": sw["key"], "model": best[1], "y": yc})
    # legend groups by vertical band: group entries whose y are within 60pt of each other
    legend.sort(key=lambda e: e["y"])
    groups = []
    for e in legend:
        if groups and e["y"] - groups[-1][-1]["y"] < 60:
            groups[-1].append(e)
        else:
            groups.append([e])
    print("legend groups:", [[(e["model"], e["key"]) for e in g] for g in groups])

    # panel rows
    rows = []
    for r in panels:
        if rows and abs(rows[-1][0].y0 - r.y0) < 5:
            rows[-1].append(r)
        else:
            rows.append([r])
    assert len(rows) == len(groups), (len(rows), len(groups))

    result = {"source": pdf, "panels": []}
    for row_i, row in enumerate(rows):
        lg = {e["key"]: e["model"] for e in groups[row_i]}
        assert len(lg) == len(groups[row_i]), "duplicate colour within one legend group"
        for r in row:
            # title: text span below the panel, centred in x
            title = None
            ylabel = None
            for s in spans:
                x0, y0, x1, y1 = s["bbox"]
                xc = (x0 + x1) / 2
                if NUM_RE.match(s["text"]):
                    continue
                if r.x0 - 5 < xc < r.x1 + 5 and y0 > r.y1 and s["text"] != "Step":
                    if title is None or y0 > title[0]:
                        title = (y0, s["text"])
                if x1 <= r.x0 + 2 and (y0 + y1) / 2 > r.y0 and (y0 + y1) / 2 < r.y1 and x1 - x0 < 60:
                    ylabel = s["text"]
            title = re.sub(r"^\([a-z]\)\s*", "", title[1])
            # x calibration from vertical gridlines + labels under the panel
            xg = sorted(g[0] for g in vgrid if r.x0 - 1 <= g[0] <= r.x1 + 1 and g[1] >= r.y0 - 1 and g[2] <= r.y1 + 1)
            yg = sorted(g[0] for g in hgrid if r.y0 - 1 <= g[0] <= r.y1 + 1 and g[1] >= r.x0 - 1 and g[2] <= r.x1 + 1)
            xpairs, ypairs = [], []
            for s in spans:
                if not NUM_RE.match(s["text"]):
                    continue
                x0, y0, x1, y1 = s["bbox"]
                xc, yc = (x0 + x1) / 2, (y0 + y1) / 2
                if y0 >= r.y1 - 15 and y0 < r.y1 + 40 and r.x0 - 30 <= xc <= r.x1 + 30:
                    g = min(xg, key=lambda v: abs(v - xc))
                    if abs(g - xc) < 6:
                        xpairs.append((g, float(s["text"])))
                if x1 <= r.x0 + 2 and x1 > r.x0 - 60 and r.y0 - 20 <= yc <= r.y1 + 20:
                    g = min(yg, key=lambda v: abs(v - yc))
                    if abs(g - yc) < 12:
                        ypairs.append((g, float(s["text"])))
            xpairs = sorted(set(xpairs)); ypairs = sorted(set(ypairs))
            assert len(xpairs) >= 3 and len(ypairs) >= 3, (title, xpairs, ypairs)
            ax, bx = np.polyfit([p[0] for p in xpairs], [p[1] for p in xpairs], 1)
            ay, by = np.polyfit([p[0] for p in ypairs], [p[1] for p in ypairs], 1)
            xres = max(abs(ax * p[0] + bx - p[1]) for p in xpairs)
            yres = max(abs(ay * p[0] + by - p[1]) for p in ypairs)
            fx = lambda v: ax * v + bx
            fy = lambda v: ay * v + by
            xlim = (fx(r.x0), fx(r.x1))
            ylim = (fy(r.y1), fy(r.y0))
            print(f"[{title}] xticks={[p[1] for p in xpairs]} yticks={[p[1] for p in ypairs]} "
                  f"xlim=({xlim[0]:.3f},{xlim[1]:.3f}) ylim=({ylim[0]:.4f},{ylim[1]:.4f}) "
                  f"calib residual x={xres:.2e} y={yres:.2e} ylabel={ylabel!r}")
            panel = {"env": title, "x_label": "Step", "y_label": ylabel,
                     "x_max": round(xlim[1]), "x_lim": [round(xlim[0], 3), round(xlim[1], 3)],
                     "y_lim": [round(ylim[0], 4), round(ylim[1], 4)],
                     "series": [], "random": None}
            # series inside this panel
            for se in series:
                p0 = se["pts"][0]
                if not (r.x0 - 1 <= p0[0] <= r.x1 + 1 and r.y0 - 1 <= p0[1] <= r.y1 + 1):
                    continue
                if se["key"] not in lg:
                    raise RuntimeError("series colour %s not in legend of row %d" % (se["key"], row_i))
                model = lg[se["key"]]
                data = [(fx(x), fy(y)) for x, y in se["pts"]]
                # clip to x range (keep points with x <= xmax + eps; interpolate if needed)
                clipped = []
                for i, (x, y) in enumerate(data):
                    if x <= xlim[1] + 1e-6:
                        clipped.append((x, y))
                    else:
                        xp, yp = data[i - 1]
                        if xp < xlim[1]:
                            t = (xlim[1] - xp) / (x - xp)
                            clipped.append((xlim[1], yp + t * (y - yp)))
                        break
                n_out = len(data) - len(clipped)
                pts = [[int(round(x)), round(float(y), 4)] for x, y in clipped]
                # downsample: keep endpoints and both ends of every y change; drop interior flat points
                keep = []
                for i, (x, y) in enumerate(pts):
                    if i == 0 or i == len(pts) - 1 or y != pts[i - 1][1] or y != pts[i + 1][1]:
                        keep.append([x, y])
                if len(keep) > 60:
                    print("   warning: %s has %d points after downsampling" % (model, len(keep)))
                rgb = se["key"][0]
                entry = {"model": model, "color": "#%02x%02x%02x" % tuple(int(round(c * 255)) for c in rgb),
                         "dashed": se["key"][1] != "[] 0", "points": keep}
                print(f"   {model:28s} n={len(se['pts'])} clipped={n_out} final=({keep[-1][0]}, {keep[-1][1]:.4f}) "
                      f"xs={[p[0] for p in pts][:4]}..{[p[0] for p in pts][-2:]}")
                if model == "random":
                    panel["random"] = keep
                    panel["random_color"] = entry["color"]
                else:
                    panel["series"].append(entry)
            result["panels"].append(panel)
    with open(out, "w") as f:
        json.dump(result, f, indent=1)
    print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
