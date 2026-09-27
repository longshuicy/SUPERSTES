// SUPERSTES — state machine, rendering, event handling.
// No narrative content lives in this file. All strings come from scenes.js / endings.js.

/* ────────────────────────────────────────────────────────────── state */

// Populated by activateChapter (chapters.js) — each chapter declares its own
// flag set, and this object is emptied and refilled rather than replaced so
// every reference to it stays valid across a chapter switch.
const flags = {};

const examined = new Set();
let currentSceneId = null;

// Per-scene bookkeeping for the reactive chain. `requiresExamined` gates are
// checked when the chain runs, which is on scene load — before the player has
// had any chance to examine. `runtime` lets an examine re-open a gate that was
// closed at load time (see reconsiderGates).
let runtime = null;

const FADE_MS = 400;

/* ────────────────────────────────────────────────────────────── dom refs */

const stage = document.getElementById("stage");
const content = document.getElementById("scene-content");
const bgA = document.getElementById("bg-a");
const bgB = document.getElementById("bg-b");
let activeBg = bgA;

/* ───────────────────────────────────────────────── missing-asset placeholder */

// Assets are still being generated. Anything that 404s gets a procedural
// stand-in at the same path — swap the real file in and it just works.
const placeholderCache = new Map();

function placeholderFor(src, ratio) {
  const key = src + "|" + ratio;
  if (placeholderCache.has(key)) return placeholderCache.get(key);

  const name = (src.split("/").pop() || "asset").replace(/\.[a-z]+$/i, "");
  const w = ratio === "wide" ? 1600 : 800;
  const h = ratio === "wide" ? 900 : 800;

  // Deterministic pseudo-random from the filename, so each placeholder is
  // distinct but stable across renders.
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  let marks = "";
  for (let i = 0; i < 26; i++) {
    const x = rand() * w, y = rand() * h, l = 40 + rand() * 160, a = rand() * Math.PI;
    marks += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + Math.cos(a) * l).toFixed(1)}" y2="${(y + Math.sin(a) * l).toFixed(1)}"/>`;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#0c0b0a"/>` +
      `<g stroke="#3a352c" stroke-width="1.5" opacity="0.55">${marks}</g>` +
      `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.28}" fill="none" stroke="#5a5245" stroke-width="2" opacity="0.7"/>` +
      `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.17}" fill="none" stroke="#5a5245" stroke-width="1.5" opacity="0.5"/>` +
      `<circle cx="${w / 2}" cy="${h / 2}" r="5" fill="#7d7160"/>` +
      `<text x="${w / 2}" y="${h - 46}" fill="#6f6555" font-family="Georgia,serif" font-size="${ratio === "wide" ? 26 : 30}" font-style="italic" text-anchor="middle">${name}</text>` +
    `</svg>`;

  const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  placeholderCache.set(key, uri);
  return uri;
}

/* ────────────────────────────────────────────────────────────── helpers */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Authored prose may carry <em>/<strong>. Player input never passes through here.
//
// `content` is either a single string (split into paragraphs on blank lines,
// as before) or an array of paragraphs, used by plates whose text is already
// segmented. `tokens` lets a paragraph consisting solely of a placeholder
// render as something other than plain text:
//   tokens.morse       — a paragraph that is exactly "{morse}" types itself in
//   tokens.playerName  — a paragraph that is exactly "{player_name}" renders
//                        as the carved name, styled like the Scene 1 carving
function prose(node, content, tokens) {
  const parts = Array.isArray(content) ? content : String(content).split(/\n{2,}/);
  parts.forEach(part => {
    const trimmed = String(part).trim();

    if (tokens && tokens.morse && trimmed === "{morse}") {
      const p = el("p", "morse morse-inline");
      p.setAttribute("aria-hidden", "true");
      node.appendChild(p);
      typeMorseInto(p, morseGlyphs(tokens.morse));
      return;
    }

    const p = document.createElement("p");
    if (tokens && tokens.playerName !== undefined && trimmed === "{player_name}") {
      p.className = "carved-name";
      p.textContent = tokens.playerName; // textContent only — no injection surface
    } else {
      p.innerHTML = String(part).replace(/\n/g, "<br>");
    }
    node.appendChild(p);
  });
}

// Returns null (never undefined) if the flag hasn't been set to one of the
// case keys yet — e.g. a debug jump straight to a scene that reads a flag an
// earlier scene normally guarantees. Mirrors the ending tables' own
// fallback-warns-on-console convention so a bad jump is loud in the console,
// not a literal "undefined" printed into the page.
function resolveConditional(cond) {
  const key = String(flags[cond.key]);
  if (!Object.prototype.hasOwnProperty.call(cond.cases, key)) {
    console.warn("resolveConditional: no case for", cond.key, "=", flags[cond.key]);
    return null;
  }
  return cond.cases[key];
}

function backgroundFor(id) {
  const s = SCENES.find(x => x.id === id);
  if (s) return s.background;
  const e = ENDINGS.find(x => x.id === id);
  return e ? e.background : null;
}

/* ─────────────────────────────────────────────────────── the coded drip

   Some scenes carry a morse phrase. It is never decoded in-game and never
   translated — the design notes are explicit about that — so it surfaces two
   ways, both of which reward attention rather than demanding it: a faint
   inscription in the margin of the scene, and the drip itself beating out the
   symbols. The script establishes that water as "metered, something counted",
   which makes it the right instrument.

   Real morse timing is far too fast to read as falling water, so this keeps
   morse's *proportions* (a dash is long, a dot is short, gaps separate letters
   and words) at a tempo you can actually count.
   ────────────────────────────────────────────────────────────────────────── */

const DRIP = {
  dot: 1150,        // fall duration of a short drop
  dash: 2700,       // fall duration of a long drop
  symbolGap: 380,
  letterGap: 1000,
  wordGap: 2000,
  loopGap: 7000
};

const dripLayer = document.getElementById("drip");
let dripTimer = null;

function stopDrip() {
  clearTimeout(dripTimer);
  dripTimer = null;
  dripLayer.querySelectorAll(".drop").forEach(d => d.remove());
  dripLayer.classList.remove("coded");
}

