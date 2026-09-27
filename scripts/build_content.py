#!/usr/bin/env python3
"""Wrap a translation's JSON masters into the single .js file the page loads.

    scripts/build_content.py zh          # content/zh/*.json -> js/content-zh.js
    scripts/build_content.py --check zh  # validate only, write nothing

The JSON under content/<lang>/ is the master and the thing a translator edits;
js/content-<lang>.js is the committed artifact, because the game must run over
file:// with no build step and no fetch (tech doc §1). Same bargain as
scripts/optimize_images.sh and scripts/optimize_audio.sh: never hand-edit the
artifact, edit the master and re-run this.

English is not a pack. It lives as literals in js/scenes.js, js/endings.js,
js/wall.js (and the -c2 pair) and in index.html, and it is what every pack is
structurally checked against — see check_against_english().
"""

import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# master filename -> the global the generated pack must expose it as. The names
# match the English globals with a _<LANG> suffix so nothing collides.
PIECES = [
    ("scenes-c1",   "SCENES_C1"),
    ("endings-c1",  "ENDINGS_C1"),
    ("callback-c1", "WITNESS_CALLBACK_C1"),
    ("wall-c1",     "WALL_C1"),
    ("scenes-c2",   "SCENES_C2"),
    ("endings-c2",  "ENDINGS_C2"),
    ("callback-c2", "DEPARTURE_CALLBACK"),
    ("wall-c2",     "WALL_C2"),
]

# Keys whose values are machine-readable, not prose: they must survive
# translation byte-for-byte or the engine stops matching on them.
STRUCTURAL = {
    "id", "value", "flagKey", "key", "keys", "next", "start", "type",
    "image", "background", "widget", "prefix", "layout", "numeral",
    "morse", "requiresExamined", "maxLength", "final", "match",
    "secretPhrase", "nextChapter",
}


def die(msg):
    sys.stderr.write("build_content: %s\n" % msg)
    sys.exit(1)


def load_master(lang, name):
    path = os.path.join(ROOT, "content", lang, name + ".json")
    if not os.path.exists(path):
        die("missing master %s" % os.path.relpath(path, ROOT))
    with open(path, encoding="utf-8") as fh:
        try:
            return json.load(fh)
        except json.JSONDecodeError as exc:
            die("%s is not valid JSON: %s" % (os.path.relpath(path, ROOT), exc))


def dump_english():
    """Read the English data straight out of the .js files, via node.

    The English text has exactly one home and this is not it, so rather than
    keeping a parallel content/en/ that could drift, we evaluate the real data
    files. Returns None when node is unavailable — the check is a convenience,
    not a build dependency.
    """
    files = ["scenes.js", "endings.js", "wall.js",
             "scenes-c2.js", "endings-c2.js", "wall-c2.js"]
    globals_ = [g for _, g in PIECES]
    script = """
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = %s;
let src = %s.map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\\n');
src += '\\n' + %s.map(n => `globalThis.${n}=${n};`).join('\\n');
const ctx = { console }; vm.createContext(ctx); vm.runInContext(src, ctx);
const out = {}; %s.forEach(n => { out[n] = ctx[n]; });
process.stdout.write(JSON.stringify(out));
""" % (json.dumps(ROOT), json.dumps(files), json.dumps(globals_), json.dumps(globals_))

    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as fh:
        fh.write(script)
        tmp = fh.name
    try:
        res = subprocess.run(["node", tmp], capture_output=True, text=True)
    except FileNotFoundError:
        return None
    finally:
        os.unlink(tmp)
    if res.returncode != 0:
        sys.stderr.write(res.stderr)
        return None
    return json.loads(res.stdout)


def walk(en, zh, path, errors):
    """Compare a translated tree against the English one.

    Shape must match exactly — a translator may not add, drop or reorder
    anything. Prose values may differ freely; STRUCTURAL values may not.
    """
    if isinstance(en, dict):
        if not isinstance(zh, dict):
            errors.append("%s: expected an object" % path)
            return
        for k in en:
            if k not in zh:
                errors.append("%s.%s: missing" % (path, k))
            else:
                walk(en[k], zh[k], "%s.%s" % (path, k), errors)
        for k in zh:
            if k not in en:
                errors.append("%s.%s: not in the English data" % (path, k))
        return

    if isinstance(en, list):
        if not isinstance(zh, list):
            errors.append("%s: expected an array" % path)
            return
        if len(en) != len(zh):
            errors.append("%s: has %d entries, English has %d"
                          % (path, len(zh), len(en)))
            return
        for i, (a, b) in enumerate(zip(en, zh)):
            walk(a, b, "%s[%d]" % (path, i), errors)
        return

    leaf = path.rsplit(".", 1)[-1].split("[")[0]
    if leaf in STRUCTURAL or isinstance(en, bool) or en is None or isinstance(en, (int, float)):
        if en != zh:
            errors.append("%s: must stay %r, found %r" % (path, en, zh))
        return

    if not isinstance(zh, str) or not zh.strip():
        errors.append("%s: empty translation" % path)
        return

    # {morse} and {player_name} are substituted by the engine, so they must match
    # the English. Emphasis is the translator's call: <em>/<strong> may go
    # anywhere, but the renderer passes them through as HTML, so each must close.
    for token in ("{morse}", "{player_name}"):
        if en.count(token) != zh.count(token):
            errors.append("%s: %s appears %d time(s), English has %d"
                          % (path, token, zh.count(token), en.count(token)))
    for tag in ("em", "strong"):
        opened, closed = zh.count("<%s>" % tag), zh.count("</%s>" % tag)
        if opened != closed:
            errors.append("%s: <%s> opened %d time(s), closed %d"
                          % (path, tag, opened, closed))


