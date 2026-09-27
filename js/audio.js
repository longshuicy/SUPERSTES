// SUPERSTES — sound. Implements docs/superstes-sound-design.md.
//
// Audio is optional enhancement: the game is fully playable and coherent with
// sound off. It is on by default and the player can turn it off at any time.
//
// Browsers will not let a page make noise before the player has interacted
// with it, so "on by default" cannot mean "sounding on page load". It means:
// armed, and sounding at the first gesture. In practice that gesture is
// "Enter the fog", which happens before the first scene paints — so the bed
// comes up with Scene 1 and the player never sees the seam. If playback is
// refused anyway (a debug jump, a browser with a stricter policy), the next
// click or keypress anywhere on the page starts it. Sound never starts
// itself without a gesture, and it never asks.
//
// This file owns every filename under assets/sound/ and every decision about
// when a sound plays. main.js only reports what just happened (a scene
// started, a hotspot opened, a branch was answered) through the `Sound`
// facade at the bottom; it holds no audio state and no filenames.
//
// No narrative content lives in this file.

/* ────────────────────────────────────────────────────────────── state */

const AUDIO = {
  enabled: true,     // on by default; the toggle turns it off
  blocked: false,    // a play() was refused for want of a user gesture
  bedVolume: 0.35,
  duckVolume: 0.09,
  fxVolume: 0.5,
  // Permanent attenuation, earned once at the Scene 3 tally and never given
  // back. Multiplies every bed volume from that point on, this scene and all
  // the scenes after it.
  dim: 1,
  bed: null,        // the element currently sounding
  bedKey: null,     // which BEDS entry it is
  // True once a bed has been stopped on purpose — a choice, or one of the
  // moments that render into silence. Nothing brings it back but a new scene.
  halted: false
};

const BED_FADE_MS = 1200;     // a bed fading up at the top of a scene
const ENABLE_FADE_MS = 800;   // the toggle fades up rather than snapping
const CUT_MS = 350;           // clearing a bed out of the way of the next one
const CHOICE_FADE_MS = 600;   // settling out under an answered choice
const STING_FADE_MS = 300;    // a plate's sting going with the plate
const CUE_FADE_MS = 220;      // the prompt cue getting out of the answer's way
const SILENCE_FADE_MS = 500;  // the moments that render into silence
const RESUME_FADE_MS = 900;

/* ───────────────────────────────────────────────────────────── the map */

// One entry per scene/ending id. `rate` pitches and slows playback (Scene 6 is
// Scene 2's bed two semitones down); `loop: false` marks a bed that should end
// and not return.
// Chapter II's only bed, shared by all ten of its keys (see the block below).
// 11.9s, nine drip intervals cut seamlessly from the original recording by
// scripts/make_c2_drip_bed.py. WAV, not AAC: encoder padding would put a gap at
// the loop point -- the same exception bed-scene-5.wav takes.
const C2_DRIP = { src: "assets/sound/bed-c2-drip.wav" };

const BEDS = {
  "scene-1":  { src: "assets/sound/bed-scene-1.m4a" },
  "scene-2":  { src: "assets/sound/bed-scene-2.m4a" },
  "scene-3":  { src: "assets/sound/bed-scene-3.m4a" },
  "scene-4":  { src: "assets/sound/bed-scene-4.m4a" },
  "scene-5":  { src: "assets/sound/bed-scene-5.wav" },
  "scene-6":  { src: "assets/sound/bed-scene-2.m4a", rate: 0.89 },
  "scene-7":  { src: "assets/sound/bed-scene-7.m4a" },
  "ending-a": { src: "assets/sound/bed-ending-a.m4a", loop: false },
  "ending-b": { src: "assets/sound/bed-ending-b.m4a", loop: false },
  "ending-c": { src: "assets/sound/bed-ending-c.m4a", loop: false },

  // ── Chapter II ────────────────────────────────────────────────────────────
  // Chapter II has no music. Its bed is the water itself: one drip loop under
  // the entire chapter, scenes and endings alike. Every key below is the *same
  // spec object*, and bedElement pools by src, so all ten resolve to one
  // <audio> element -- playBed then takes its "same bed, just bring it back up"
  // path at every scene change and the drip never restarts. It runs unbroken
  // from Scene 1 to the tally wall — including under Scene 7's sting-less plate
  // (plateOpened only cuts a bed when the plate has a sting of its own).
  // Choice beats still halt it briefly, the same as Chapter I; "unbroken" means
  // it does not rewind or cut over between scenes, not that it never pauses.
  //
  // Unlike Chapter I's endings this does not stop at the ending (`loop` stays
  // true): there is no composed piece to end, and a drip that stopped dead
  // would read as a fault rather than a finish.
  "c2-scene-1": C2_DRIP,
  "c2-scene-2": C2_DRIP,
  "c2-scene-3": C2_DRIP,
  "c2-scene-4": C2_DRIP,
  "c2-scene-5": C2_DRIP,
  "c2-scene-6": C2_DRIP,
  "c2-scene-7": C2_DRIP,
  "c2-ending-a": C2_DRIP,
  "c2-ending-b": C2_DRIP,
  "c2-ending-c": C2_DRIP
};