function setDrip(code) {
  stopDrip();
  if (!code) return;                                     // ambient CSS drip resumes
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  dripLayer.classList.add("coded");

  // Flatten to a queue of { symbol, gapAfter } so the loop stays trivial.
  const queue = [];
  const words = code.trim().split(" / ");
  words.forEach((word, wi) => {
    const letters = word.split(" ").filter(Boolean);
    letters.forEach((letter, li) => {
      letter.split("").forEach((sym, si) => {
        const lastOfLetter = si === letter.length - 1;
        const lastOfWord = lastOfLetter && li === letters.length - 1;
        const lastOfAll = lastOfWord && wi === words.length - 1;
        queue.push({
          long: sym === "-",
          gap: lastOfAll ? DRIP.loopGap
             : lastOfWord ? DRIP.wordGap
             : lastOfLetter ? DRIP.letterGap
             : DRIP.symbolGap
        });
      });
    });
  });
  if (!queue.length) return;

  let i = 0;
  (function step() {
    const item = queue[i];
    const fall = item.long ? DRIP.dash : DRIP.dot;

    const drop = el("div", "drop" + (item.long ? " long" : ""));
    drop.style.animationDuration = fall + "ms";
    drop.addEventListener("animationend", () => drop.remove());
    dripLayer.appendChild(drop);

    i = (i + 1) % queue.length;
    dripTimer = setTimeout(step, fall + item.gap);
  })();
}

function morseGlyphs(code) {
  return code.replace(/\./g, "·").replace(/-/g, "—");
}

/* ─────────────────────────────────────────────────── typing the inscription

   The phrase types itself in rather than arriving whole, so the eye is caught
   by movement in a page that is otherwise still. Paced like something being
   tapped out, with the gaps between letters and words held longer than the
   marks themselves.

   Each call is self-contained: it checks `node.isConnected` before every
   character rather than relying on a caller to cancel it, so a morse line
   left mid-type when a scene changes just stops quietly once its paragraph
   is removed from the DOM. No shared timer to track or leak, and multiple
   instances (the scene-level inscription, a tier2 hotspot's own line) can be
   in flight at once without fighting each other.
   ───────────────────────────────────────────────────────────────────────── */

const TYPE = { mark: 130, letterGap: 320, wordGap: 480, startDelay: 900 };

function typeMorseInto(node, glyphs, startDelay) {
  const text = el("span", "morse-text");
  const cursor = el("span", "morse-cursor", "·");
  node.appendChild(text);
  node.appendChild(cursor);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    text.textContent = glyphs;
    cursor.remove();
    return;
  }

  const chars = glyphs.split("");
  let i = 0;

  setTimeout(function tick() {
    if (!node.isConnected) return;              // scene moved on; let it lapse
    if (i >= chars.length) { cursor.classList.add("done"); return; }
    const ch = chars[i++];
    text.textContent += ch;
    const delay = ch === "/" ? TYPE.wordGap : ch === " " ? TYPE.letterGap : TYPE.mark;
    setTimeout(tick, delay);
  }, startDelay != null ? startDelay : TYPE.startDelay);
}

/* ────────────────────────────────────────────────────────── transitions */

// Run once, at the instant the outgoing content is removed and before the
// incoming content is built. A language switch parks the repaint of the page's
// own language hooks here: `body[data-lang]` carries the font stack, the line
// height and the italic rules, so flipping it any earlier sets the outgoing
// language's words in the incoming language's face for the length of the fade.
let onSwap = null;

function fadeOut(cb) {
  content.classList.add("fade-out");
  setTimeout(() => {
    content.innerHTML = "";
    if (onSwap) { const run = onSwap; onSwap = null; run(); }
    cb();
    content.scrollTop = 0;
    window.scrollTo(0, 0);
    content.classList.remove("fade-out");
  }, FADE_MS);
}

let currentBgSrc = null;

function setBackground(src) {
  if (!src || src === currentBgSrc) return;   // already showing it; don't crossfade to itself
  currentBgSrc = src;
  Gallery.saw(src);
  const next = activeBg === bgA ? bgB : bgA;
  const probe = new Image();
  probe.onload = () => swap(src);
  probe.onerror = () => swap(placeholderFor(src, "wide"));
  probe.src = src;

  function swap(url) {
    next.style.backgroundImage = `url("${url}")`;
    next.classList.add("visible");
    activeBg.classList.remove("visible");
    activeBg = next;
  }
}

function preload(paths) {
  paths.filter(Boolean).forEach(src => { new Image().src = src; });
}

function openingPlateFor(id) {
  const s = SCENES.find(x => x.id === id);
  return s && s.openingPlate ? normalizePlate(s.openingPlate).image : null;
}

function nextPossibleImages(scene) {
  const nexts = scene.branch
    ? scene.branch.options.map(o => o.next)
    : (scene.next ? [scene.next] : []);

  const out = [];
  nexts.forEach(id => { out.push(backgroundFor(id), openingPlateFor(id)); });
  // Plates appear the instant a choice resolves; they must already be warm.
  if (scene.closingPlate) out.push(normalizePlate(scene.closingPlate).image);
  return out;
}

// True only while a scene is painting its opening state. Blocks added then
// must not steal the scroll position away from the top of the scene.
let painting = false;

