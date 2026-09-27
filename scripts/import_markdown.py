#!/usr/bin/env python3
"""Carry an edited Markdown export back into its JSON master.

    scripts/import_markdown.py zh scenes-c1      # exports/zh/scenes-c1.md -> content/zh/scenes-c1.json
    scripts/import_markdown.py zh endings-c2

The inverse of scripts/export_markdown.py, and it reads only that layout: the
headings, `(id)` markers, *If …:* / *When …:* lines and > quoted responses the
exporter writes. Only prose is taken from the Markdown; every structural value
(ids, flags, values, images, next) comes from the existing JSON, which must
line up with the Markdown scene for scene, object for object, option for option.

A text array must keep the English entry count (build_content.py --check), so
when the Markdown has more paragraphs than entries, neighbouring paragraphs share
an entry. Scene text is split back into paragraphs on blank lines, so those are
joined with one. Plate captions render each entry as a single <p> with no margin,
so those are joined with a line break, which looks identical.

Before writing, the result is re-exported and compared with the input; any
difference in wording aborts the import. Run build_content.py afterwards.
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export_markdown as exp  # noqa: E402

ROOT = exp.ROOT


def die(msg):
    sys.stderr.write("import_markdown: %s\n" % msg)
    sys.exit(1)


def paras(s):
    return [p.strip() for p in re.split(r"\n\s*\n", s.strip()) if p.strip()]


def unquote(block):
    lines = []
    for line in block.split("\n"):
        if not line.startswith(">"):
            die("expected a > quoted line, found %r" % line)
        lines.append(line[2:] if line.startswith("> ") else line[1:])
    return "\n".join(lines).strip()


def pack(ps, n, joiner, where):
    if len(ps) < n:
        die("%s: %d paragraph(s), but the English has %d entries — it needs at least %d"
            % (where, len(ps), n, n))
    base, extra = divmod(len(ps), n)
    out, i = [], 0
    for k in range(n):
        size = base + (1 if k < extra else 0)
        out.append(joiner.join(ps[i:i + size]))
        i += size
    return out


def sections(body, level):
    parts = re.split(r"^%s (.+)$" % ("#" * level), body, flags=re.M)
    return parts[0], [(h.strip(), b) for h, b in zip(parts[1::2], parts[2::2])]


def id_heading(h, where):
    m = re.fullmatch(r"(.+?)\s+\(`([^`]+)`\)", h)
    if not m:
        die("%s: heading %r has no (`id`)" % (where, h))
    return m.group(1), m.group(2)


def split_conditional(ps):
    for i, p in enumerate(ps):
        if p.startswith("**Conditional text**"):
            return ps[:i], ps[i + 1:]
    return ps, None


def apply_cases(cond, ps, where):
    cases, cur = {}, None
    for p in ps:
        m = re.fullmatch(r"\*If `[^`]+` is (\w+):\*", p)
        if m:
            cur = m.group(1)
            cases[cur] = []
        elif cur is None:
            die("%s: text before the first *If …:* line" % where)
        else:
            cases[cur].append(p)
    if set(cases) != set(cond["cases"]):
        die("%s: cases %s, JSON has %s" % (where, sorted(cases), sorted(cond["cases"])))
    for k, v in cases.items():
        cond["cases"][k] = "\n\n".join(v)


def apply_tier2(obj, body, where):
    ps = paras(body)
    text, mode, buf = [], "text", {}
    for p in ps:
        if p.startswith("**Conditional text**"):
            mode = "cond"; buf["cond"] = []; continue
        if p == "*If the player carved a name:*":
            mode = "named"; buf["named"] = []; continue
        if p == "*If they did not:*":
            mode = "unnamed"; buf["unnamed"] = []; continue
        if p.startswith("**Interaction**"):
            mode = "interaction"; continue
        if mode == "interaction":
            if p.startswith("- "):
                for line in p.split("\n"):
                    m = re.fullmatch(r"- (Placeholder|Submit button|Decline button): (.+)", line)
                    if not m:
                        die("%s: unexpected interaction line %r" % (where, line))
                    key = {"Placeholder": "placeholder", "Submit button": "submitLabel",
                           "Decline button": "declineLabel"}[m.group(1)]
                    obj["interaction"][key] = m.group(2).strip()
            elif p == "*After submitting:*":
                mode = "interaction-submit"
            elif p == "*After declining:*":
                mode = "interaction-decline"
            else:
                die("%s: unexpected interaction paragraph %r" % (where, p[:30]))
            continue
        if mode == "interaction-submit":
            obj["interaction"]["submitResponse"] = unquote(p); mode = "interaction"; continue
        if mode == "interaction-decline":
            obj["interaction"]["declineResponse"] = unquote(p); mode = "interaction"; continue
        if mode == "text":
            text.append(p)
        else:
            buf[mode].append(p)

    if text:
        if "text" not in obj:
            die("%s: has text, but the JSON object has no text field" % where)
        obj["text"] = "\n\n".join(text)
    if "cond" in buf:
        apply_cases(obj["conditionalText"], buf["cond"], where)
    for k in ("named", "unnamed"):
        if k in buf:
            obj["nameConditional"][k] = "\n\n".join(buf[k])


def apply_options(options, body, where):
    parsed = []
    for p in paras(body):
        m = re.fullmatch(r"- \*\*(.+)\*\*(\s+`.*)?", p)
        if m:
            parsed.append([m.group(1), None])
        elif p.startswith(">") and parsed:
            parsed[-1][1] = unquote(p)
        else:
            die("%s: unexpected paragraph %r" % (where, p[:30]))
    if len(parsed) != len(options):
        die("%s: %d option(s), JSON has %d" % (where, len(parsed), len(options)))
    for opt, (label, resp) in zip(options, parsed):
        opt["label"] = label
        if resp is not None:
            if "response" not in opt:
                die("%s: option %r has a response the JSON has no field for" % (where, label))
            opt["response"] = resp


def apply_scene(scene, en, chunk):
    header, rest = chunk.split("\n", 1) if "\n" in chunk else (chunk, "")
    title, sid = id_heading(header[3:].strip(), "scene")
    if sid != scene["id"]:
        die("expected %s, found %s" % (scene["id"], sid))
    scene["title"] = title
    _, secs = sections(rest, 3)
    reactive = iter(zip(scene.get("reactive", []), en.get("reactive", [])))

    for h, body in secs:
        where = "%s / %s" % (sid, h)
        if h in ("Opening plate", "Closing plate"):
            key = "openingPlate" if h == "Opening plate" else "closingPlate"
            scene[key]["text"] = pack(paras(body), len(en[key]["text"]), "\n", where)
        elif h == "Text":
            ps, cond = split_conditional(paras(body))
            scene["text"] = pack(ps, len(en["text"]), "\n\n", where)
            if cond is not None:
                apply_cases(scene["conditionalText"], cond, where)
        elif h == "Things to examine":
            _, objs = sections(body, 4)
            if [id_heading(oh, where)[1] for oh, _ in objs] != [t["id"] for t in scene["tier2"]]:
                die("%s: objects don't match the JSON's tier2 ids/order" % where)
            for obj, (oh, ob) in zip(scene["tier2"], objs):
                obj["label"] = id_heading(oh, where)[0]
                apply_tier2(obj, ob, "%s / %s" % (sid, obj["id"]))
        elif h.startswith("Choice: "):
            prompt, flag = id_heading(h[len("Choice: "):], where)
            block = next(reactive, (None, None))[0]
            if block is None or block["flagKey"] != flag:
                die("%s: no matching reactive block" % where)
            block["prompt"] = prompt
            apply_options(block["options"], body, where)
        elif h.startswith("Branch") or h.startswith("Final choice"):
            m = re.fullmatch(r"(?:Branch|Final choice)(?:: (.+?))?\s+\(`([^`]+)`\)", h)
            if not m or m.group(2) != scene["branch"]["flagKey"]:
                die("%s: doesn't match the JSON's branch" % where)
            if m.group(1) is not None:
                if "prompt" not in scene["branch"]:
                    die("%s: the JSON branch has no prompt" % where)
                scene["branch"]["prompt"] = m.group(1)
            apply_options(scene["branch"]["options"], body, where)
        elif h == "Closing text":
            scene["closingText"] = "\n\n".join(paras(body))
        elif h == "Title reveal":
            scene["titleReveal"] = "\n\n".join(paras(body))
        else:
            die("%s: unknown section" % where)


def apply_ending(ending, chunk):
    header, rest = chunk.split("\n", 1)
    title, eid = id_heading(header[3:].strip(), "ending")
    if eid != ending["id"]:
        die("expected %s, found %s" % (ending["id"], eid))
    ending["title"] = title
    _, secs = sections(rest, 3)
    for h, body in secs:
        where = "%s / %s" % (eid, h)
        if h == "Opening":
            ending["baseOpening"] = "\n\n".join(paras(body))
        elif h.startswith("Middle"):
            rows, cur = [], None
            for p in paras(body):
                if re.fullmatch(r"\*When .+:\*", p) or p == "*Fallback (no row matches):*":
                    cur = []
                    rows.append(cur)
                elif cur is None:
                    die("%s: text before the first *When …:* line" % where)
                else:
                    cur.append(p)
            table = ending["conditionalMiddle"]["table"]
            if len(rows) != len(table) + 1:
                die("%s: %d rows + fallback expected, found %d blocks" % (where, len(table), len(rows)))
            for row, ps in zip(table, rows):
                row["text"] = "\n\n".join(ps)
            ending["conditionalMiddle"]["fallback"] = "\n\n".join(rows[-1])
        elif h == "Callback":
            ending["specificCallback"] = "\n\n".join(paras(body))
        elif h == "Closing":
            ending["closing"] = "\n\n".join(paras(body))
        else:
            die("%s: unknown section" % where)


def english(name):
    import build_content as bc
    data = bc.dump_english()
    if data is None:
        die("needs node to read the English entry counts")
    return data[dict(bc.PIECES)[name]]


def comparable(md):
    body = md[md.index("\n## ") + 1:] if not md.startswith("## ") else md
    return [line.rstrip() for line in body.split("\n") if line.strip()]


def main(argv):
    if len(argv) != 2 or argv[1] not in exp.PIECES:
        die("usage: import_markdown.py <lang> <%s>" % "|".join(exp.PIECES))
    lang, name = argv
    kind, _ = exp.PIECES[name]
    src = os.path.join(ROOT, "exports", lang, name + ".md")
    dst = os.path.join(ROOT, "content", lang, name + ".json")
    with open(src, encoding="utf-8") as fh:
        md = fh.read()
    with open(dst, encoding="utf-8") as fh:
        data = json.load(fh)

    start = md.index("## ")
    chunks = [c.strip() for c in re.split(r"^---$", md[start:], flags=re.M) if c.strip()]
    if len(chunks) != len(data):
        die("%d sections in the Markdown, %d in the JSON" % (len(chunks), len(data)))
    if kind == "scenes":
        en = english(name)
        for scene, en_scene, chunk in zip(data, en, chunks):
            apply_scene(scene, en_scene, chunk)
        render = exp.scene_md
    else:
        for ending, chunk in zip(data, chunks):
            apply_ending(ending, chunk)
        render = exp.ending_md

    again = "\n---\n\n".join(render(item) for item in data)
    a, b = comparable(md[start:]), comparable(again)
    if a != b:
        for i, (x, y) in enumerate(zip(a, b)):
            if x != y:
                die("round trip differs at Markdown line ~%d:\n  md:   %s\n  json: %s" % (i, x, y))
        die("round trip differs in length (%d vs %d lines)" % (len(a), len(b)))

    body = ",\n\n".join("  " + json.dumps(x, ensure_ascii=False, indent=2).replace("\n", "\n  ")
                        for x in data)
    with open(dst, "w", encoding="utf-8") as fh:
        fh.write("[\n" + body + "\n]\n")
    print("wrote %s" % os.path.relpath(dst, ROOT))


if __name__ == "__main__":
    main(sys.argv[1:])