// Plate stings. Each of these scenes has exactly one plate, so the scene id is
// enough to name the sting. A bare string is a one-shot at fxVolume that lifts
// with the plate on the usual STING_FADE_MS; an object overrides that.
//
// `loop` is for a sting that is a texture rather than an event — it has to
// still be there when a slow reader finally clicks, and going quiet under a
// held plate would be louder than the sound is. `fadeOut` lets that texture
// hand over to the scene's bed instead of getting out of its way.
const STINGS = {
  "scene-2": "assets/sound/plate-scene-2.m4a",   // opening plate, the jump
  "scene-4": "assets/sound/plate-scene-4.m4a",   // closing plate, water on stone
  "scene-5": "assets/sound/plate-scene-5.m4a",   // opening plate, wet and close
  // Opening plate, the monk's face too close. Air through glass: breath and
  // emptiness at once. It was already sounding before he knelt down, it does
  // not react to the question being read, and it does not end — it is replaced.
  "scene-7": {
    src: "assets/sound/plate-scene-7.m4a",
    loop: true,
    volume: 0.2,      // present, not announcing itself
    fadeOut: 1200     // hands over to bed-scene-7 rather than clearing out
  }

  // Chapter II has no plate sting. Its bed is one continuous drip loop and the
  // plate is not an exception to it -- see plateOpened, which now leaves the bed
  // alone when a plate has no sting of its own. A borrowed grandfather clock was
  // tried here and it was the only thing in the chapter that was not water.
};

function stingSpec(sceneId) {
  const s = STINGS[sceneId];
  if (!s) return null;
  return typeof s === "string" ? { src: s } : s;
}

// The only hotspots that make a sound: the same water-clock, three times,
// degrading. Keyed by tier2 item id (unique across scenes). `rate` scales
// every interval — under 1 is faster, over 1 slower. `drop` is a list of
// element indices where a drip should fall and doesn't.
const CLOCKS = {
  "water-clock-1": { rate: 1.0, repeat: 2 },        // patient, the phrase twice
  "water-clock":   { rate: 0.7 },                   // insistent, not hurried
  "water-clock-6": { rate: 1.4, drop: [6, 10, 15] }  // failing, gaps, then nothing
};

// Hotspots that stop the bed instead of sounding. Keyed by item id.
const FULL_STOP_HOTSPOTS = { tally: true };

/* The two interface cues: one marks the question arriving, one marks the answer
   going in. Both shipped as `.mp3` — a third extension in `assets/sound/`, see
   §7 — because they were delivered that way and are small enough that a
   re-encode would buy nothing.

   Well under `fxVolume`. These land inside a silence the rest of the design
   worked to earn, and a cue that has the room to itself does not need to be
   loud to be heard. */
const CUE_PROMPT  = "assets/sound/prompt-notification.mp3";
const CUE_CONFIRM = "assets/sound/confirmation.mp3";
const CUE_PROMPT_VOL  = 0.26;
const CUE_CONFIRM_VOL = 0.34;

const DRIP_SRC = "assets/sound/drip-single.wav";

// Morse, at a tempo you can actually count. Base intervals; each clock scales
// them by its own `rate`.
const MORSE = {
  dit: 200,
  dah: 600,
  element: 200,
  letter: 600,
  word: 1400,
  repeatGap: 2600
};

/* ─────────────────────────────────────────────────────────── plumbing */

// One Audio object per bed, reused. Creating them per playback leaks on
// mobile Safari, and these files are large.
const bedPool = new Map();
const fades = new WeakMap();