// New blocks appear below what the player has already read; ease them in.
function appendBlock(node) {
  node.classList.add("enters");
  content.appendChild(node);
  void node.offsetHeight; // force a reflow so the transition actually runs
  node.classList.add("entered");
  if (!painting) {
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
  return node;
}

/* ────────────────────────────────────────────────────────────── render */

function renderScene(id) {
  const scene = SCENES.find(s => s.id === id);
  if (!scene) return console.error("Unknown scene:", id);

  fadeOut(() => {
    clearReveals();            // nothing from the outgoing scene is still counting
    content.classList.remove("choosing");
    preload(nextPossibleImages(scene));
    setBackground(scene.background);
    Sound.sceneStarted(id);

    if (scene.title) {
      const h = el("h2", "scene-title", scene.title);
      content.appendChild(h);
    }

    const body = el("div", "narration");
    scene.text.forEach(p => prose(body, p));
    if (scene.conditionalText) {
      const t = resolveConditional(scene.conditionalText);
      if (t) prose(body, t);
    }
    content.appendChild(body);

    // A chapter subtitle withheld until its reveal scene. Plainly, with no
    // flash and no glitch — the art doc is explicit that the words just appear.
    if (scene.titleReveal) {
      content.appendChild(el("p", "title-reveal", scene.titleReveal));
    }

    setDrip(scene.morse);
    if (scene.morse) {
      // Marked hidden from assistive tech on purpose: read aloud as a string of
      // dots and dashes it is noise, and spelling it out would translate it.
      const mark = el("p", "morse");
      mark.setAttribute("aria-hidden", "true");
      content.appendChild(mark);
      typeMorseInto(mark, morseGlyphs(scene.morse));
    }

    renderTier2(scene.tier2);

    runtime = { scene: scene, skipped: [], answered: 0 };
    painting = true;
    advanceReactive(scene, 0);
    painting = false;
  });
}

/* ─────────────────────────────────────────── tier 2: inline accordions */

function renderTier2(list) {
  if (!list || !list.length) return;

  const wrap = el("div", "tier2");
  const heading = el("p", "tier2-heading", I18N.ui("examine"));
  wrap.appendChild(heading);

  list.forEach(item => {
    const row = el("div", "tier2-item");

    const btn = el("button", "tier2-label");
    btn.type = "button";
    btn.appendChild(el("span", "tier2-marker", "◆"));
    btn.appendChild(el("span", "tier2-text", item.label));

    const panel = el("div", "tier2-panel");
    panel.hidden = true;

    btn.addEventListener("click", () => {
      const opening = panel.hidden;
      if (opening && !panel.dataset.built) {
        buildTier2Panel(panel, item);
        panel.dataset.built = "1";
      }
      panel.hidden = !opening;
      row.classList.toggle("open", opening);
      btn.setAttribute("aria-expanded", String(opening));
      if (opening) Sound.hotspotOpened(currentSceneId, item);
      else Sound.hotspotClosed(currentSceneId, item);
      if (opening) {
        const isNew = !examined.has(item.id);
        examined.add(item.id);
        btn.classList.add("seen");
        if (isNew) reconsiderGates();
      }
    });

    btn.setAttribute("aria-expanded", "false");
    row.appendChild(btn);
    row.appendChild(panel);
    wrap.appendChild(row);
  });

  content.appendChild(wrap);
}

/* ─────────────────────────────────────────────── the May 1543 calendar

   Scene 5's one hotspot with no image. A static Julian-calendar grid — no
   navigation, nothing clickable, the fixed month is the point. Day 24 (the
   day Copernicus died) is circled and never explained; days 1–20 are struck
   through, the strikes drawn as wobbly hand-inked paths rather than CSS
   `line-through`, loosening as the month goes on. Deterministic per day
   number, not Math.random, so the calendar looks the same on every render.
   ─────────────────────────────────────────────────────────────────────── */

// The weekday initials and the month/year caption are the calendar's only
// words, so they come from the locale table rather than from here — a Chinese
// calendar heads its columns 日一二三四五六, not S M T W T F S. The layout
// below (May 1543 starting on a Tuesday) is history and does not localize.
const calWeekdays = () => I18N.ui("calendarWeekdays");
const CAL_LAST_STRUCK = 20;   // days 1..20 crossed out
const CAL_CIRCLED = 24;       // never explained in-game

function seededRand(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// A single wobbly stroke through the day number. Jitter grows with the day
// number so the line reads as looser, more tired, further into the month.
function handStrike(day) {
  const rand = seededRand(day * 97 + 13);
  const jitter = 2.5 + (day / CAL_LAST_STRUCK) * 7;
  const x1 = 8 + (rand() - 0.5) * jitter, y1 = 48 + (rand() - 0.5) * jitter;
  const x2 = 92 + (rand() - 0.5) * jitter, y2 = 52 + (rand() - 0.5) * jitter;
  const mx = 50 + (rand() - 0.5) * jitter * 1.4, my = 50 + (rand() - 0.5) * jitter * 1.8;
  return `<svg class="cal-mark cal-strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>` +
  `</svg>`;
}

// An ink-drawn ellipse, not a border-radius box: an irregular polygon of
// jittered points reads as drawn rather than styled at this size.
function handCircle(day) {
  const rand = seededRand(day * 61 + 7);
  const cx = 50, cy = 50, rx = 46, ry = 40, pts = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jr = 0.88 + rand() * 0.24;
    pts.push([cx + Math.cos(a) * rx * jr, cy + Math.sin(a) * ry * jr]);
  }
  const d = "M " + pts.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L ") + " Z";
  return `<svg class="cal-mark cal-circle" viewBox="0 0 100 100" aria-hidden="true"><path d="${d}"/></svg>`;
}

function buildMayCalendar() {
  const wrap = el("div", "calendar");
  wrap.appendChild(el("p", "calendar-title", I18N.ui("calendarTitle")));

  const grid = el("div", "calendar-grid");
  calWeekdays().forEach(w => grid.appendChild(el("div", "cal-head", w)));

  // May 1, 1543 (Julian) fell on a Tuesday — weekday index 2 of a S-M-T-W-T-F-S
  // header, so the grid opens with two empty cells. Verified against the
  // Julian day number; see the script doc.
  const FIRST_WEEKDAY = 2;
  for (let i = 0; i < FIRST_WEEKDAY; i++) grid.appendChild(el("div", "cal-cell cal-blank"));

  for (let day = 1; day <= 31; day++) {
    const cell = el("div", "cal-cell");
    const daySpan = el("span", "cal-day", String(day));
    daySpan.dataset.day = String(day);
    cell.appendChild(daySpan);
    if (day <= CAL_LAST_STRUCK) cell.insertAdjacentHTML("beforeend", handStrike(day));
    if (day === CAL_CIRCLED) cell.insertAdjacentHTML("beforeend", handCircle(day));
    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  animateMayCalendar(wrap);
  return wrap;
}

/* One-time reveal, the first time the hotspot opens (buildMayCalendar only
   runs once per panel — see the `panel.dataset.built` guard in renderTier2).
   Every day's number shuffles through random digits and locks in a wave
   left-to-right/top-to-bottom, then the struck-through days ink in one by
   one, and last the 24th's circle settles into place — the animation's one
   deliberate stop. Respects prefers-reduced-motion by skipping straight to
   the final state. */
const CAL_SHUFFLE_TICK = 45;      // ms between random digit swaps
const CAL_SHUFFLE_BASE = 260;     // ms every cell shuffles at minimum
const CAL_SHUFFLE_STAGGER = 16;   // ms added per day, so the lock sweeps the grid
const CAL_MARK_STAGGER = 16;      // ms between successive struck-day reveals
const CAL_PAUSE_BEFORE_MARKS = 180;
const CAL_PAUSE_BEFORE_CIRCLE = 220;

function animateMayCalendar(wrap) {
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    wrap.querySelectorAll(".cal-mark").forEach(m => m.classList.add("revealed"));
    return;
  }

  let maxLock = 0;
  wrap.querySelectorAll(".cal-day").forEach(span => {
    const day = Number(span.dataset.day);
    const lockAt = CAL_SHUFFLE_BASE + day * CAL_SHUFFLE_STAGGER;
    maxLock = Math.max(maxLock, lockAt);

    span.classList.add("is-shuffling");
    const tick = setInterval(() => {
      span.textContent = String(Math.floor(Math.random() * 10)) +
        (day >= 10 ? String(Math.floor(Math.random() * 10)) : "");
    }, CAL_SHUFFLE_TICK);

    setTimeout(() => {
      clearInterval(tick);
      span.textContent = String(day);
      span.classList.remove("is-shuffling");
    }, lockAt);
  });

  const strikes = Array.from(wrap.querySelectorAll(".cal-strike"));
  const circle = wrap.querySelector(".cal-circle");

  const marksStart = maxLock + CAL_PAUSE_BEFORE_MARKS;
  strikes.forEach((mark, i) => {
    setTimeout(() => mark.classList.add("revealed"), marksStart + i * CAL_MARK_STAGGER);
  });

  if (circle) {
    const circleStart = marksStart + strikes.length * CAL_MARK_STAGGER + CAL_PAUSE_BEFORE_CIRCLE;
    setTimeout(() => circle.classList.add("revealed"), circleStart);
  }
}

function buildTier2Panel(panel, item) {
  if (item.image) {
    const frame = el("div", "tier2-frame");
    const img = el("img", "tier2-image");
    img.alt = item.label;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      if (img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.src = placeholderFor(item.image, "square");
      img.classList.add("is-placeholder");
    });
    img.src = item.image;
    Gallery.saw(item.image);
    frame.appendChild(img);
    panel.appendChild(frame);
  }

  if (item.widget === "calendar-may-1543") panel.appendChild(buildMayCalendar());

  const tokens = {};
  let body = item.conditionalText ? resolveConditional(item.conditionalText) : item.text;

  // The Scene 3 tally: a second, quieter use of player_name. Two entirely
  // different passages, not one passage with a name spliced in — a declined
  // carve gets its own paragraph about an abandoned mark, not a fallback
  // string, so there is no "a name" here the way there is in the endings.
  if (item.nameConditional) {
    const carved = (flags.player_name || "").trim();
    body = carved ? item.nameConditional.named : item.nameConditional.unnamed;
    if (carved) tokens.playerName = carved;
  }

  if (item.morse) tokens.morse = item.morse;
  if (body) prose(panel, body, tokens);

  if (item.interaction) renderInteraction(panel, item.interaction);
}

