"""Extract every table on the page from the paper's LaTeX sources.

    python3 tools/parse_paper_tables.py /path/to/paper

Reads  Sections/5Experiments.tex      Table 1 (OdysseyArena-Lite main results)
       Sections/B_more_analysis.tex   rules comparison, memory window, in-context,
                                      trading strategies
       Sections/6Analysis.tex         failure-mode counts
       Tables/comparison.tex          benchmark comparison
Writes static/js/odyssey-tables.js   window.ODYSSEY_TABLES = {...}

The page never carries a number typed by hand: odyssey-data.js reads this file
and adds the prose, the walkthroughs and the chart settings on top of it.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "js" / "odyssey-tables.js"

ENVS = ["lights", "trading", "energy", "repo"]


def strip_comments(tex):
    """Drop LaTeX comments, keeping escaped percent signs."""
    return "\n".join(re.split(r"(?<!\\)%", line, maxsplit=1)[0] for line in tex.splitlines())


def clean(cell):
    cell = re.sub(r"\\(?:modellogoo?|textcolor|rowcolor|color)\{[^}]*\}", "", cell)
    cell = re.sub(r"\\textbf\{([^}]*)\}", r"\1", cell)
    cell = re.sub(r"\\(?:cmark|checkmark)", "yes", cell)
    cell = re.sub(r"\\xmark", "no", cell)
    cell = cell.replace("\\%", "%").replace("\\odyssey", "OdysseyArena").replace("~", " ")
    cell = re.sub(r"\\citeyearpar\{[^}]*\}", "", cell)
    cell = re.sub(r"\\[a-zA-Z]+", "", cell)
    return cell.replace("{", "").replace("}", "").strip()


def rows_of(table_tex):
    """Body rows of a tabular as lists of cleaned cells."""
    body = table_tex.split("\\midrule", 1)[1] if "\\midrule" in table_tex else table_tex
    body = body.split("\\bottomrule")[0]
    rows = []
    for raw in body.split("\\\\"):
        raw = raw.replace("\\midrule", "").strip()
        if not raw or "&" not in raw:
            continue
        cells = [clean(c) for c in raw.split("&")]
        if cells[0]:
            rows.append(cells)
    return rows


def num(s):
    s = s.replace("%", "").replace("+", "").strip()
    return float(s) if s not in ("", "--", "-") else None


def first_tabular(tex, label):
    i = tex.index(label)
    start = tex.rfind("\\begin{tabular}", 0, i)
    if start == -1 or start < tex.rfind("\\end{tabular}", 0, i):
        start = tex.index("\\begin{tabular}", i)
    end = tex.index("\\end{tabular}", start)
    return tex[start:end]


def main_results(tex):
    tab = first_tabular(tex, "label{tab:main_results}")
    out = []
    for cells in rows_of(tab):
        name = cells[0]
        vals = [num(c) for c in cells[1:9]]
        out.append({
            "model": name,
            "lights": {"avg4": vals[0], "pass4": vals[1]},
            "trading": {"avg4": vals[2], "best4": vals[3]},
            "energy": {"avg4": vals[4], "pass4": vals[5]},
            "repo": {"avg4": vals[6], "pass4": vals[7]},
        })
    return out


def rules_comparison(tex):
    tab = first_tabular(tex, "label{tab:rule_comparison}")
    out = []
    for cells in rows_of(tab):
        vals = [num(c) for c in cells[1:9]]
        out.append({
            "model": cells[0],
            "lights": {"without": vals[0], "with": vals[1]},
            "trading": {"without": vals[2], "with": vals[3]},
            "energy": {"without": vals[4], "with": vals[5]},
            "repo": {"without": vals[6], "with": vals[7]},
        })
    return out


def memory_window(tex):
    tab = first_tabular(tex, "label{tab:long_horizon_benchmark}")
    turns = [200, 150, 100, 50]
    out = []
    for cells in rows_of(tab):
        vals = [num(c) for c in cells[1:9]]
        out.append({
            "model": cells[0],
            "avg4": dict(zip(turns, vals[0:4])),
            "pass4": dict(zip(turns, vals[4:8])),
        })
    return out


def in_context(tex):
    tab = first_tabular(tex, "label{tab:in_context_fix}")
    out = []
    for cells in rows_of(tab):
        vals = [num(c) for c in cells[1:5]]
        out.append({"model": cells[0], "avg4": vals[0], "avg4_icl": vals[1],
                    "pass4": vals[2], "pass4_icl": vals[3]})
    return out


def failure_modes(tex):
    tab = first_tabular(tex, "label{tab:error_types}")
    out = []
    for cells in rows_of(tab):
        if cells[0].lower().startswith("total"):
            continue
        out.append({"mode": cells[0], "count": int(num(cells[1])), "percent": num(cells[2])})
    return out


def benchmark_comparison(tex):
    tab = first_tabular(tex, "\\toprule")
    out = []
    for cells in rows_of(tab):
        out.append({"benchmark": cells[0], "inductive": cells[1] == "yes",
                    "horizon": cells[2], "deploy": cells[3]})
    return out


def trading_strategies(tex):
    tab = first_tabular(tex, "label{tab:profit_comparison}")
    out = []
    for cells in rows_of(tab):
        out.append({"method": cells[0], "profit": num(cells[1]),
                    "delta": num(cells[2]) if len(cells) > 2 else None})
    return out


def main(paper):
    paper = Path(paper)
    exp = strip_comments((paper / "Sections" / "5Experiments.tex").read_text())
    more = strip_comments((paper / "Sections" / "B_more_analysis.tex").read_text())
    ana = strip_comments((paper / "Sections" / "6Analysis.tex").read_text())
    cmp_ = strip_comments((paper / "Tables" / "comparison.tex").read_text())

    data = {
        "source": "Parsed from the paper's LaTeX by tools/parse_paper_tables.py; do not edit.",
        "mainResults": main_results(exp),
        "rulesComparison": rules_comparison(more),
        "memoryWindow": memory_window(more),
        "inContext": in_context(more),
        "failureModes": failure_modes(ana),
        "benchmarkComparison": benchmark_comparison(cmp_),
        "tradingStrategies": trading_strategies(more),
    }
    js = ("/* Generated by tools/parse_paper_tables.py from the paper's LaTeX tables.\n"
          "   Do not edit by hand: rerun the script on the paper directory. */\n"
          "window.ODYSSEY_TABLES = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")
    OUT.write_text(js)
    print(f"wrote {OUT.relative_to(ROOT)}")
    for k, v in data.items():
        if isinstance(v, list):
            print(f"  {k:22s} {len(v)} rows")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