// Pooled by src + rate + loop rather than by key, so two keys naming the same
// file share one element. That is what lets Chapter II's ten keys be one
// continuous drip. Chapter I is unaffected: its only shared src is
// bed-scene-2.m4a, held by scene-2 and by scene-6 at rate 0.89, and the rate is
// part of the identity here so those stay two separate elements.
function bedElement(key) {
  const spec = BEDS[key];
  if (!spec) return null;
  const id = spec.src + "|" + (spec.rate || 1) + "|" + (spec.loop !== false);
  if (bedPool.has(id)) return bedPool.get(id);

  const el = new Audio();
  el.src = spec.src;
  el.loop = spec.loop !== false;
  el.preload = "none";       // beds are megabytes; nothing loads until asked
  el.volume = 0;
  if (spec.rate) {
    el.playbackRate = spec.rate;
    // Without this the browser pitch-corrects and the slow-down stops being a
    // pitch-down, which is the entire point of Scene 6's bed.
    el.preservesPitch = false;
    el.mozPreservesPitch = false;
    el.webkitPreservesPitch = false;
  }
  bedPool.set(id, el);
  return el;
}

function fadeTo(el, target, ms, cb) {
  if (!el) return cb && cb();
  clearInterval(fades.get(el));
  fades.delete(el);

  // A zero-length fade must land synchronously. Scheduled, it arrives a tick
  // late — long enough for a caller that stops a sound and immediately
  // restarts it (plateOpened does exactly that) to have the stale fade
  // silence the new playback.
  if (!(ms > 0)) {
    el.volume = Math.min(1, Math.max(0, target));
    if (cb) cb();
    return;
  }

  const from = el.volume;
  const steps = Math.max(1, Math.round(ms / 40));
  let i = 0;

  const timer = setInterval(() => {
    i++;
    const v = from + (target - from) * (i / steps);
    el.volume = Math.min(1, Math.max(0, v));
    if (i >= steps) {
      clearInterval(timer);
      fades.delete(el);
      if (cb) cb();
    }
  }, 40);

  fades.set(el, timer);
}

function bedTarget() {
  return AUDIO.bedVolume * AUDIO.dim;
}

// play() rejects if the gesture requirement hasn't been met yet. Swallow the
// rejection — silence is a supported state — but remember it, and try again
// on the first interaction of any kind.
function start(el) {
  const p = el.play();
  if (!p || !p.then) return;
  p.then(() => { AUDIO.blocked = false; })
   .catch(() => { AUDIO.blocked = true; armUnlock(); });
}

let unlockArmed = false;

function armUnlock() {
  if (unlockArmed) return;
  unlockArmed = true;

  const retry = () => {
    document.removeEventListener("pointerdown", retry, true);
    document.removeEventListener("keydown", retry, true);
    unlockArmed = false;
    // Only resurrect a bed that never got to start. A bed paused on purpose —
    // one of the three earned silences — stays paused.
    if (AUDIO.blocked && AUDIO.enabled && AUDIO.bedKey) {
      AUDIO.blocked = false;
      playBed(AUDIO.bedKey, ENABLE_FADE_MS);
    }
  };

  document.addEventListener("pointerdown", retry, true);
  document.addEventListener("keydown", retry, true);
}

/* ────────────────────────────────────────────────────────────── beds */

// Beds do not crossfade. By the time a scene changes the previous bed has
// almost always stopped already — it settles out under the choice that ended
// the scene (see haltBed) — so there is nothing to fade against. In the cases
// where one is still sounding (a scene whose only choice was gated away), it
// is cut first and the next bed starts after it, never over it. Two pieces of
// music overlapping was the awkward part; one at a time, or none, is the rule.
function playBed(key, fadeMs) {
  const spec = BEDS[key];
  AUDIO.bedKey = key;
  AUDIO.halted = false;              // a new bed is not a halted one
  if (!AUDIO.enabled || !spec) return;

  const next = bedElement(key);
  const prev = AUDIO.bed;

  if (prev === next) {               // same bed; just bring it back up
    if (prev.paused) start(prev);
    fadeTo(prev, bedTarget(), fadeMs != null ? fadeMs : BED_FADE_MS);
    return;
  }

  AUDIO.bed = next;                  // set now so a second call can't race this

  const begin = () => {
    if (AUDIO.bed !== next || !AUDIO.enabled) return;   // superseded while waiting
    next.preload = "auto";
    next.currentTime = 0;
    next.volume = 0;
    start(next);
    fadeTo(next, bedTarget(), fadeMs != null ? fadeMs : BED_FADE_MS);
  };

  if (prev && !prev.paused) {
    fadeTo(prev, 0, CUT_MS, () => prev.pause());
    setTimeout(begin, CUT_MS);
  } else {
    if (prev) prev.pause();
    begin();
  }
}