/* ─────────────────────────────────────────── scene 1: name interaction */

function renderInteraction(panel, spec) {
  const box = el("div", "interaction");

  const field = document.createElement("input");
  field.type = "text";
  field.id = "carve-input";
  field.maxLength = spec.maxLength;
  field.placeholder = spec.placeholder;
  field.autocomplete = "off";
  field.spellcheck = false;

  const carve = el("button", "choice interaction-btn", spec.submitLabel);
  carve.type = "button";
  const decline = el("button", "choice interaction-btn", spec.declineLabel);
  decline.type = "button";

  const row = el("div", "interaction-row");
  row.appendChild(field);
  row.appendChild(carve);

  box.appendChild(row);
  box.appendChild(decline);
  panel.appendChild(box);

  function resolve(value, responseText) {
    flags[spec.flagKey] = value;
    // Only a name actually carved sounds. Leaving the stone as you found it is
    // a decision too, and it is meant to cost nothing and make no noise.
    if (value) Sound.nameCarved();
    box.remove();
    const res = el("div", "response");
    if (value) {
      const carved = el("p", "carved-name");
      carved.textContent = value; // textContent only — no injection surface.
      res.appendChild(carved);
    }
    prose(res, responseText);
    panel.appendChild(res);
  }

  carve.addEventListener("click", () => {
    const name = field.value.trim();
    if (!name) return field.focus();
    resolve(name, spec.submitResponse);
  });

  field.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); carve.click(); }
  });

  decline.addEventListener("click", () => resolve(null, spec.declineResponse));
}

/* ────────────────────────────────────────────────── reactive sequencing */

function gateOpen(block) {
  return !block.requiresExamined || block.requiresExamined.every(id => examined.has(id));
}

function advanceReactive(scene, i) {
  const blocks = scene.reactive || [];
  if (i >= blocks.length) return renderExit(scene);

  const block = blocks[i];
  if (!gateOpen(block)) {
    runtime.skipped.push(i);          // remember it, in case the player examines later
    return advanceReactive(scene, i + 1); // gate failed — skip silently
  }

  renderChoices(block, choice => {
    flags[block.flagKey] = choice.value;
    runtime.answered++;
    if (choice.response) {
      const res = el("div", "response");
      prose(res, choice.response);
      appendBlock(res);
    }
    advanceReactive(scene, i + 1);
  });
}

