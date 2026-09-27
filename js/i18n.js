// SUPERSTES — the locale registry.
//
// English is the source language and lives where it always has: as literals in
// index.html and in this file's UI table. A translation is a *content pack* —
// one generated file (js/content-<lang>.js) that calls I18N.register() with a
// full set of chapter data plus a UI table. Nothing else in the engine changes
// shape; chapters.js picks between the English globals and the pack's, and the
// handful of strings main.js/gallery.js/audio.js build themselves come from
// I18N.ui() instead of being inlined.
//
// Translations are hand-edited as pure JSON under content/<lang>/ and wrapped
// into js/content-<lang>.js by scripts/build_content.py. The JSON is the master;
// the generated .js is the committed artifact, the same bargain the art and
// audio pipelines make (see CLAUDE.md, "Known intentional deviations").
//
// Language is chosen with ?lang= and nothing else. There is no persistence in
// this game by design (tech doc §1), so the URL is the whole of the state — and
// the URL is rewritten in place on a switch rather than navigated to, because
// the toggle sits beside the sound button and is live for the whole run. A
// reload there would throw away a run that cannot be saved. Re-pointing the
// data and repainting the current view costs nothing and keeps it.
//
// No narrative content lives here. Copy belongs to the chapters' data files and
// to content/<lang>/.