// A choice has been answered: the bed settles out and stays out. The response
// text arrives in silence, and the next scene starts its own bed from nothing.
function haltBed(ms) {
  AUDIO.halted = true;
  if (!AUDIO.enabled || !AUDIO.bed || AUDIO.bed.paused) return;
  const el = AUDIO.bed;
  fadeTo(el, 0, ms != null ? ms : CHOICE_FADE_MS, () => el.pause());
}

// Available for reactive blocks that carry a sound effect. Choices don't, so
// nothing in the shipped flow ducks — see sound design §1 and §6.
function duck(cb) {
  if (!AUDIO.enabled || !AUDIO.bed) return cb && cb();
  fadeTo(AUDIO.bed, AUDIO.duckVolume * AUDIO.dim, 300, cb);
}

function unduck() {
  if (!AUDIO.enabled || !AUDIO.bed) return;
  if (AUDIO.bed.paused) start(AUDIO.bed);
  fadeTo(AUDIO.bed, bedTarget(), 600);
}

// A full stop on render rather than on answer: the moment is silent while the
// player is still deciding, which is what separates these three from the
// ordinary stop every answered choice now produces.
// Note this does not set `halted`: the Scene 3 tally is specified to bring the
// bed back when the hotspot closes. Only an answered choice halts for good.
function silenceBed(cb, ms) {
  if (!AUDIO.enabled || !AUDIO.bed) return cb && cb();
  const el = AUDIO.bed;
  fadeTo(el, 0, ms != null ? ms : SILENCE_FADE_MS, () => { el.pause(); if (cb) cb(); });
}

function resumeBed(fadeMs) {
  if (!AUDIO.enabled || !AUDIO.bed || AUDIO.halted) return;
  if (AUDIO.bed.paused) start(AUDIO.bed);
  fadeTo(AUDIO.bed, bedTarget(), fadeMs != null ? fadeMs : RESUME_FADE_MS);
}

/* ─────────────────────────────────────────────────────── one-shots */

const fxPool = new Map();

function playFx(src, volume, loop) {
  if (!AUDIO.enabled || !src) return null;
  let el = fxPool.get(src);
  if (!el) { el = new Audio(src); fxPool.set(src, el); }
  // Elements are pooled and reused, so this has to be set every time rather
  // than once at construction — a looping sting and a one-shot could otherwise
  // inherit each other's setting.
  el.loop = !!loop;
  el.volume = volume != null ? volume : AUDIO.fxVolume;
  try { el.currentTime = 0; } catch (e) { /* not seekable yet; play from head */ }
  start(el);
  return el;
}

// A sting belongs to its plate and dies with it. The delivered files are much
// longer than the moments they mark — `plate-scene-5` is 87 seconds against a
// plate most players dismiss in five — so left to ring out they play straight
// over the next scene's bed, which is exactly the overlap this design is
// trying not to have. Faded rather than cut so the stop is not a click, and
// timed to be gone before the plate has finished lifting.
//
// A sting with its own `fadeOut` is the exception: it is meant to overlap the
// incoming bed rather than clear out ahead of it. `stingFadeOut` carries that
// figure from the spec to the stop, which happens later and elsewhere.
let sting = null;
let stingFadeOut = null;

function stopSting(ms) {
  if (!sting) return;
  const el = sting;
  const own = stingFadeOut;
  sting = null;
  stingFadeOut = null;
  if (ms == null && own != null) ms = own;
  fadeTo(el, 0, ms != null ? ms : STING_FADE_MS, () => el.pause());
}

// Whichever interface cue sounded last. The prompt cue outlasts its moment the
// same way a sting does — the delivered file runs four seconds against a stagger
// that finishes in under three, so a player who answers promptly would hear it
// still ringing under their own confirmation. Faded, not cut, so the stop is not
// a click.
//
// The confirmation is tracked here too, short as it is. Nothing this game starts
// is allowed to sound over the thing that comes after it, and an ending is
// exactly the boundary that rule exists for.
let cue = null;