// A player who examines the sundial before answering anything should still get
// the gated choice. Re-running the chain is only lossless while nothing has
// been answered yet, so that is the one case we do it in — otherwise the gate
// stays shut and the flag keeps its default, exactly as the design intends.
function reconsiderGates() {
  if (!runtime || runtime.answered > 0 || !runtime.skipped.length) return;

  const blocks = runtime.scene.reactive || [];
  const reopened = runtime.skipped.filter(i => gateOpen(blocks[i]));
  if (!reopened.length) return;

  const anchor = content.querySelector(".tier2");
  if (!anchor) return;
  clearReveals();            // the blocks about to be discarded may still be mid-beat
  content.classList.remove("choosing");
  while (anchor.nextSibling) anchor.nextSibling.remove();

  runtime.skipped = [];
  painting = true;
  advanceReactive(runtime.scene, 0);
  painting = false;
}

/* ──────────────────────────────────────── the held beat before a choice

   Options used to be painted with the scene and left sitting at the bottom of
   the scroll, so nothing happened at the moment the player finished reading —
   they scrolled into more page. A choice block is still built at paint time and
   still holds its final height (nothing below it ever shifts), but it is
   *veiled*, and it uncovers itself only once the player has scrolled to it: the
   bed goes out, a beat of nothing passes, then the prompt, then the options one
   at a time. An option is inert until its own fade has finished, which is what
   makes the pause a pause rather than a suggestion.

   The bed going out is the beat's sound — see sound design §1. It happens on
   arrival now, not on the answer, so every choice in the game is made in a room
   that has already gone quiet.
   ────────────────────────────────────────────────────────────────────────── */

const REVEAL_FADE_MS = 460;      // one item's own fade — must match the CSS
const REVEAL_BRANCH   = { hold: 900, prompt: 620, stagger: 680 };
const REVEAL_REACTIVE = { hold: 650, prompt: 340, stagger: 400 };
// The pause is a design intent, not decoration, so reduced motion keeps the
// held beat and gives up only the staggering.
const REVEAL_REDUCED  = { hold: 650, prompt: 200, stagger: 150 };

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Every observer and timer the scene's un-revealed choices still have pending.
// `reconsiderGates` throws away rendered blocks wholesale and a scene change
// throws away all of them, so both have to be able to cancel a reveal that is
// still counting down onto nodes that no longer exist.
const reveals = { observers: [], timers: [] };

function clearReveals() {
  reveals.observers.forEach(io => io.disconnect());
  reveals.timers.forEach(id => clearTimeout(id));
  reveals.observers = [];
  reveals.timers = [];
}

function revealTimer(fn, ms) {
  reveals.timers.push(setTimeout(fn, ms));
}

/* Watches one choice block against the scroll position and drives two separate
   things from it.

   The **reveal** happens once and never comes back: the options arrived, and
   that is a thing that happened. Re-running a 2.6-second arrival every time the
   player's scroll wobbles would read as a glitch — and the bed is halted by
   then, so a second arrival would look like the first and sound like nothing.

   The **hold** (the page dimming back behind the choice) is reversible, because
   scrolling up is a reading action. A player going back for a line they half
   remember wants that line at full strength, not held at reading-hostile
   opacity behind a question they are still thinking about. So the dim tracks
   where the player actually is, and lets go the moment they leave.

   Two thresholds, not one: a single line would strobe the dim on any small
   scroll sitting right at it. The block has to come up past REVEAL_LINE to take
   the page, and fall back past RELEASE_LINE to give it back.

   A plain rect check on scroll rather than an IntersectionObserver: there is
   only ever one live block at a time, so the cost is nothing, and an observer
   that quietly never fires would leave the options permanently invisible. This
   cannot fail that way.
   ────────────────────────────────────────────────────────────────────────── */

const REVEAL_LINE  = 0.62;   // block top crosses this (fraction of viewport) → it has the page
const RELEASE_LINE = 0.90;   // and has to fall back past this before it gives the page back

function watchChoice(node, onReveal) {
  let revealed = false;
  let holding = false;
  let live = true;

  function stop() {
    live = false;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  }

  function hold(on) {
    if (holding === on) return;
    holding = on;
    content.classList.toggle("choosing", on);
  }

  // Used by the reveal-on-focus path, where there is no scroll to measure.
  function take() {
    if (!live) return;
    if (!revealed) { revealed = true; onReveal(); }
    hold(true);
  }

  function check() {
    if (!live) return;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const top = node.getBoundingClientRect().top;
    if (top <= vh * REVEAL_LINE) take();
    else if (top > vh * RELEASE_LINE) hold(false);
    // Between the two lines: whatever it was doing, it keeps doing.
  }

  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; check(); });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  // A block can already be in view on a short scene, or after the page scrolled
  // itself to a block appended mid-chain.
  requestAnimationFrame(check);

  // clearReveals() speaks to this the same way it spoke to an observer.
  reveals.observers.push({ disconnect: stop });

  // Answering ends the watch and gives the page back for good.
  return { take: take, release: () => { stop(); hold(false); } };
}

