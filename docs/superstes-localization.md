# SUPERSTES Localization Design Document

**v1.** Owns: how a translation is stored, built, loaded and typeset. Companion to
[superstes-tech-design.md](superstes-tech-design.md) (which owns the engine those hooks sit in),
[superstes-script.md](superstes-script.md) and
[superstes-chapter-2-script.md](superstes-chapter-2-script.md) (which own the narrative a
translation is a translation *of*), and [superstes-sound-design.md](superstes-sound-design.md)
(which is untouched — audio does not localize).

Like the tech doc, this file contains **no narrative content**. Translated prose lives in
`content/<lang>/`.

---

## 1. What a translation is

A **content pack**: one generated file, `js/content-<lang>.js`, that hands `I18N.register()` a
complete set of chapter data plus a UI table. It is loaded by a plain `<script>` tag like every
other data file. Nothing about the engine changes shape to accommodate it.

English is **not** a pack. It is the source language and it stays exactly where it has always
been — as literals in `js/scenes.js`, `js/endings.js`, `js/wall.js`, the `-c2` trio, and in
`index.html`'s title screen. There is no `content/en/`. A parallel copy of the English text would
be a second source of truth for it, and the first thing to go stale.

Currently shipping: **`zh`** — Simplified Chinese.

---

## 2. Where the text lives

```
/content
  /zh
    scenes-c1.json     // the SCENES_C1 array, translated
    endings-c1.json    // ENDINGS_C1
    callback-c1.json   // WITNESS_CALLBACK_C1
    wall-c1.json       // WALL_C1
    scenes-c2.json     // SCENES_C2
    endings-c2.json    // ENDINGS_C2
    callback-c2.json   // DEPARTURE_CALLBACK
    wall-c2.json       // WALL_C2
    ui.json            // the UI table + the title screen's copy
```

These are the masters, and they are pure JSON on purpose: a translator can open them in anything,
hand them to anyone, and diff them, without needing to know that the game is JavaScript. This is
the whole reason the split exists — the English prose is embedded in `.js` files with comments
around it, which is fine for the author and hostile to anyone editing only the words.

`js/content-zh.js` is the **generated artifact** and is committed. Never hand-edit it. This is the
same bargain the art and audio pipelines make (CLAUDE.md, *Known intentional deviations*): the
master is the truth, the artifact is what ships, and the artifact is committed because the game
must run over `file://` with no build step and no `fetch` (tech doc §1). Fetching the JSON at
runtime would work over `http://` and silently fail for anyone who opened `index.html` directly.

---

## 3. The build

```bash
scripts/build_content.py zh          # content/zh/*.json -> js/content-zh.js
scripts/build_content.py --check zh  # validate only, write nothing
```

`--check` is the useful half. Before writing anything the script evaluates the real English data
files (with `node`, dev-only — the game never needs it) and walks the translated tree against
them:

- **Shape must match exactly.** No added, dropped or reordered entries. A missing scene, a
  reordered `options` array, a renamed key: all rejected with a path (`scenes-c1[2].tier2[3].id`).
- **Structural values must be identical.** `id`, `value`, `flagKey`, `keys`, `match`, `next`,
  `morse`, `requiresExamined`, `image`, `background`, `widget`, `layout`, `prefix`, `numeral`,
  `maxLength`, `final`, `secretPhrase`. These are what the state machine matches on; a translated
  `value: "called"` breaks a reactive block silently, which is exactly the failure this catches.
- **Tokens must match; markup must close.** `{morse}` and `{player_name}` are substituted by the
  engine, so they must appear the same number of times as in the English. `<em>` / `<strong>` are
  the translator's call — a translation may emphasise different words than the English does — but
  the renderer passes them through as HTML, so every one opened in a string must be closed in it.
- **No empty strings.**

If `node` is absent the structural check is skipped with a warning and the pack still builds. The
check is a convenience, not a dependency.

Run `--check` after editing the JSON and before committing. Run the plain build after that.

### Markdown export

```bash
scripts/export_markdown.py zh                        # every scenes/endings master
scripts/export_markdown.py zh scenes-c1 endings-c2   # just these
```

Renders the scene and ending masters as `exports/<lang>/<name>.md` — prose laid out by scene,
with engine keys shown in `code` for context — so the words can be read or edited in tools that
don't want JSON. The script fails on any key it doesn't know how to render, so a new prose field
can't silently go missing from the export.

```bash
scripts/import_markdown.py zh scenes-c1   # exports/zh/scenes-c1.md -> content/zh/scenes-c1.json
```