function stopCue(ms) {
  if (!cue) return;
  const el = cue;
  cue = null;
  fadeTo(el, 0, ms != null ? ms : CUE_FADE_MS, () => el.pause());
}

/* ──────────────────────────────────────────── the low sustained note

   Scene 4's branch resolves into a single low note, and the sound design
   allocates no file for it — so it is synthesised. Two sines a fifth apart,
   slow attack, long release, and then the silence resumes. Costs no asset
   and no download. The context is created on the toggle press, which is
   already a user gesture, so it starts unsuspended.
   ──────────────────────────────────────────────────────────────────── */

let actx = null;

function audioContext() {
  if (actx) return actx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  actx = new Ctx();
  return actx;
}

function lowNote() {
  if (!AUDIO.enabled) return;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.6);
  gain.gain.setValueAtTime(0.16, now + 2.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
  gain.connect(ctx.destination);

  [55, 82.5].forEach((hz, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 1 : 0.35;
    osc.connect(g).connect(gain);
    osc.start(now);
    osc.stop(now + 5.6);
  });
}

/* ────────────────────────────────────────────────────── the morse drip

   One drip sample, three sequences. The written dot-dash in the hotspot and
   the rhythm under it are the same phrase, which is the whole reason this
   game has audio.

   A recorded drip cannot be stretched into a dash, so length is carried by
   the space after the strike rather than by the strike itself: a dah is one
   drip followed by a long wait, a dit one drip followed by a short one. Read
   as rhythm, which is how morse is read anyway.
   ──────────────────────────────────────────────────────────────────── */

// A small round-robin pool so a drip's reverb tail is not cut off by the next
// strike. Still reused elements, never new ones per playback.
const dripPool = [];
let dripIndex = 0;

function playDrip() {
  if (!dripPool.length) {
    for (let i = 0; i < 4; i++) dripPool.push(new Audio(DRIP_SRC));
  }
  const el = dripPool[dripIndex];
  dripIndex = (dripIndex + 1) % dripPool.length;
  el.volume = AUDIO.fxVolume;
  try { el.currentTime = 0; } catch (e) { /* still loading */ }
  start(el);
}

let morseTimer = null;
let morseRun = 0;

function stopMorseAudio() {
  morseRun++;
  clearTimeout(morseTimer);
  morseTimer = null;
}

function morseSequence(code) {
  const seq = [];
  const words = String(code).trim().split(" / ");
  words.forEach((word, wi) => {
    const letters = word.split(" ").filter(Boolean);
    letters.forEach((letter, li) => {
      letter.split("").forEach((sym, si) => {
        const lastOfLetter = si === letter.length - 1;
        const lastOfWord = lastOfLetter && li === letters.length - 1;
        const lastOfAll = lastOfWord && wi === words.length - 1;
        seq.push({
          hold: sym === "-" ? MORSE.dah : MORSE.dit,
          gap: lastOfAll ? MORSE.repeatGap
             : lastOfWord ? MORSE.word
             : lastOfLetter ? MORSE.letter
             : MORSE.element
        });
      });
    });
  });
  return seq;
}

function playMorseAudio(code, opts) {
  stopMorseAudio();
  if (!AUDIO.enabled || !code) return;

  const spec = opts || {};
  const rate = spec.rate || 1;
  const drop = spec.drop || [];
  const repeat = spec.repeat || 1;
  const seq = morseSequence(code);
  if (!seq.length) return;

  const run = morseRun;
  let i = 0;
  let pass = 0;

  (function step() {
    if (run !== morseRun) return;             // superseded or stopped
    const item = seq[i];
    if (drop.indexOf(i) === -1) playDrip();   // a silence keeps its beat

    i++;
    if (i >= seq.length) {
      i = 0;
      pass++;
      if (pass >= repeat) return;             // and then nothing
    }
    morseTimer = setTimeout(step, (item.hold + item.gap) * rate);
  })();
}

/* ────────────────────────────────────────────────────────── the toggle */

const SPEAKER_OFF =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z"/>' +
    '<path class="stroke" d="M16.5 9.5l4 5M20.5 9.5l-4 5"/>' +
  '</svg>';