function renderChoices(block, onPick, extraClass) {
  const wrap = el("div", "choices veiled" + (extraClass ? " " + extraClass : ""));
  const isBranch = /\bbranch\b/.test(extraClass || "");
  const beats = reducedMotion.matches
    ? REVEAL_REDUCED
    : (isBranch ? REVEAL_BRANCH : REVEAL_REACTIVE);
  const fade = reducedMotion.matches ? 0 : REVEAL_FADE_MS;

  let prompt = null;
  if (block.prompt) {
    prompt = el("p", "prompt veiled-item");
    prompt.innerHTML = block.prompt;
    wrap.appendChild(prompt);
  }

  let watch = null;   // set once the block is appended, below

  const buttons = [];
  block.options.forEach(opt => {
    const b = el("button", "choice veiled-item");
    b.type = "button";
    // Inert rather than `disabled`: a disabled button is not focusable, and a
    // keyboard player tabbing down the page has to be able to reach the block
    // to make it reveal itself at all.
    b.setAttribute("aria-disabled", "true");
    const mark = el("span", "choice-mark", "❖");
    const body = el("span", "choice-body");
    body.innerHTML = opt.label;
    b.appendChild(mark);
    b.appendChild(body);
    b.addEventListener("click", () => {
      if (b.getAttribute("aria-disabled") === "true") return;   // still in the beat
      // Freeze the answered block in place so the reading order stays intact.
      wrap.querySelectorAll("button").forEach(x => { x.disabled = true; });
      wrap.classList.add("resolved");
      b.classList.add("picked");
      // The page comes back up for good: what the player just answered with is
      // the thing to read now, not the options they didn't take.
      if (watch) watch.release();
      // Before onPick: a branch's own handler may start the next bed, and that
      // must not be the thing this call stops.
      Sound.choiceMade();
      onPick(opt);
    });
    buttons.push(b);
    wrap.appendChild(b);
  });

  // Runs exactly once — the watcher guarantees that. Dimming the page is the
  // watcher's job, not this one's: the arrival is permanent and the dim is not.
  function reveal() {
    Sound.choicesArriving(currentSceneId);   // the bed settles out into the beat
    wrap.classList.remove("veiled");

    // The end of the held beat, whether or not this block has a prompt to show
    // for it: the question is readable from here.
    let at = beats.hold;
    revealTimer(() => Sound.promptShown(currentSceneId), at);
    if (prompt) {
      revealTimer(() => prompt.classList.remove("veiled-item"), at);
      at += beats.prompt;
    }
    buttons.forEach((b, i) => {
      const t = at + i * beats.stagger;
      revealTimer(() => b.classList.remove("veiled-item"), t);
      revealTimer(() => b.setAttribute("aria-disabled", "false"), t + fade);
    });
  }

  appendBlock(wrap);
  watch = watchChoice(wrap, reveal);
  // Tabbed into before it was ever scrolled to — a keyboard player must be able
  // to reach the block and have it open, which is also why the options are
  // aria-disabled rather than disabled.
  wrap.addEventListener("focusin", () => watch.take());
}

/* ─────────────────────────────────────────────────────────── the plate */

// A full-bleed image with one line of text and nothing else, held until the
// player dismisses it. The only place the art is shown at full strength —
// backgrounds sit under a scrim and tier2 shots are thumbnails, so this is
// the game's one way to make an image the event rather than the setting.
// A plate is either "path/to.png" or { image, text }, where text is an array
// of paragraphs (or omitted — a silent plate is a legitimate beat, and often
// a stronger one).
function normalizePlate(spec) {
  return typeof spec === "string" ? { image: spec, text: null } : spec;
}

// `body.plate-open` alone (overflow: hidden) doesn't stop touch scrolling on
// iOS Safari — the page can still rubber-band under a fixed overlay. Pinning
// the body in place with a negative offset, then restoring the exact scrollY
// on the way out, is the standard workaround. Without it, a scroll gesture
// made while one plate is open could bleed into the position of the next.
let plateScrollY = 0;

function lockScrollForPlate() {
  plateScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${plateScrollY}px`;
  document.body.classList.add("plate-open");
}

function unlockScrollAfterPlate() {
  document.body.classList.remove("plate-open");
  document.body.style.top = "";
  window.scrollTo(0, plateScrollY);
}

// The plate currently on screen, or null. A plate is a fixed overlay outside
// `#scene-content`, so a scene repaint does not touch it and a language switch
// made while one is up would leave its caption in the old language behind the
// new furniture. `relocalizePlate()` rewrites it in place.
let livePlate = null;

function relocalizePlate() {
  if (!livePlate) return;
  const scene = SCENES.find(sc => sc.id === livePlate.sceneId);
  const raw = scene && (livePlate.slot === "closing" ? scene.closingPlate : scene.openingPlate);
  livePlate.hint.textContent = I18N.ui("continue");
  if (!raw) return;                       // a plate the other language has no copy of
  const spec = normalizePlate(raw);
  livePlate.caption.innerHTML = "";
  if (spec.text) prose(livePlate.caption, spec.text);
}

// `sceneId` is the scene the plate belongs to (the arriving scene for an
// opening plate, the departing one for a closing plate) — it names the plate's
// sting; see the STINGS table in audio.js. `slot` says which of the scene's two
// plates this is, so a language switch can find its counterpart again.
function renderPlate(rawSpec, onDone, sceneId, slot) {
  const spec = normalizePlate(rawSpec);
  const plate = el("div", "plate" + (spec.text ? "" : " silent"));
  plate.setAttribute("role", "button");
  plate.tabIndex = 0;

  const backdrop = el("div", "plate-backdrop");
  const figure = el("div", "plate-figure");

  const img = el("img");
  img.alt = "";
  img.addEventListener("error", () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = "1";
    const ph = placeholderFor(spec.image, "square");
    img.src = ph;
    backdrop.style.backgroundImage = `url("${ph}")`;
  });
  img.src = spec.image;
  Gallery.saw(spec.image);
  backdrop.style.backgroundImage = `url("${spec.image}")`;
  figure.appendChild(img);

  const caption = el("div", "plate-text");
  if (spec.text) prose(caption, spec.text);

  const hint = el("p", "plate-hint", I18N.ui("continue"));

  plate.appendChild(backdrop);
  plate.appendChild(figure);
  plate.appendChild(caption);
  plate.appendChild(hint);
  document.body.appendChild(plate);
  lockScrollForPlate();
  // A tall plate (long caption, or the side-by-side desktop layout) can be its
  // own scroll container — see .plate's overflow-y in the CSS. Whatever got
  // scrolled reading the *previous* plate must not carry into this one.
  plate.scrollTop = 0;

  void plate.offsetHeight;
  plate.classList.add("visible");
  plate.focus();
  Sound.plateOpened(sceneId);
  livePlate = { sceneId: sceneId, slot: slot || "opening", caption: caption, hint: hint };

  let done = false;
  function dismiss() {
    if (done) return;
    done = true;
    livePlate = null;
    Sound.plateClosed();      // the sting lifts with the plate
    plate.classList.remove("visible");
    unlockScrollAfterPlate();
    document.removeEventListener("keydown", onKey);
    setTimeout(() => { plate.remove(); onDone(); }, 500);
  }

  function onKey(e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  }

  plate.addEventListener("click", dismiss);
  document.addEventListener("keydown", onKey);
}