const I18N = (function () {

  // The source-language UI table. Only strings the *engine* composes live here;
  // everything the title screen says is inline in index.html, marked up with
  // data-i18n so a pack can override it.
  const UI_EN = {
    examine: "Examine",
    continue: "Continue",
    plate: "Plate",
    unnamedPlayer: "a name",
    // Per-register tally on the wall: {n} inked of {total} in that register.
    registerCount: "{n} of {total}",
    soundOn: "Sound on",
    soundOff: "Sound off",
    calendarTitle: "Maius · MDXLIII",
    calendarWeekdays: ["S", "M", "T", "W", "T", "F", "S"]
  };

  // `toggleGlyph` / `toggleLabel` are what the button shows *while this pack is
  // active* — English offers 文, Chinese offers A — so each pack carries the
  // mark for leaving itself and the button never reasons about direction.
  const packs = {
    en: {
      lang: "en", htmlLang: "en",
      toggleGlyph: "文", toggleLabel: "中文", toggleAria: "切换到中文",
      ui: UI_EN, title: null, content: null
    }
  };

  let active = "en";

  function register(pack) {
    if (!pack || !pack.lang) {
      console.error("I18N.register: pack has no lang");
      return;
    }
    packs[pack.lang] = pack;
  }

  // ?lang=zh, falling back to English for anything unregistered. Read once at
  // boot; every later reader goes through lang().
  function resolve() {
    const wanted = new URLSearchParams(window.location.search).get("lang");
    active = (wanted && packs[wanted]) ? wanted : "en";
    return active;
  }

  function lang() { return active; }

  // Swaps the active pack, the URL and the toggle's own mark — and deliberately
  // nothing that is visible in the prose. Painting the page in the new language
  // is `applyLang()`, which the caller fires at the exact moment the words on
  // screen change; doing it here instead put English text under the Chinese
  // font stack for the length of a scene fade.
  function setLang(target) {
    if (!packs[target] || target === active) return false;
    active = target;
    // replaceState, not a navigation: the run survives, and a refresh from here
    // comes back in the language the player chose.
    try {
      window.history.replaceState(null, "", urlFor(active));
    } catch (e) {
      /* file:// refuses replaceState in some browsers; the switch still works,
         the URL just does not follow. Not worth failing over. */
    }
    return true;
  }

  function pack() { return packs[active]; }

  // One UI string, falling back to English whenever a pack omits a key — a
  // half-translated pack degrades to mixed language rather than to "undefined".
  function ui(key) {
    const p = packs[active];
    const v = p && p.ui ? p.ui[key] : undefined;
    return v === undefined ? UI_EN[key] : v;
  }

  // Chapter data: the pack's copy when it has one, the English global otherwise.
  // Called from chapters.js with the two globals already resolved, so a missing
  // content pack simply plays in English.
  function content(key, fallback) {
    const p = packs[active];
    const v = p && p.content ? p.content[key] : undefined;
    return v === undefined || v === null ? fallback : v;
  }

  // Puts the page into the active language: the html/body hooks the stylesheet
  // keys its whole font block off, and the title screen's copy.
  //
  // **Call this on the same frame the words change.** `body[data-lang]` carries
  // the font stack, the line height, the measure and the italic rules, so a
  // page whose hook says `zh` while its text is still English is set in a kai
  // face with CJK metrics — which is exactly what it looks like. During a
  // switch mid-run, main.js defers this into the scene fade's swap point.
  //
  // Rewrites the title screen in place.
  //
  // data-i18n="begin" sets textContent; data-i18n-html="latin" sets innerHTML,
  // for the lines that carry <em>. Both take their value from the pack's
  // `title` block; blurb lines are indexed (blurb.3).
  //
  // English has no `title` block, because English *is* the markup — but that
  // only holds until a pack overwrites it, and switching no longer reloads the
  // page to bring it back. So the markup is snapshotted on the first call,
  // before anything has been written over it, and switching to English
  // restores from that. Still one copy of the English, still in index.html;
  // this just remembers what it said.
  let baseline = null;

  function captureBaseline() {
    if (baseline) return;
    baseline = { text: [], html: [], docTitle: document.title, meta: null };
    document.querySelectorAll("[data-i18n]").forEach(node => {
      baseline.text.push([node, node.textContent]);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(node => {
      baseline.html.push([node, node.innerHTML]);
    });
    const meta = document.querySelector('meta[name="description"]');
    if (meta) baseline.meta = meta.getAttribute("content");
  }

  function applyStaticCopy() {
    captureBaseline();
    const p = packs[active];
    const title = p && p.title;

    // No `title` block means the source language: put the markup back exactly
    // as it was found.
    if (!title) {
      baseline.text.forEach(pair => { pair[0].textContent = pair[1]; });
      baseline.html.forEach(pair => { pair[0].innerHTML = pair[1]; });
      document.title = baseline.docTitle;
      const meta = document.querySelector('meta[name="description"]');
      if (meta && baseline.meta != null) meta.setAttribute("content", baseline.meta);
      return;
    }

    const value = path => path.split(".").reduce(
      (o, k) => (o == null ? undefined : o[k]), title
    );

    document.querySelectorAll("[data-i18n]").forEach(node => {
      const v = value(node.dataset.i18n);
      if (typeof v === "string") node.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(node => {
      const v = value(node.dataset.i18nHtml);
      if (typeof v === "string") node.innerHTML = v;  // our own content, not input
    });

    if (typeof title.docTitle === "string") document.title = title.docTitle;
    if (typeof title.metaDescription === "string") {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", title.metaDescription);
    }
  }

  function applyLang() {
    const p = packs[active];
    document.documentElement.lang = (p && p.htmlLang) || "en";
    document.body.dataset.lang = active;
    // The toggle's own mark belongs to this moment too: it offers English only
    // once there is Chinese on screen to leave.
    if (mountedBtn) paintToggle(mountedBtn);
    applyStaticCopy();
  }

  // The toggle names the language you would be switching *to*, and only ever
  // offers the two: English and whichever pack is registered. With no pack
  // loaded there is nothing to offer, so the button stays hidden.
  function otherLang() {
    const others = Object.keys(packs).filter(k => k !== active);
    return others.length ? others[0] : null;
  }

  // Preserves every other query param, so ?debug= and ?all survive a switch.
  function urlFor(target) {
    const q = new URLSearchParams(window.location.search);
    if (target === "en") q.delete("lang"); else q.set("lang", target);
    const s = q.toString();
    return window.location.pathname + (s ? "?" + s : "") + window.location.hash;
  }

  let mountedBtn = null;
  const warmed = {};

  // Pulls the target language's webfonts down before it is asked for.
  //
  // A switch repaints inside a 400ms fade, which on a fast connection happens
  // to cover the first download of the Chinese subsets. On a slow one it does
  // not, and `font-display: swap` would show a system fallback for a beat —
  // the flash lands on the very frame the player is watching for the change.
  // Warming on hover moves that download before the click, where it is free.
  //
  // Deliberately family-agnostic: it asks every @font-face the document has
  // registered to load the given text. A face whose unicode-range does not
  // cover that text is not fetched, so this costs nothing for the faces that
  // are not wanted, and the font stack stays defined in one place — the
  // stylesheet — instead of being restated as a list of family names here.
  //
  // The text matters, because WenKai arrives as ~97 subsets keyed by codepoint:
  // warming "common Chinese" does not warm a scene that happens to use a rare
  // character. So there are two calls. `warm(target)` runs on hover with the
  // pack's own title copy, which pulls the high-frequency subsets every scene
  // needs. `warmText(sample)` runs at the switch with the exact words about to
  // be painted, buying them the length of the fade to arrive in.
  function warmText(sample) {
    if (!sample || !document.fonts || !document.fonts.load) return;
    const families = {};
    document.fonts.forEach(face => { families[face.family] = true; });
    Object.keys(families).forEach(family => {
      try {
        const load = document.fonts.load('1em "' + family + '"', sample);
        if (load && load.catch) load.catch(() => {});
      } catch (e) { /* a face the browser will not probe; not worth failing over */ }
    });
  }

  function warm(target) {
    const p = packs[target];
    if (!p || warmed[target] || !p.title) return;
    warmed[target] = true;
    warmText([].concat(p.title.blurb || [], p.title.begin || []).join(""));
  }

  function paintToggle(btn) {
    const here = packs[active];
    const target = otherLang();
    btn.textContent = (here && here.toggleGlyph) || (here && here.toggleLabel) || "A";
    btn.setAttribute("aria-label", (here && here.toggleAria) || "Language");
    btn.setAttribute("title", (here && here.toggleLabel) || "");
    // The button's face and name are written in the language it *offers*, not
    // the one being read — 中文 on the English page — so the element carries
    // that language too, or a screen reader pronounces one in the voice of the
    // other. `data-lang` stays the active one: the stylesheet uses it to size
    // the glyph, and that is a property of what is drawn, not of what it says.
    const offered = target ? packs[target] : null;
    if (offered && offered.htmlLang) btn.setAttribute("lang", offered.htmlLang);
    btn.dataset.lang = active;
  }

  // The toggle lives beside the sound button and is live for the whole run, so
  // it hands the switch back to `onSwitch` rather than doing it here: only the
  // engine knows what is on screen and how to repaint it.
  function mountToggle(btn, onSwitch) {
    if (!btn) return;
    mountedBtn = btn;
    if (!otherLang()) { btn.hidden = true; return; }   // English-only build
    paintToggle(btn);
    btn.hidden = false;

    const ready = () => { const t = otherLang(); if (t) warm(t); };
    btn.addEventListener("mouseenter", ready);
    btn.addEventListener("focus", ready);

    btn.addEventListener("click", () => {
      const target = otherLang();
      if (target && onSwitch) onSwitch(target);
    });
  }

  return { register, resolve, setLang, applyLang, lang, pack, ui, content,
           warmText, mountToggle };
})();