const SPEAKER_ON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z"/>' +
    '<path class="stroke" d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.9a7.4 7.4 0 0 1 0 10.2"/>' +
  '</svg>';

let toggleBtn = null;

function updateSpeakerIcon() {
  if (!toggleBtn) return;
  toggleBtn.innerHTML = AUDIO.enabled ? SPEAKER_ON : SPEAKER_OFF;
  toggleBtn.setAttribute("aria-pressed", String(AUDIO.enabled));
  toggleBtn.setAttribute("aria-label", I18N.ui(AUDIO.enabled ? "soundOn" : "soundOff"));
  toggleBtn.classList.toggle("is-on", AUDIO.enabled);
}

function toggleSound() {
  AUDIO.enabled = !AUDIO.enabled;

  if (AUDIO.enabled) {
    audioContext();                    // created on the gesture, so it is live
    if (AUDIO.bedKey) playBed(AUDIO.bedKey, ENABLE_FADE_MS);
  } else {
    stopMorseAudio();
    const el = AUDIO.bed;
    fadeTo(el, 0, 400, () => { if (el) el.pause(); });
    fxPool.forEach(fx => fx.pause());
    dripPool.forEach(d => d.pause());
  }

  updateSpeakerIcon();
}

function initSound() {
  toggleBtn = document.getElementById("sound-toggle");
  if (!toggleBtn) return;
  toggleBtn.addEventListener("click", toggleSound);
  updateSpeakerIcon();
}

/* ───────────────────────────────────────────────── preload the next bed

   Mirrors the image preload in main.js: the bed one scene ahead is fetched
   during the current scene, so the crossfade has something to fade into.
   Nothing is fetched while sound is off.
   ──────────────────────────────────────────────────────────────────── */

function warmNext(sceneId) {
  if (!AUDIO.enabled) return;
  const scene = (typeof SCENES !== "undefined") && SCENES.find(s => s.id === sceneId);
  if (!scene) return;

  // Only a scene with one exit is warmed. A branch would mean fetching every
  // destination's bed at once, and at the sizes these files run to that costs
  // more than the crossfade it buys — the branch beds stream from the choice.
  if (scene.branch || !scene.next) return;

  const el = bedElement(scene.next);
  if (el && el.preload === "none") { el.preload = "auto"; el.load(); }
}

/* ──────────────────────────────────────────────────────────── facade

   Everything main.js is allowed to say. Each method is a statement about
   what just happened on screen; what it sounds like is decided here.
   ──────────────────────────────────────────────────────────────────── */