/* ───────────────────────────────────────────────────────── scene exit */

function appendClosingText(scene) {
  if (!scene.closingText) return;
  const res = el("div", "response closing");
  prose(res, scene.closingText);
  appendBlock(res);
}

function renderExit(scene) {
  if (scene.branch) {
    renderChoices(scene.branch, choice => {
      flags[scene.branch.flagKey] = choice.value;
      Sound.branchChosen(scene.id, choice.next);

      // A closing plate takes over the screen instead of appending another
      // paragraph to the page the player has been reading all scene.
      if (scene.closingPlate) {
        stopDrip();
        // Same reasoning as an opening plate: the destination's background is
        // put up behind the plate, not after it.
        setBackground(backgroundFor(choice.next));
        return renderPlate(scene.closingPlate, () => advanceTo(choice.next), scene.id, "closing");
      }

      // A branch option may carry its own prose, the same way a reactive
      // option does. Chapter I's two branches don't; Chapter II's Scene 4
      // does, and it reads as the consequence of the choice rather than as
      // the scene's closing line — so it lands before closingText.
      if (choice.response) {
        const res = el("div", "response");
        prose(res, choice.response);
        appendBlock(res);
      }

      appendClosingText(scene);
      renderContinue(() => advanceTo(choice.next));
    }, "branch" + (scene.branch.final ? " final" : ""));
  } else {
    // closingText is not branch-only. Chapter I happens to use it just once,
    // after a branch, but every Chapter II scene ends on a continuation beat
    // that follows its reactive block.
    appendClosingText(scene);
    renderContinue(() => advanceTo(scene.next));
  }
}

function renderContinue(onGo) {
  const wrap = el("div", "continue-wrap");
  const b = el("button", "continue", I18N.ui("continue"));
  b.type = "button";
  b.addEventListener("click", () => { b.disabled = true; onGo(); });
  wrap.appendChild(b);
  appendBlock(wrap);
}

// `opts.repaint` marks a re-render of the view already on screen (a language
// switch) rather than an arrival at a new one. It skips the opening plate:
// the plate is an arrival beat, and playing it again over a scene the player
// has been sitting in reads as the game restarting.
function advanceTo(id, opts) {
  const repaint = !!(opts && opts.repaint);
  currentSceneId = id;
  // Asked of the data rather than of the id's spelling: Chapter I's endings are
  // "ending-a", Chapter II's are "c2-ending-a", and a prefix test would send
  // the latter looking for a scene that does not exist.
  if (ENDINGS.some(e => e.id === id)) return renderEnding(id);

  // An opening plate lands before a word of the scene is on screen. Fade the
  // outgoing scene first so nothing of it is left behind the plate.
  const scene = SCENES.find(s => s.id === id);
  if (scene && scene.openingPlate && !repaint) {
    content.classList.add("fade-out");
    stopDrip();   // the outgoing scene's phrase ends with the outgoing scene
    // Swap the background now, while the plate hides it. Otherwise the plate
    // lifts onto the scene the player just left.
    setBackground(scene.background);
    return renderPlate(scene.openingPlate, () => renderScene(id), id, "opening");
  }

  renderScene(id);
}

/* ──────────────────────────────────────────────────────────── endings */

function lookup(block) {
  if (!block) return null;
  const row = block.table.find(r => block.keys.every(k => r.match[k] === flags[k]));
  if (!row) console.warn("Fallback fired:", block.keys, JSON.parse(JSON.stringify(flags)));
  return row ? row.text : (block.fallback || null);
}

function renderEnding(id) {
  const e = ENDINGS.find(x => x.id === id);
  if (!e) return console.error("Unknown ending:", id);

  const blocks = [
    e.baseOpening,
    lookup(e.conditionalMiddle),
    lookup(SHARED_CALLBACK),
    e.specificCallback
  ].filter(Boolean);

  fadeOut(() => {
    runtime = null;
    stopDrip();
    setBackground(e.background);
    Sound.endingStarted(id);
    document.body.classList.add("is-ending");

    const body = el("div", "narration ending-text");
    blocks.forEach(b => prose(body, b));
    appendClosing(body, e.closing);
    content.appendChild(body);

    const label = el("p", "ending-label", e.title);
    content.appendChild(label);

    // The ending does not offer to start over. It hands off to the wall, which
    // is the last thing the game says: this run counted what it counted, and
    // nothing is stored between loads, so that count exists here or nowhere.
    // "Begin again" waits over there.
    const wrap = el("div", "continue-wrap");
    const on = el("button", "continue", WALL.enter);
    on.type = "button";
    on.addEventListener("click", () => Gallery.open({ final: true }));
    wrap.appendChild(on);
    content.appendChild(wrap);
  });
}

// {player_name} is inserted as a text node, never as markup, and never renders
// as null/undefined/an empty gap.
function appendClosing(node, closing) {
  const name = (flags.player_name || "").trim() || I18N.ui("unnamedPlayer");
  String(closing).split(/\n{2,}/).forEach(part => {
    const p = document.createElement("p");
    const chunks = part.split("{player_name}");
    chunks.forEach((chunk, i) => {
      const span = document.createElement("span");
      span.innerHTML = chunk.replace(/\n/g, "<br>");
      p.appendChild(span);
      if (i < chunks.length - 1) {
        const n = el("span", "player-name");
        n.textContent = name;
        p.appendChild(n);
      }
    });
    node.appendChild(p);
  });
}

/* ───────────────────────────────────────────────────── language switch */