def check_against_english(lang, data):
    english = dump_english()
    if english is None:
        sys.stderr.write("build_content: node not available — skipping the "
                         "structural check against the English data\n")
        return []
    errors = []
    for name, gname in PIECES:
        walk(english[gname], data[name], name, errors)
    return errors


def check_ui(lang, ui):
    errors = []
    for key in ("lang", "htmlLang", "toggleGlyph", "toggleLabel", "ui", "title"):
        if key not in ui:
            errors.append("ui.json: missing %r" % key)
    if ui.get("lang") != lang:
        errors.append("ui.json: lang is %r, expected %r" % (ui.get("lang"), lang))
    glyph = ui.get("toggleGlyph")
    if not isinstance(glyph, str) or not 1 <= len(glyph) <= 2:
        errors.append("ui.json: toggleGlyph must be one or two characters — it "
                      "is set inside a 2.6rem circle beside the sound button")
    days = ui.get("ui", {}).get("calendarWeekdays")
    if not isinstance(days, list) or len(days) != 7:
        errors.append("ui.json: ui.calendarWeekdays must be 7 entries")
    blurb = ui.get("title", {}).get("blurb")
    if not isinstance(blurb, list) or len(blurb) != 9:
        errors.append("ui.json: title.blurb must be 9 lines (index.html has 9)")
    return errors


BANNER = """// SUPERSTES — %(name)s content pack. GENERATED FILE — DO NOT EDIT.
//
// Built from content/%(lang)s/*.json by scripts/build_content.py. Edit the JSON
// masters and re-run:
//
//     scripts/build_content.py %(lang)s
//
// Loaded by index.html before chapters.js, exactly like the English data files,
// because the game runs over file:// and cannot fetch JSON (tech doc §1).
"""

NAMES = {"zh": "Chinese (Simplified)"}


def build(lang, check_only):
    data = {name: load_master(lang, name) for name, _ in PIECES}
    ui = load_master(lang, "ui")

    errors = check_ui(lang, ui) + check_against_english(lang, data)
    if errors:
        for e in errors[:40]:
            sys.stderr.write("  %s\n" % e)
        if len(errors) > 40:
            sys.stderr.write("  ... and %d more\n" % (len(errors) - 40))
        die("%d problem(s) in content/%s" % (len(errors), lang))

    if check_only:
        print("content/%s: ok" % lang)
        return

    suffix = lang.upper()
    out = [BANNER % {"name": NAMES.get(lang, lang), "lang": lang}, ""]
    for name, gname in PIECES:
        out.append("const %s_%s = %s;\n" % (
            gname, suffix, json.dumps(data[name], ensure_ascii=False, indent=2)))
    out.append("I18N.register({")
    out.append("  lang: %s," % json.dumps(ui["lang"]))
    out.append("  htmlLang: %s," % json.dumps(ui["htmlLang"]))
    out.append("  toggleGlyph: %s," % json.dumps(ui["toggleGlyph"], ensure_ascii=False))
    out.append("  toggleLabel: %s," % json.dumps(ui["toggleLabel"], ensure_ascii=False))
    out.append("  toggleAria: %s," % json.dumps(ui.get("toggleAria", ui["toggleLabel"]), ensure_ascii=False))
    out.append("  ui: %s," % json.dumps(ui["ui"], ensure_ascii=False, indent=2))
    out.append("  title: %s," % json.dumps(ui["title"], ensure_ascii=False, indent=2))
    out.append("  content: {")
    out.append(",\n".join("    %s: %s_%s" % (g, g, suffix) for _, g in PIECES))
    out.append("  }")
    out.append("});")

    path = os.path.join(ROOT, "js", "content-%s.js" % lang)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out) + "\n")
    print("wrote %s" % os.path.relpath(path, ROOT))


def main(argv):
    check_only = "--check" in argv
    langs = [a for a in argv if not a.startswith("-")]
    if not langs:
        die("usage: build_content.py [--check] <lang> [lang...]")
    for lang in langs:
        if not os.path.isdir(os.path.join(ROOT, "content", lang)):
            die("no content/%s directory" % lang)
        build(lang, check_only)


if __name__ == "__main__":
    main(sys.argv[1:])
