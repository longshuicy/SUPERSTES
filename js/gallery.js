// SUPERSTES — the tally wall.
//
// A record of every plate the game can show, in story order, with the ones you
// actually witnessed inked in and the rest left as marks scratched on the wall.
// No narrative content lives in this file; captions are derived from SCENES /
// ENDINGS and the wall's own words come from wall.js.
//
// Two constraints shape the whole thing:
//
//   MEMORY. A decoded bitmap costs width x height x 4 bytes regardless of
//   format, so a grid of 33 shipped plates would hold ~110MB at once — the
//   same failure the examine panels had before the downscale (see
//   scripts/optimize_images.sh). The wall therefore renders a separate 400px
//   thumbnail tier, lazily, and un-inked cells request no image at all: they
//   are inline SVG. The lightbox is the only place a full-size asset is ever
//   fetched, and it drops the node on close so decodes never accumulate.
//
//   NO PERSISTENCE. Nothing is stored between loads — a stated constraint of
//   the game, and one the title screen makes a promise about. The wall is
//   therefore session-only: it counts what this run witnessed and forgets it
//   on refresh. Reached cold from the title screen it is entirely un-inked,
//   which spoils nothing and is its own kind of invitation.

const Gallery = (function () {

  /* ─────────────────────────────────────────────────── what has been seen */

  // Filled by Gallery.saw(), called from main.js at the three places an image
  // is actually put on screen: the background stack, the tier-2 examine frame,
  // and the plate. Recording at the display sites rather than mapping scene
  // ids keeps this honest — a plate the player never reached cannot sneak in.
  const seen = new Set();

  // Set by ?all — reveals the whole wall without pretending it was witnessed.
  let revealAll = false;

  // Whether the wall's hidden phrase has been handed back yet, solved or
  // just asked for, and whether the plaque has already sounded its prompt.
  // Session-only like everything else here: closure state, not a flag,
  // because it belongs to the wall and nothing else reads it.
  let secretRevealed = false;
  let secretPrompted = false;

  function idOf(src) {
    return String(src || "").split("/").pop().replace(/\.[a-z0-9]+$/i, "");
  }

  function saw(src) {
    const id = idOf(src);
    if (id) seen.add(id);
  }

  function has(id) {
    return revealAll || seen.has(id);
  }

  /* ───────────────────────────────────────────────────────── the catalogue */

  // Every image the game can put on screen, in the order it could be met,
  // paired with the words the game already uses for it. Built once, lazily.
  let cache = null;

  function catalogue() {
    if (cache) return cache;

    const out = [];
    const byId = new Map();

    function add(src, caption) {
      if (!src) return;
      const id = idOf(src);
      if (!id || byId.has(id)) return;   // obj-water-clock is examined twice
      const entry = { id: id, src: src, caption: caption || "" };
      byId.set(id, entry);
      out.push(entry);
    }

    (typeof SCENES !== "undefined" ? SCENES : []).forEach(scene => {
      add(scene.background, scene.title);
      if (scene.openingPlate) add(plateImage(scene.openingPlate), scene.title);
      (scene.tier2 || []).forEach(item => add(item.image, item.label));
      if (scene.closingPlate) add(plateImage(scene.closingPlate), scene.title);
    });

    (typeof ENDINGS !== "undefined" ? ENDINGS : []).forEach(ending => {
      add(ending.background, ending.title);
    });

    cache = out;
    return out;
  }

  // normalizePlate lives in main.js and loads after this file; a plate spec is
  // either a path or { image, ... }, so read it directly rather than reaching
  // across load order for one field.
  function plateImage(spec) {
    return typeof spec === "string" ? spec : (spec && spec.image);
  }

  function registerOf(id) {
    return WALL.registers.find(r => r.prefix.some(p => id.indexOf(p) === 0)) || null;
  }

  function thumbFor(src) {
    return src.replace(/([^/]+)$/, "thumbs/$1");
  }

  /* ──────────────────────────────────────────────────────────── the marks */

  // Deterministic per-cell, so a given plate always wears the same scratches
  // and the wall looks kept by a hand rather than tiled by a machine.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  // `groups` scales with the cell: a wide 16:9 cell holding one small cluster
  // reads as a broken image, so it gets a longer run and squares get one.
  function marksSVG(id, groups) {
    const h = hash(id);
    const runs = [];
    let total = 0;
    // Unsigned shifts throughout: `>>` is signed, so any hash above 2^31 comes
    // back negative, `% 5` yields a negative remainder, and the cell draws no
    // marks at all inside a negative-width viewBox.
    for (let g = 0; g < groups; g++) {
      const n = 1 + ((h >>> (g * 4)) % 5);
      runs.push(n);
      total += n === 5 ? 4 : n;
    }

    const step = 11;
    const gap = 14;
    const width = (total - 1) * step + (groups - 1) * gap + 20;
    let x = 10;
    let out = '<svg viewBox="0 0 ' + width + ' 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';

    runs.forEach((n, g) => {
      const full = n === 5;
      const bars = full ? 4 : n;
      const start = x;
      for (let i = 0; i < bars; i++) {
        const jx = (((h >>> (i * 3 + g)) % 7) - 3) * 0.35;
        const jt = (((h >>> (i * 5 + g)) % 5) - 2) * 0.5;
        const cx = x + jx;
        out += '<line x1="' + (cx + jt).toFixed(2) + '" y1="32" x2="' +
               (cx - jt).toFixed(2) + '" y2="68"/>';
        x += step;
      }
      if (full) {
        out += '<line x1="' + (start - 4) + '" y1="70" x2="' +
               (x - step + 4) + '" y2="30"/>';
      }
      x += gap;
    });

    return out + "</svg>";
  }

  const ROMAN = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],
                 [50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];

  function roman(n) {
    let out = "";
    for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
    return out;
  }

  /* ───────────────────────────────────────────────────────────── rendering */

  function build() {
    const items = catalogue();
    const total = items.length;
    const got = items.filter(i => has(i.id)).length;

    const wall = document.createElement("div");
    wall.className = "wall";

    const head = document.createElement("div");
    head.className = "wall-head";
    head.innerHTML =
      '<h2>' + esc(WALL.heading) + '</h2>' +
      '<p class="wall-count">' + (got ? roman(got) : "&mdash;") +
      '<span class="of"> / ' + roman(total) + '</span></p>' +
      '<div class="wall-rule"></div>';
    wall.appendChild(head);

    let plate = 0;

    WALL.registers.forEach(reg => {
      const mine = items.filter(i => registerOf(i.id) === reg);
      if (!mine.length) return;

      const section = document.createElement("section");
      section.className = "wall-register";

      const h3 = document.createElement("h3");
      const inkedHere = mine.filter(i => has(i.id)).length;
      h3.innerHTML = esc(reg.numeral + ". " + reg.label) +
        '<span class="wall-of">' + esc(I18N.ui("registerCount")
          .replace("{n}", inkedHere).replace("{total}", mine.length)) + "</span>";
      section.appendChild(h3);

      const grid = document.createElement("div");
      // Layout comes from the register's `layout` role, not its label — a
      // renamed register must not lose its columns (see style.css).
      const layout = reg.layout || "square";
      grid.className = "wall-grid " + layout;
      const groups = layout === "wide" ? 3 : 1;

      mine.forEach(item => {
        plate++;
        grid.appendChild(has(item.id) ? inked(item, plate) : scratched(item, groups));
      });

      section.appendChild(grid);
      wall.appendChild(section);
    });

    const foot = document.createElement("p");
    foot.className = "wall-foot";
    foot.innerHTML = (WALL.credit || []).map(esc).join("<br>");
    wall.appendChild(foot);

    // Chapter II's wall has no plaque: there is no Morse in that chapter, so
    // there is nothing withheld for a plaque to hand back. A wall without a
    // `secretPrompt` simply doesn't grow one.
    if (hasSecret()) wall.appendChild(secretBlock());

    return wall;
  }

  function hasSecret() {
    return !!(WALL && WALL.secretPrompt);
  }

  /* ─────────────────────────────────────────────────────── the secret plaque

     Built on the same mechanism a scene's choice uses (main.js, the held
     beat before a choice): veiled until the player actually scrolls to it,
     then a prompt cue as the question uncovers, then an answer. Adapted
     rather than shared outright — the wall scrolls inside its own overlay,
     not the window, so this uses a plain IntersectionObserver against that
     overlay instead of watchChoice's window-scroll watcher.

     One phrase, handed back if the player already has it — or handed over,
     for anyone who would rather be told than guess. Either way plays the
     same confirmation every other answer in the game gets (see audio.js,
     Sound.secretRevealed); a wrong guess gets nothing, same as everywhere
     else a wrong answer isn't actually an answer. Correct or asked-for, it
     also unhides "Begin again" (§ open), which stays hidden until this
     plaque has been dealt with one way or the other. */

  function secretNormalized(s) {
    return String(s || "").toUpperCase().replace(/[^A-Z]/g, "");
  }

  function secretBlock() {
    const wrap = document.createElement("div");
    wrap.className = "wall-secret" + (secretRevealed ? "" : " veiled");

    if (secretRevealed) {
      renderSecretRevealed(wrap);
      return wrap;
    }

    const prompt = document.createElement("p");
    prompt.className = "wall-secret-prompt veiled-item";
    prompt.textContent = WALL.secretPrompt;
    wrap.appendChild(prompt);

    const form = document.createElement("form");
    form.className = "wall-secret-form veiled-item";
    form.setAttribute("autocomplete", "off");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "wall-secret-input";
    input.placeholder = WALL.secretLabel;
    input.setAttribute("aria-label", WALL.secretPrompt);
    form.appendChild(input);

    function trySubmit() {
      const guess = secretNormalized(input.value);
      if (guess && guess === secretNormalized(WALL.secretPhrase)) revealSecret(wrap);
    }
    form.addEventListener("submit", e => { e.preventDefault(); trySubmit(); });
    // Belt and braces: native implicit submission (one field, no submit
    // button) should already fire the handler above on Enter, but this
    // does not depend on that behavior landing the same way everywhere.
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); trySubmit(); }
    });
    wrap.appendChild(form);

    const ask = document.createElement("button");
    ask.type = "button";
    ask.className = "wall-secret-ask veiled-item";
    ask.textContent = WALL.secretReveal;
    ask.addEventListener("click", () => revealSecret(wrap));
    wrap.appendChild(ask);

    return wrap;
  }

  // Uncovers the plaque once the player has actually scrolled to it (or
  // tabbed into it) — the reveal itself, a prompt cue, once, same as any
  // choice's question arriving. Does nothing if the phrase is already
  // revealed; there is no question left to prompt.
  function armSecret(wrap, root) {
    if (secretPrompted || secretRevealed) return;
    let done = false;

    function trigger() {
      if (done) return;
      done = true;
      io.disconnect();
      wrap.removeEventListener("focusin", trigger);
      secretPrompted = true;
      Sound.secretPrompted();
      wrap.classList.remove("veiled");
      // The prompt, then the answer a beat after — same shape as a choice's
      // question arriving before its options (main.js, REVEAL_REACTIVE).
      wrap.querySelectorAll(".veiled-item").forEach((node, i) => {
        setTimeout(() => node.classList.remove("veiled-item"), 260 + i * 260);
      });
    }

    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) trigger();
    }, { root: root, threshold: 0.6 });
    io.observe(wrap);
    wrap.addEventListener("focusin", trigger);
  }

  function revealSecret(wrap) {
    if (secretRevealed) return;
    secretRevealed = true;
    Sound.secretRevealed();
    wrap.classList.remove("veiled");
    wrap.innerHTML = "";
    renderSecretRevealed(wrap);
    revealBeginAgain();
  }

  function renderSecretRevealed(wrap) {
    wrap.classList.add("is-revealed");

    const phrase = document.createElement("p");
    phrase.className = "wall-secret-phrase";
    phrase.textContent = WALL.secretPhrase;
    wrap.appendChild(phrase);

    const translation = document.createElement("p");
    translation.className = "wall-secret-translation";
    translation.textContent = WALL.secretTranslation;
    wrap.appendChild(translation);
  }

  function inked(item, plate) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "wall-cell seen";
    cell.dataset.src = item.src;
    cell.dataset.caption = item.caption;
    cell.dataset.plate = WALL.plateWord + " " + roman(plate);

    const img = document.createElement("img");
    img.alt = item.caption;
    img.loading = "lazy";
    img.decoding = "async";
    // The thumbnail tier is generated by scripts/optimize_images.sh. If it has
    // not been run, fall back to the shipped plate rather than showing a hole.
    img.addEventListener("error", () => {
      if (img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.src = item.src;
    });
    img.src = thumbFor(item.src);
    cell.appendChild(img);

    const label = document.createElement("span");
    label.className = "wall-plate";
    label.innerHTML = '<span class="num">' + esc(cell.dataset.plate) + '</span>' +
                      '<span class="name">' + esc(item.caption) + '</span>';
    cell.appendChild(label);

    return cell;
  }

  function scratched(item, groups) {
    const cell = document.createElement("div");
    cell.className = "wall-cell unseen";
    cell.innerHTML = marksSVG(item.id, groups) +
      '<span class="wall-veil">' + esc(WALL.unseen) + '</span>';
    return cell;
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  /* ───────────────────────────────────────────────────────────── lightbox */

  let box = null;

  function openPlate(cell) {
    closePlate();
    box = document.createElement("div");
    box.className = "wall-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", cell.dataset.caption || I18N.ui("plate"));
    box.tabIndex = -1;

    const fig = document.createElement("div");
    fig.className = "wall-box-figure";
    const img = document.createElement("img");
    img.src = cell.dataset.src;                 // full size, one at a time
    img.alt = cell.dataset.caption;
    fig.appendChild(img);

    const cap = document.createElement("p");
    cap.className = "wall-box-caption";
    cap.innerHTML = '<span class="num">' + esc(cell.dataset.plate) + '</span>' +
                    esc(cell.dataset.caption);
    fig.appendChild(cap);

    box.appendChild(fig);
    box.addEventListener("click", closePlate);
    document.body.appendChild(box);
    document.body.classList.add("wall-box-open");
    void box.offsetHeight;
    box.classList.add("visible");
    box.focus();
  }

  // Removing the node is the point, not just hiding it: it is what releases
  // the full-size decode.
  function closePlate() {
    if (!box) return;
    box.remove();
    box = null;
    document.body.classList.remove("wall-box-open");
  }

  document.addEventListener("click", e => {
    const cell = e.target.closest && e.target.closest(".wall-cell.seen");
    if (cell) openPlate(cell);
  });

  document.addEventListener("keydown", e => {
    if (box && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      closePlate();
    }
  });

  /* ─────────────────────────────────────────────────────────────── public */

  // The wall takes over the screen entirely — its own black page, arrived at
  // from an ending. It is not a separate document: nothing is persisted, so the
  // count only exists inside the run that earned it and cannot survive a
  // navigation. `final` is the ending's arrival, which offers "begin again" and
  // no way back; without it (?all) the wall is a dismissable overlay instead.
  let overlay = null;

  // "Begin again", when this is the final wall. Hidden until the secret
  // plaque has been dealt with (see revealBeginAgain) — null the rest of
  // the time, including on a non-final (?all) open, where it never exists.
  let againWrap = null;

  // What the open wall was opened as, so a language switch can rebuild it the
  // same way. Null whenever the wall is closed.
  let openOpts = null;

  // `instant` skips the fade in. Used only when the wall is being rebuilt
  // underneath itself (a language switch): the overlay is opaque, so fading a
  // replacement up from zero shows the title screen through it for 400ms.
  function open(opts, instant) {
    if (overlay) return;
    const final = !!(opts && opts.final);
    openOpts = { final: final };

    overlay = document.createElement("div");
    overlay.className = "wall-overlay" + (final ? " is-final" : "");

    overlay.appendChild(build());

    // A wall with no `again` offers no way out at all — the only exit is the
    // browser's own. Chapter II used to ship that way; it now carries Begin
    // again (script doc, reversed decision) but still has no nextChapter.
    //
    // Both kinds of wall get this exit, and it is the only one either gets.
    // A `?all` wall used to carry a × in the top corner instead; that corner
    // now belongs to the standing sound and language controls, and a third
    // icon of a different kind crowded them. The foot of the wall is where
    // this wall already puts its way onward.
    if (WALL.again) {
      const wrap = document.createElement("div");
      // The plaque gates the foot of the *final* wall only. On a `?all` wall
      // nothing was witnessed and so nothing is being withheld.
      const gated = final && hasSecret() && !secretRevealed;
      const wrap_cls = "continue-wrap wall-again" + (gated ? " wall-again-pending" : "");
      wrap.className = wrap_cls;
      const again = document.createElement("button");
      again.type = "button";
      again.className = "continue";
      again.textContent = WALL.again;
      // Final: start over from here. `?all`: a reload would only reopen the
      // same wall, so drop the parameter and land on the title screen.
      again.addEventListener("click", () => {
        if (final) return window.location.reload();
        const q = new URLSearchParams(window.location.search);
        q.delete("all");
        const rest = q.toString();
        window.location.href = window.location.pathname + (rest ? "?" + rest : "");
      });
      wrap.appendChild(again);

      // A wall may also open onto the next chapter. Both exits appear together
      // and are gated together — the plaque holds the foot of the wall shut,
      // not just one button of it.
      //
      // Loading the next chapter as a fresh page rather than swapping it in
      // place: nothing here is persisted, so a reload costs the player nothing
      // and buys a guaranteed-clean state instead of unwinding an ending's
      // body classes, background layers and runtime by hand. "Begin again"
      // already works exactly this way.
      if (final && WALL.nextChapter) {
        const on = document.createElement("button");
        on.type = "button";
        on.className = "continue wall-next-chapter";
        on.textContent = WALL.nextChapter.label;
        on.addEventListener("click", () => {
          window.location.search = "?chapter=" + encodeURIComponent(WALL.nextChapter.key);
        });
        wrap.appendChild(on);
      }

      overlay.appendChild(wrap);
      againWrap = wrap;
    } else {
      againWrap = null;
    }

    // Opaque before it is in the document, so there is no transition to run.
    if (instant) overlay.classList.add("visible");
    document.body.appendChild(overlay);
    document.body.classList.add("wall-open");
    if (!instant) {
      void overlay.offsetHeight;
      overlay.classList.add("visible");
    }
    overlay.scrollTop = 0;

    const secretEl = overlay.querySelector(".wall-secret");
    if (secretEl) armSecret(secretEl, overlay);

    // A rebuild is not an arrival: put the reader back where they were reading
    // and do not move focus.
    if (instant) {
      overlay.scrollTop = resumeScroll;
      resumeScroll = 0;
      if (!final) document.addEventListener("keydown", onOverlayKey);
      return;
    }

    // Never the "Begin again" button here: in the final wall it starts
    // hidden (above), and even once visible it sits at the very foot of a
    // long page — focusing it scrolls the overlay there, undoing the
    // scrollTop reset just above and opening the wall already at its own
    // ending. `preventScroll` guards the close button too, on principle.
    overlay.focus({ preventScroll: true });
    if (!final) document.addEventListener("keydown", onOverlayKey);
  }

  // Called once the secret plaque has been answered or asked for. A no-op
  // outside the final wall, and a no-op if it was already revealed when
  // this wall opened (nothing to uncover).
  function revealBeginAgain() {
    if (!againWrap || !againWrap.classList.contains("wall-again-pending")) return;
    againWrap.classList.remove("wall-again-pending");
    againWrap.classList.add("wall-again-in");
    const btn = againWrap.querySelector(".continue");
    if (btn) btn.focus({ preventScroll: true });
  }

  function onOverlayKey(e) {
    if (e.key === "Escape" && !box) dismiss();
  }

  function dismiss() {
    if (!overlay) return;
    closePlate();
    document.removeEventListener("keydown", onOverlayKey);
    overlay.classList.remove("visible");
    document.body.classList.remove("wall-open");
    const dying = overlay;
    overlay = null;
    againWrap = null;
    openOpts = null;
    setTimeout(() => dying.remove(), 400);
  }

  function setRevealAll(v) { revealAll = !!v; }

  // Language switch. Every caption on this wall is derived at runtime from
  // SCENES / ENDINGS, and the wall's own copy comes from WALL — all three now
  // point at the other language, so the cache built against the old one is
  // stale and nothing else is. Unlike reset(), the count survives: `seen`,
  // `revealAll` and the plaque state belong to the run, not to the language.
  //
  // An open wall is rebuilt in place. The node is dropped synchronously rather
  // than through dismiss(), whose 400ms fade would let open() see a live
  // overlay and bail.
  let resumeScroll = 0;

  function relabel() {
    cache = null;
    if (!overlay) return;
    const opts = openOpts;
    resumeScroll = overlay.scrollTop;
    closePlate();
    document.removeEventListener("keydown", onOverlayKey);
    overlay.remove();
    overlay = null;
    againWrap = null;
    openOpts = null;
    // `wall-open` deliberately stays on the body: it is re-added a few lines
    // later in the same task, and dropping it would let the page behind
    // scroll for the length of a frame.
    open(opts, true);
  }

  // Chapter switch. The count belongs to the chapter that earned it, and the
  // catalogue is derived from whichever SCENES/ENDINGS are active, so carrying
  // Chapter I's inked cells into Chapter II's wall would credit it with plates
  // it never showed. Clear the catalogue cache too — it was built against the
  // previous chapter's SCENES/ENDINGS — and drop revealAll so a `?all` visit
  // cannot ink the next chapter's wall for free. The plaque state resets with it.
  function reset() {
    cache = null;
    revealAll = false;
    seen.clear();
    secretRevealed = false;
    secretPrompted = false;
  }

  return {
    saw: saw,
    open: open,
    close: dismiss,
    reset: reset,
    relabel: relabel,
    isOpen: () => !!overlay,
    setRevealAll: setRevealAll,
    count: () => catalogue().filter(i => has(i.id)).length,
    total: () => catalogue().length
  };
})();