The way back. It reads only the exporter's layout (headings with `(id)` markers, *If …:* /
*When …:* lines, `>` quoted responses) and takes only prose from it. Every structural value comes
from the existing JSON, which must line up scene for scene, object for object, option for option.
The JSON stays the master; run `--check` and build afterwards as above.

A text array must keep the English entry count, so when the Markdown has more paragraphs than
entries, neighbouring paragraphs share one. Scene text is split back into paragraphs on blank lines,
so those are joined with a blank line. Plate captions render each entry as a single margin-less
`<p>`, so those are joined with a line break, which looks the same. Before writing, the importer
re-exports its result and aborts if the wording differs from the input in any way.

---

## 4. Runtime

`js/i18n.js` loads first, before any data file. It exposes:

| Call | Used by | Does |
|---|---|---|
| `I18N.register(pack)` | the generated packs | adds a language |
| `I18N.resolve()` | `main.js` boot | reads `?lang=`, falls back to English |
| `I18N.content(name, fallback)` | `chapters.js` | the pack's copy of a data global, or the English one |
| `I18N.ui(key)` | `main.js`, `gallery.js`, `audio.js` | one engine-composed string, English if the pack omits it |
| `I18N.setLang(target)` | `main.js` `switchLanguage()` | swaps the pack, the URL and nothing visible |
| `I18N.applyLang()` | `main.js` boot and the swap point | paints the page in the active language |
| `I18N.warmText(sample)` | `main.js` `switchLanguage()` | pulls the font subsets those words need |
| `I18N.mountToggle(btn, onSwitch)` | `main.js` boot | wires the standing toggle |

**Load order** becomes: `i18n.js` → every chapter's data files → the content packs →
`chapters.js` → `audio.js` → `gallery.js` → `main.js`.

**`chapters.js` is the only seam.** A chapter's four getters go through `I18N.content()`, so the
`SCENES` / `ENDINGS` / `WALL` / `SHARED_CALLBACK` pointer swap already described in tech doc
§ *Two chapters, one page* now swaps language as well as chapter, at no extra cost. `main.js` and
`gallery.js` still do not know either axis exists.

**Language is the URL and nothing else.** `?lang=zh`. There is no persistence in this game by
design (tech doc §1), so there is nowhere else to keep it. An unregistered `?lang=` value falls
back to English rather than erroring, as does a pack that fails to load.

**The toggle is a standing control**, the sound button's twin, directly beneath it and live for
the whole run — not a title-screen link. That makes switching mid-run the normal case, so it must
not cost the player anything, and it does not reload. `main.js`'s `switchLanguage()`:

1. `I18N.setLang(target)` swaps the active pack and rewrites the URL with `history.replaceState`
   (preserving `?debug=`, `?all` and the rest). It changes **nothing visible** — see below.
2. `relocalizeChapter()` re-runs the current chapter's four getters. Because they read through
   `I18N.content()`, that re-points `SCENES` / `ENDINGS` / `WALL` / `SHARED_CALLBACK` at the same
   chapter's other language. It is `activateChapter()` without the resets.
3. `I18N.warmText()` is handed the words about to be painted, so their font subsets download during
   the fade rather than after it.
4. The view repaints, and `I18N.applyLang()` fires **on the same frame the words change**.

**`setLang` and `applyLang` are split for one reason.** `body[data-lang]` carries the whole font
block — stack, line height, measure, italic rules — so the frame it flips on is the frame the page
changes typeface. Flipping it when the pack changes, while a 400ms scene fade still has the old
language's words on screen, set English prose in a kai face with CJK metrics for most of half a
second. That was the "weird font in between". `applyLang()` is therefore called at the exact swap
point, which differs by what is on screen:

| On screen | Where `applyLang()` fires |
|---|---|
| Title screen | immediately — it rewrites that copy itself, so words and face change together |
| A scene or ending | inside `fadeOut`'s `onSwap` hook, the instant the old content is removed |
| A plate | immediately, with `relocalizePlate()` rewriting the caption in place |
| The tally wall | immediately, with `Gallery.relabel()` rebuilding it in place |

Plates and the wall are fixed overlays outside `#scene-content`: a scene repaint does not reach
them, so each is rewritten in place and the scene repainting behind them is invisible. Both are
checked **before** the `playing` test, because `?all` opens the wall over the title screen.

**English needs a snapshot.** English has no `title` block — it *is* the markup — which was true
right up until a pack overwrote that markup, and switching no longer reloads the page to bring it
back. So `applyLang()` snapshots every `[data-i18n]` node (plus `<title>` and the meta description)
on its first call, before anything is written over them, and restores from that when the active
pack has no `title`. Still one copy of the English, still in `index.html`; this only remembers what
it said.

