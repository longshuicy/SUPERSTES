#!/usr/bin/env python3
"""Render a translation's scene and ending masters as Markdown, for reading
and editing the prose outside the repo.

    scripts/export_markdown.py zh                          # every scenes/endings master
    scripts/export_markdown.py zh scenes-c1 endings-c2     # just these

Writes exports/<lang>/<name>.md. The JSON under content/<lang>/ stays the
master (localization doc §2): these files are a one-way snapshot, not
something build_content.py reads, so edits made to them have to be carried
back into the JSON by hand.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PIECES = {
    "scenes-c1":  ("scenes",  "Chapter I — Scenes"),
    "endings-c1": ("endings", "Chapter I — Endings"),
    "scenes-c2":  ("scenes",  "Chapter II — Scenes"),
    "endings-c2": ("endings", "Chapter II — Endings"),
}

# Machine-readable keys with no prose in them; the export leaves them out.
SKIP = {"id", "background", "image", "morse", "next", "widget",
        "requiresExamined", "final", "flagKey", "key", "keys", "value"}

NOTE = ("> Exported from `content/{lang}/{name}.json` by `scripts/export_markdown.py`.\n"
        "> The JSON is the master; carry edits back into it. Values in `code` are engine\n"
        "> keys, shown for context only. Keep `{{morse}}`, `{{player_name}}` and the\n"
        "> `<em>` / `<strong>` tags intact.\n")


def die(msg):
    sys.stderr.write("export_markdown: %s\n" % msg)
    sys.exit(1)


def prose(s):
    return s.strip() + "\n"


def quoted(s):
    return "\n".join(("> " + line) if line else ">" for line in s.strip().split("\n")) + "\n"


def flag(k, v):
    return "`%s = %s`" % (k, json.dumps(v, ensure_ascii=False))


def paragraphs(lines):
    return "\n".join(prose(p) for p in lines)


def options_md(options, flag_key):
    out = []
    for opt in options:
        tail = []
        if flag_key and "value" in opt:
            tail.append(flag(flag_key, opt["value"]))
        if "next" in opt:
            tail.append("→ `%s`" % opt["next"])
        out.append("- **%s**%s\n" % (opt["label"], ("  " + " ".join(tail)) if tail else ""))
        if "response" in opt:
            out.append(quoted(opt["response"]))
        unknown = set(opt) - {"label", "value", "next", "response"}
        if unknown:
            die("option has unhandled keys %s" % sorted(unknown))
    return "\n".join(out)


def conditional_md(cond, heading):
    out = ["**%s** — depends on `%s`\n" % (heading, cond["key"])]
    for case, text in cond["cases"].items():
        out.append("*If `%s` is %s:*\n" % (cond["key"], case))
        out.append(prose(text))
    return "\n".join(out)


def tier2_md(obj):
    out = ["#### %s  (`%s`)\n" % (obj["label"], obj["id"])]
    for k, v in obj.items():
        if k in SKIP or k == "label":
            continue
        if k == "text":
            out.append(prose(v))
        elif k == "conditionalText":
            out.append(conditional_md(v, "Conditional text"))
        elif k == "nameConditional":
            out.append("*If the player carved a name:*\n")
            out.append(prose(v["named"]))
            out.append("*If they did not:*\n")
            out.append(prose(v["unnamed"]))
        elif k == "interaction":
            out.append("**Interaction** (`%s`, stores `%s`)\n" % (v["type"], v["flagKey"]))
            for field, name in (("placeholder", "Placeholder"),
                                ("submitLabel", "Submit button"),
                                ("declineLabel", "Decline button")):
                out.append("- %s: %s" % (name, v[field]))
            out.append("")
            out.append("*After submitting:*\n")
            out.append(quoted(v["submitResponse"]))
            out.append("*After declining:*\n")
            out.append(quoted(v["declineResponse"]))
        else:
            die("tier2 %s has unhandled key %r" % (obj["id"], k))
    return "\n".join(out)


def plate_md(plate, heading):
    lines = [line for entry in plate["text"] for line in entry.split("\n") if line.strip()]
    return "### %s\n\n%s" % (heading, paragraphs(lines))


def scene_md(scene):
    out = ["## %s  (`%s`)\n" % (scene["title"], scene["id"])]
    for k, v in scene.items():
        if k in SKIP or k == "title":
            continue
        if k == "openingPlate":
            out.append(plate_md(v, "Opening plate"))
        elif k == "closingPlate":
            out.append(plate_md(v, "Closing plate"))
        elif k == "text":
            out.append("### Text\n\n" + paragraphs(v))
        elif k == "conditionalText":
            out.append(conditional_md(v, "Conditional text"))
        elif k == "tier2":
            if v:
                out.append("### Things to examine\n")
                out.extend(tier2_md(obj) for obj in v)
        elif k == "reactive":
            for block in v:
                out.append("### Choice: %s  (`%s`)\n" % (block["prompt"], block["flagKey"]))
                out.append(options_md(block["options"], block["flagKey"]))
        elif k == "branch":
            label = "Final choice" if v.get("final") else "Branch"
            prompt = (": " + v["prompt"]) if "prompt" in v else ""
            out.append("### %s%s  (`%s`)\n" % (label, prompt, v["flagKey"]))
            out.append(options_md(v["options"], v["flagKey"]))
        elif k == "closingText":
            out.append("### Closing text\n\n" + prose(v))
        elif k == "titleReveal":
            out.append("### Title reveal\n\n" + prose(v))
        else:
            die("scene %s has unhandled key %r" % (scene["id"], k))
    return "\n".join(out)


def ending_md(ending):
    out = ["## %s  (`%s`)\n" % (ending["title"], ending["id"])]
    for k, v in ending.items():
        if k in SKIP or k == "title":
            continue
        if k == "baseOpening":
            out.append("### Opening\n\n" + prose(v))
        elif k == "conditionalMiddle":
            out.append("### Middle — depends on %s\n" % ", ".join("`%s`" % x for x in v["keys"]))
            for row in v["table"]:
                cond = ", ".join(flag(a, b) for a, b in row["match"].items())
                out.append("*When %s:*\n" % cond)
                out.append(prose(row["text"]))
            out.append("*Fallback (no row matches):*\n")
            out.append(prose(v["fallback"]))
        elif k == "specificCallback":
            out.append("### Callback\n\n" + prose(v))
        elif k == "closing":
            out.append("### Closing\n\n" + prose(v))
        else:
            die("ending %s has unhandled key %r" % (ending["id"], k))
    return "\n".join(out)


def export(lang, name):
    kind, title = PIECES[name]
    src = os.path.join(ROOT, "content", lang, name + ".json")
    if not os.path.exists(src):
        die("missing master %s" % os.path.relpath(src, ROOT))
    with open(src, encoding="utf-8") as fh:
        data = json.load(fh)

    render = scene_md if kind == "scenes" else ending_md
    body = "\n---\n\n".join(render(item) for item in data)
    doc = "# %s\n\n%s\n%s" % (title, NOTE.format(lang=lang, name=name), body)

    out_dir = os.path.join(ROOT, "exports", lang)
    os.makedirs(out_dir, exist_ok=True)
    dst = os.path.join(out_dir, name + ".md")
    with open(dst, "w", encoding="utf-8") as fh:
        fh.write(doc)
    print("wrote %s" % os.path.relpath(dst, ROOT))


def main(argv):
    if not argv:
        die("usage: export_markdown.py <lang> [%s ...]" % " ".join(PIECES))
    lang, names = argv[0], argv[1:] or list(PIECES)
    for name in names:
        if name not in PIECES:
            die("unknown piece %r — expected one of %s" % (name, ", ".join(PIECES)))
        export(lang, name)


if __name__ == "__main__":
    main(sys.argv[1:])