// The toggle is beside the sound button and live for the whole run, so this
// has to cost the player nothing. It does not reload: `I18N.setLang` swaps the
// pack and rewrites the URL in place, `relocalizeChapter()` re-points SCENES /
// ENDINGS / WALL / SHARED_CALLBACK at the same chapter's other language, and
// the view repaints from data that is now Chinese.
//
// Everything the run has earned is untouched, because none of it is language:
// `flags`, `examined`, the wall's `seen` count, which chapter is active, which
// scene is on screen. The one casualty is position *within* a scene — the
// reactive chain repaints from its first prompt, since `runtime.answered` is
// rebuilt with the scene. Answering again writes the same flag it already
// holds, so nothing downstream changes; it is a repeated question, not a lost
// one. Trading that for a reload that would lose the whole run is not close.
// Everything a view is about to paint, as one string, so the target language's
// font subsets can be fetched during the fade instead of after it. Cheap and
// approximate on purpose: it wants the glyph coverage, not the prose.
function visibleTextOf(id) {
  const ending = ENDINGS.find(e => e.id === id);
  if (ending) {
    return [ending.title, ending.baseOpening, lookup(ending.conditionalMiddle),
            lookup(SHARED_CALLBACK), ending.specificCallback, ending.closing]
      .filter(Boolean).join("");
  }
  const scene = SCENES.find(sc => sc.id === id);
  if (!scene) return "";
  const parts = [scene.title].concat(scene.text || []);
  (scene.tier2 || []).forEach(t => parts.push(t.label));
  (scene.reactive || []).forEach(r => {
    parts.push(r.prompt);
    (r.options || []).forEach(o => parts.push(o.label));
  });
  if (scene.branch) {
    parts.push(scene.branch.prompt);
    (scene.branch.options || []).forEach(o => parts.push(o.label));
  }
  return parts.filter(Boolean).join("");
}

function switchLanguage(target) {
  if (!I18N.setLang(target)) return;   // pack, URL and nothing yet visible
  relocalizeChapter();                 // SCENES/ENDINGS/WALL now the target's
  if (currentSceneId) I18N.warmText(visibleTextOf(currentSceneId));

  const playing = document.body.classList.contains("playing");

  // A plate is a fixed overlay that a scene repaint does not reach, and it is
  // the whole of what the player can see. Like the wall, it is rewritten in
  // place and the hooks flip with it; the scene repainting behind it is hidden.
  if (livePlate) {
    I18N.applyLang();
    relocalizePlate();
    if (playing && currentSceneId) advanceTo(currentSceneId, { repaint: true });
    return;
  }

  // The wall next, and before the `playing` test: it is an opaque overlay, so
  // whenever it is up it *is* the view — including over the title screen, which
  // is how `?all` opens it. It rebuilds synchronously, so the hooks flip now
  // and land with it. Anything repainting underneath straddles a fade in the
  // wrong face for 400ms, which nobody can see through the wall.
  if (Gallery.isOpen()) {
    I18N.applyLang();
    if (playing && currentSceneId) advanceTo(currentSceneId, { repaint: true });
    Gallery.relabel();
    return;
  }

  // The title screen is static markup that `applyLang` rewrites itself, so its
  // words and its face change together with no fade to straddle.
  if (!playing || !currentSceneId) return I18N.applyLang();

  // Otherwise the scene's own fade is the seam. Park the hook flip at its swap
  // point so the new words and the new face arrive on the same frame.
  onSwap = () => I18N.applyLang();
  advanceTo(currentSceneId, { repaint: true });
}

/* ──────────────────────────────────────────────────────── dev shortcut */
// ?debug=ending-a&looked_away=true&witness_reaction=reached
// ?debug=scene-4 also works. Strip or gate before release.
//
// ?all is the exception that stays: it opens the tally wall fully inked,
// straight from the title screen, without claiming any of it was witnessed.
// It is how the art gets shown to someone who is not here to play.

function applyDebug() {
  const q = new URLSearchParams(window.location.search);
  const target = q.get("debug");
  if (!target) return null;

  q.forEach((v, k) => {
    if (k === "debug") return;
    if (k === "examined") { v.split(",").forEach(x => examined.add(x.trim())); return; }
    if (!(k in flags)) return;
    flags[k] = v === "true" ? true : v === "false" ? false : v;
  });
  console.warn("DEBUG jump:", target, flags);
  return target;
}

/* ──────────────────────────────────────────────────────────────── boot */

function startGame(chapterKey) {
  document.body.classList.add("playing");
  const chapter = activateChapter(chapterKey || "i");
  const jump = applyDebug();
  advanceTo(jump || chapter.start);
}

window.addEventListener("DOMContentLoaded", () => {
  // Language first: Sound.init() labels the toggle, and the title screen has to
  // be rewritten before it is shown rather than after.
  I18N.resolve();
  I18N.applyLang();
  I18N.mountToggle(document.getElementById("lang-toggle"), switchLanguage);

  Sound.init();
  Sound.titleShown();
  const begin = document.getElementById("begin");
  const title = document.getElementById("title-screen");
  const skip = document.getElementById("skip-to-ii");
  const query = new URLSearchParams(window.location.search);

  const enter = key => {
    title.classList.add("gone");
    setTimeout(() => { title.hidden = true; startGame(key); }, 700);
  };

  begin.addEventListener("click", () => enter("i"));

  // The second door. It skips a chapter, and it is also the only place the
  // title screen admits there is more than one — which is the hint. Hovering it
  // sounds a single drip: Chapter II's whole bed is that sound, so the tease
  // tells the truth about what it opens without describing it. Once per hover,
  // not on every mousemove, and on keyboard focus too.
  if (skip) {
    skip.addEventListener("click", () => enter("ii"));
    skip.addEventListener("mouseenter", () => Sound.chapterTease());
    skip.addEventListener("focus", () => Sound.chapterTease());
  }

  if (query.has("all")) {
    // ?all is Chapter I's wall by default; ?all=ii opens Chapter II's.
    activateChapter(query.get("all") === "ii" ? "ii" : "i");
    Gallery.setRevealAll(true);
    Gallery.open();
    return;
  }
  // ?chapter=ii jumps straight in, and ?debug=c2-scene-7 implies Chapter II
  // without having to say so twice.
  const debugTarget = query.get("debug") || "";
  const wants = query.get("chapter") || (debugTarget.indexOf("c2-") === 0 ? "ii" : "i");
  if (query.has("debug") || query.has("chapter")) enter(wants);
});