Nothing the run has earned is language, so nothing is lost: `flags`, `examined`, the wall's `seen`
count, the carved name, the active chapter and the current scene all survive. `Gallery.relabel()`
drops only the caption cache (built against the old language's `SCENES`/`ENDINGS`) and rebuilds an
open wall in place — unlike `reset()`, which is the chapter switch and does clear the count. The
replacement opens **already opaque** and keeps the previous `scrollTop`: letting it run the normal
fade in showed the title screen through it, and resetting the scroll lost the reader's place.

`{ repaint: true }` suppresses the scene's opening plate: a plate is an arrival beat, and replaying
it over a scene the player has been sitting in reads as the game restarting. The bed does not
restart either — `playBed` recognises the same key and simply holds.

**The one casualty** is position *within* a scene. `runtime.answered` is rebuilt with the scene, so
the reactive chain repaints from its first prompt. Answering again writes the same flag it already
holds, so nothing downstream changes; it is a repeated question, not a lost one. The alternative
was reloading, which loses the entire run in a game with no saves. Not close.

**The title screen** is static HTML, and English is that HTML. A pack overrides it through
`data-i18n="key"` (sets `textContent`) and `data-i18n-html="key"` (sets `innerHTML`, for the two
lines carrying `<em>`), both resolved against the pack's `title` block; blurb lines are indexed,
`data-i18n="blurb.0"`. `docTitle` and `metaDescription` are applied to `<title>` and the meta tag.
Adding a line to the blurb means adding it to the packs — `--check` enforces the count of nine.

**Engine-composed strings** (the ones no data file owns) live in `UI_EN` in `i18n.js` and in each
pack's `ui` block: `examine`, `continue`, `plate`, `unnamedPlayer`, `registerCount`, `soundOn`,
`soundOff`, `calendarTitle`, `calendarWeekdays`. A pack that omits one degrades to
English for that string rather than to `undefined`.

The wall's own copy is **not** here — it is narrative-adjacent and lives in `WALL_*`, so a
translation gets it from `wall-c1.json` / `wall-c2.json` like everything else.

---

## 5. What does not localize

- **Morse.** The three water-clocks drip `SOL STAT. TERRA MOVET. EGO PRAECEDENS.` in Latin, in
  International Morse. The game never translates it in any language (script doc, *Deliberate
  Decisions*); the wall's hidden plaque still answers in Latin and translates *that* into the
  reading language. `secretPhrase` is a structural value and `--check` will reject a translated one.
- **Asset filenames, ids, flag values, scene ids.** Same reason.
- **Audio.** No spoken word in the game, so nothing to redub. The sound toggle's `aria-label` is
  the only audio-adjacent string and it comes from the UI table.
- **The wordmark.** "Superstes" is Latin and is the game's name; it stays in blackletter in every
  language. The gloss beneath it is translated.
- **The calendar's grid.** May 1543 began on a Tuesday everywhere. Only its caption and weekday
  initials localize.
- **Roman numerals** on the wall and the chapter doors.

---

## 6. Typography

Every face in `css/style.css` is reached through six variables in `:root`, so a language swaps its
entire typographic register in one `body[data-lang="…"]` block rather than at ~40 call sites. Keep
it that way; the block is the point.

For `zh` (`body[data-lang="zh"]`):

| Slot | English | Chinese | Why |
|---|---|---|---|
| `--display` | Grenze Gotisch | Ma Shan Zheng | a cursive brush hand, far enough from the body face to keep the hierarchy the blackletter gave the English |
| `--head` / `--body` / `--label` / `--cal-mono` | Grenze Gotisch / Grenze / Special Elite | LXGW WenKai Screen (`--kai`) | see below |
| `--cal-title` | Mrs Saint Delafield | Ma Shan Zheng | the calendar's own hand |

**The body face is a 楷体, and that is the whole decision.** Kai is brush-derived regular script:
the stroke entries and exits of a written hand are still in it. A Song/Ming face — Noto Serif SC,
which this shipped with first — is the Chinese newspaper letter, upright and mechanical, and it
made the narration read like a report. The entire story is one person remembering out loud, in a
hand; kai is the closest Chinese equivalent to the face the English is set in.

Google Fonts carries no kai at all, so `LXGW WenKai Screen` (霞鹜文楷, SIL OFL) comes from jsDelivr
as ~26 unicode-range subsets — a page pulls only the characters it uses. The `--kai` stack falls
back through the system kai faces (`Kaiti SC`, `STKaiti`, `TW-Kai`, `KaiTi`, `BiauKai`) for anyone
offline, and to Noto Serif SC behind those; only one of them is ever downloaded. WenKai ships a
single weight, which is why the `zh` block sets no `font-weight` — asking for 300 only invited a
synthesised thin from the fallbacks.

Three adjustments that are corrections, not taste:

1. **Line height and measure.** CJK glyphs are full-width with no ascender/descender air, so Latin
   line-heights read cramped: `line-height: 2`, and `--measure` drops from 34rem to 30rem because a
   CJK line needs fewer characters to fill it.
2. **Letter-spacing.** Nearly every `.label` rule sets tracking for the small-caps Latin look. On
   CJK that reads as broken text, not as tracking, so it is flattened to `0.02em` — except on the
   Roman numerals and register headings, which are still Latin.
3. **Italics.** Noto Serif SC ships no italic, so every `font-style: italic` in the stylesheet
   becomes a synthesised oblique, which is not an emphasis convention in Chinese and reads as a
   rendering fault. Whole-block italics (the blurb, plates, the closing response, the wall's
   translation) go upright — they are already set apart by size, colour and measure. Inline `<em>`,
   which carries real stress in the prose, takes 着重号 instead: `text-emphasis: sesame`,
   positioned **under** the line (over is the Japanese convention). `<em>` wrapping a whole quoted
   line — remembered speech in the plates and the Latin gloss — is exempted, because a full row of
   sesame marks reads as damage.

Every pack is loaded by every player, in every language — `js/content-zh.js` is ~90KB of text,
against ~130KB for the English data files and ~31MB of audio, so gating it behind the chosen
language would buy nothing and would cost the "plain `<script>` tags, no async loading" convention
that keeps `file://` working. Revisit only if the pack count grows.

**Fonts are warmed before they are needed.** WenKai arrives as ~97 unicode-range subsets, so a
switch would otherwise fetch its glyphs at the moment they first paint and `font-display: swap`
would show a fallback for a beat — on the very frame the player is watching. Two calls avoid that:
hovering or focusing the toggle warms the target pack's title copy (the high-frequency subsets every
scene needs), and the switch itself warms the exact words about to appear, which then have the
length of the fade to arrive in. Both go through `I18N.warmText()`, which is family-agnostic on
purpose — it asks every registered `@font-face` to load that text, and a face whose unicode-range
does not cover it is never fetched. The font stack stays defined only in the stylesheet.