const Sound = {
  init: initSound,

  // The title screen, before the player has done anything. Borrows Scene 5's
  // bed rather than a file of its own: the same grandfather clock, already
  // counting before the game starts, not a different one. Same BEDS key, so
  // "Enter the fog" cuts it over to Scene 1's bed the normal way — one bed at
  // a time is the rule everywhere, and the title screen is not an exception.
  //
  // Almost always blocked at this point — the player has made no gesture
  // yet — and picked up by the same first-interaction retry as everything
  // else (see armUnlock). It only actually sounds for a player who lingers
  // or clicks the toggle before pressing "Enter the fog".
  titleShown() {
    playBed("scene-5", BED_FADE_MS);
  },

  // A scene's first paint. Brings up its bed, warms the next one.
  sceneStarted(id) {
    stopMorseAudio();
    stopCue(0);           // nothing from the last scene's choices survives here
    stopSting();          // belt and braces: nothing from a plate survives here
    playBed(id, AUDIO.bed ? BED_FADE_MS : ENABLE_FADE_MS);
    warmNext(id);
  },

  // An ending's first paint, and the only place an ending's bed begins.
  endingStarted(id) {
    stopMorseAudio();
    stopCue(0);           // the choice that got here does not sound over the ending
    stopSting();
    playBed(id);
  },

  // A plate is taking the screen. Cut the bed only when the plate brings its
  // own sting — Scene 2's has to land in silence, and Chapter I's other plates
  // all have stings too. A sting-less plate (Chapter II Scene 7) leaves the bed
  // alone so the drip keeps running under the held image rather than going
  // dead until dismiss.
  plateOpened(sceneId) {
    stopMorseAudio();
    stopCue(0);           // a plate's sting lands alone or it does not land
    stopSting(0);
    const spec = stingSpec(sceneId);
    if (!spec) return;
    if (AUDIO.bed && !AUDIO.bed.paused) silenceBed(null, 200);
    // No fade in, on any of them. A plate's sound arrives with its image or it
    // arrives late, and late reads as a reaction to the picture rather than a
    // condition of it.
    sting = playFx(spec.src, spec.volume, spec.loop);
    stingFadeOut = spec.fadeOut != null ? spec.fadeOut : null;
  },

  // The plate is being dismissed. Its sting goes with it — nothing a plate
  // started is allowed to carry into the scene behind it. A sting carrying its
  // own `fadeOut` still goes, only slowly enough that the scene's bed comes up
  // through it rather than after it.
  plateClosed() {
    stopSting();
  },

  // Examine hotspots are silent, except the water-clocks — and except the
  // Scene 3 tally, which is silent in the loud sense.
  hotspotOpened(sceneId, item) {
    if (!item) return;
    if (FULL_STOP_HOTSPOTS[item.id]) {
      // Set here rather than on close so that a player who reads their own
      // name and then leaves the panel open still loses the difference.
      AUDIO.dim = 0.6;
      return silenceBed();
    }
    const clock = CLOCKS[item.id];
    if (clock) playMorseAudio(item.morse, clock);
  },

  hotspotClosed(sceneId, item) {
    if (!item) return;
    if (FULL_STOP_HOTSPOTS[item.id]) {
      // The bed comes back quieter than it was, and is never given back the
      // difference — not in this scene and not in any scene after it.
      return resumeBed();
    }
    if (CLOCKS[item.id]) stopMorseAudio();
  },

  // A choice has arrived on screen and the page is holding a beat before it
  // uncovers the options. The bed settles out *into* that beat and stays out
  // until the next scene brings its own. This is the moment the music stops —
  // the player reads the options, and decides, in silence.
  choicesArriving(sceneId) {
    haltBed();
  },

  // The held beat is over and the question is now readable. Every choice in the
  // game announces itself, branches included — no exceptions, by design.
  promptShown(sceneId) {
    cue = playFx(CUE_PROMPT, CUE_PROMPT_VOL);
  },

  // A choice has been answered. The `haltBed` is a no-op on any bed that
  // reached its choice normally — the arrival already took it — and stays as
  // the backstop for the one path that skips an arrival: a scene whose only
  // reactive block was gated away still has to leave silence behind it.
  //
  // The confirmation is universal too. Scene 4 sounds it under its low note.
  choiceMade() {
    stopCue();
    haltBed();
    cue = playFx(CUE_CONFIRM, CUE_CONFIRM_VOL);
  },

  // A name has been carved into the gate. The same confirmation an answered
  // choice gets, because that is what this is — the one the player typed.
  // Declining carves nothing and sounds like nothing.
  nameCarved() {
    cue = playFx(CUE_CONFIRM, CUE_CONFIRM_VOL);
  },

  // The wall's secret plaque becoming readable, once the player has scrolled
  // to it — the same prompt-notification every choice in the game sounds as
  // its question arrives. Fires once per session, whether or not the player
  // ever answers it.
  secretPrompted() {
    cue = playFx(CUE_PROMPT, CUE_PROMPT_VOL);
  },

  // The wall's hidden phrase has landed — typed correctly, or simply asked
  // for. Both are an answer going in, so both get the same confirmation
  // every other answer gets. A wrong guess gets nothing: it isn't an answer.
  secretRevealed() {
    cue = playFx(CUE_CONFIRM, CUE_CONFIRM_VOL);
  },

  // One drip, for the Chapter II door on the title screen. Chapter II's whole
  // bed is this sound, so hovering the door hears the chapter it opens without
  // being told anything about it. Reuses the Morse sequencer's pool and sample.
  chapterTease() {
    if (!AUDIO.enabled) return;
    playDrip();
  },

  // A branch has been answered. Scene 4 answers with one low note.
  //
  // Scene 7 answers with nothing. The original spec had the ending's bed start
  // here, "under the last line" — but Scene 7's branch has no closing line for
  // it to start under. What actually follows the choice is a Continue button,
  // so the ending's music played over the scene the player had just finished,
  // for however long they took to press it. The ending's bed belongs to the
  // ending: it starts when the ending paints, like every other bed.
  branchChosen(sceneId, nextId) {
    if (sceneId === "scene-4") lowNote();
  }
};