The two CJK faces are pulled from Google Fonts in `index.html` alongside the Latin ones. They are
requested unconditionally; splitting the request by language would need JS in `<head>` and would
cost a flash of unstyled text to save a request the browser makes in parallel anyway.

---

## 7. Adding a language

1. `cp -r content/zh content/<lang>` and translate every string value in place.
2. Set `lang`, `htmlLang`, `toggleGlyph`, `toggleLabel` and `toggleAria` in `ui.json`. All of them
   describe the button **while that language is active** — the Chinese pack offers `A` / "English",
   English offers `文` / "中文" — so each pack carries the mark for leaving itself, and the button
   never has to reason about direction. `toggleGlyph` must be one or two characters (`--check`
   enforces it): it is set inside a 2.6rem circle beside the sound button. English's own entry
   lives in `i18n.js`'s `packs.en`.
3. `scripts/build_content.py --check <lang>` until clean, then `scripts/build_content.py <lang>`.
4. Add `<script src="js/content-<lang>.js"></script>` to `index.html`, after the English data files
   and before `chapters.js`.
5. Add a `body[data-lang="<lang>"]` block to `css/style.css` if the script needs different faces or
   metrics, and add its faces to the font links in `index.html`.
6. Update `NAMES` in `scripts/build_content.py`, §1 of this doc, and the README.

`I18N.mountToggle` offers exactly one alternative language and picks the first registered pack. A
third language needs a real picker rather than a toggle — that is a UI decision this doc has not
made.

---

## 8. Translating well

The script docs own tone and are the reference for it. Two things a translator should know that
are not visible in the JSON:

- **The narrator is one voice across both chapters** — retrospective, flat about strange things,
  unhurried. Chapter I is period-inflected and Chapter II is deliberately plainer. The gap between
  them is load-bearing, so do not level it.
- **The endings are assembled from fragments**: `baseOpening` → `conditionalMiddle` row →
  the shared callback → `specificCallback` (Ending C only) → `closing`, concatenated with blank
  lines (tech doc §4). Every row of a `conditionalMiddle` table has to read as the same paragraph
  regardless of which one is drawn, and has to join cleanly to the same opening and the same
  closing. Translate a table as a set, not row by row.

The Chinese pack is pitched toward 苏童's register — concrete, damp, unhurried, fatalistic without
raising its voice — which is a close match for the original's water, fog and mildew, and for a
narrator who reports the impossible without commenting on it.
