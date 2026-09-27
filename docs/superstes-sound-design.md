# SUPERSTES — Sound Design

Companion to `superstes-script.md` (narrative), `superstes-art-prompts.md` (art), and
`superstes-tech-design.md` (build).

Audio is optional enhancement. **The game must be fully playable and coherent with sound off.**
Nothing in the writing depends on hearing anything.

Sound is **on by default**, and the player can turn it off at any time. Browsers will not let a page
make noise before the player has interacted with it, so "on by default" means *armed*, not
*sounding on load* — see §2.

**Implemented in [`js/audio.js`](../js/audio.js).** That file owns every filename under
`assets/sound/` and every decision about when a sound plays; `js/main.js` only reports what happened
on screen. §12 documents that interface. Where this doc and the code disagree, fix one of them.

---

## 1. Bed behavior

**A bed plays while the player is reading, and stops when the choice arrives.** That is the whole
rule. The bed comes up with the scene, runs unducked under the prose and under every examine
hotspot, and settles out over 600ms the moment a choice block uncovers itself — *before* the options
are readable, not after they are answered. The player reads the options, and decides, in silence, and
the bed does not come back. The response text arrives in silence too, and so does whatever is left of
the scene. The next scene brings its own bed up from nothing.

*Revised again when the choices got their held beat.* The bed used to stop on the answer. The options
now reveal themselves only once the player has scrolled to them, after a beat of nothing (tech design
§7), and the bed going out is what that beat sounds like — otherwise the loudest cue in the game was
firing at a moment the player was not yet looking at. Moving it costs nothing: the silence still
belongs to the choice, it just starts at the question instead of the answer.

*Revised from the original spec, which ran the bed continuously and crossfaded between scenes.* In
play, two pieces of music overlapping at a scene change was the awkward moment — a crossfade that
reads as elegant in a spec reads as two tracks fighting when both are ambient and neither has a
clear downbeat. Stopping at the choice removes the problem at its source rather than tuning it:
**by the time a scene ends, the music that belonged to it has already gone**, so there is nothing
to fade against.

It also puts the silence where the game already puts its weight. Every choice in this game is a
commitment the narrator cannot take back, and the music stopping is the sound of that.

**The final choice is not an exception.** The original spec had the ending's bed start the moment
the player answered Scene 7's branch, "under the last line". There is no last line: Scene 7's branch
options carry no response text, so what actually follows the choice is a Continue button — and the
ending's music played over the scene the player had just finished, for as long as they took to press
it. Answering fast made it obvious, since you could be hearing an ending you had not reached. The
ending's bed belongs to the ending and starts when the ending paints, like every other bed in the
game.

**Beds never overlap.** If a bed is somehow still sounding at a scene change — a scene whose only
reactive block was gated away and never asked, so no choice was ever answered — it is cut over
350ms and the next bed starts *after* it, not across it.

**Choices are not silent moments any more.** The bed still goes out on arrival, but what fills the
gap is the interface: every choice in the game sounds `prompt-notification` as its question becomes
readable and `confirmation` as its answer goes in. **Universally — branches included.** There is no
scene, no block type and no branch that is exempt, and no table of exceptions to keep in sync.

*Revised from the version of this doc that made Scenes 4 and 7 render into silence.* That rule was
written when a choice had no cue of its own and silence was the only way to mark one. It is not
worth the special-casing now: a rule that holds everywhere is worth more here than a distinction two
scenes carried.

Two silences survive, and they are not about choices:

| Moment | Treatment |
|---|---|
| Scene 3, the tally hotspot | Total silence on open. Hold through the reveal. Bed returns only when the player closes the hotspot, at a lower volume than before, and that difference is never restored. Implemented as `AUDIO.dim = 0.6`, a multiplier on every bed volume from that point on, including later scenes and the endings. It is set when the hotspot **opens**, not when it closes, so a player who reads their own name and then walks away from the open panel still loses the difference. **If the scene's choice has already arrived the bed is halted for good and closing the tally brings nothing back** — the dim is still taken. |
| Scene 7, after the final choice | The confirmation sounds, and then nothing until the ending paints. The ending's bed starts with the **ending**, not with the choice that led to it — answering fast should not let you hear an ending you have not reached. |

Scene 4's branch keeps its single low sustained note on selection, now under the confirmation rather
than alone in the quiet. It is still the only choice in the game that answers back.

The name carved at the Scene 1 gate gets the confirmation too — it is an answer like any other.
Declining does not: leaving the stone as you found it is a decision that is meant to cost nothing and
make no noise.

Examine hotspots do not affect the bed at all. It continues unducked beneath the examine text, and
the Scene 3 tally is the only one that stops it.

**The tally is resumable; an answered choice is not.** Closing the tally hotspot brings the bed back
(quieter). Once a choice has been answered the bed is halted for good — `AUDIO.halted` — and closing
a hotspot afterwards does not resurrect it. Only a new scene clears the flag.

Timings: 600ms to settle out under an answered choice, 500ms for the full stops, 350ms to clear a
bed out of the way of the next one, 1200ms for a bed fading up at the top of a scene.

## 2. Toggle

Speaker icon, fixed position, top right, always visible including on plates, endings and the tally
wall.

- **On by default**, and the player can turn it off at any time.
- **On by default cannot mean sounding on page load.** Browsers refuse playback until the player has
  interacted with the page, so audio is *armed* at load and starts at the first gesture. In practice
  that gesture is **"Enter the fog"**, which happens before Scene 1 paints — so the bed comes up with
  the first scene and the player never sees the seam. If a `play()` is refused anyway (a `?debug=`
  jump, a stricter policy), `AUDIO.blocked` is set and the next click or keypress anywhere on the
  page starts the current scene's bed. A bed paused deliberately — one of the three earned silences —
  is never resurrected this way.
- Nothing starts itself without a gesture, and nothing prompts for one.
- Persist nothing. No localStorage anywhere in this build; refresh restarts everything, audio
  included, and audio comes back on.
- Icon states: `speaker-on` (default), `speaker-off`. Two inline SVGs, no icon library.
- Keyboard reachable, `aria-pressed`, `aria-label="Sound on/off"` — the only string audio owns, and
  the only thing here that localizes: it comes from `I18N.ui("soundOn"/"soundOff")`, not a literal.
  Nothing else in the score changes by language (see superstes-localization.md §5).
- Fade in over 800ms when enabled rather than snapping to full volume.
- **It has to outrank the tally wall.** The wall is a full-screen layer at `z-index: 80` and the
  player can sit on it for as long as they like with an ending's bed still sounding, so the toggle
  is `z-index: 85` — above the wall, below the wall's own lightbox (90), which any click dismisses.
  The wall's close button steps aside to `right: 4.8rem` rather than sharing the corner. If a new
  full-screen layer is ever added, it goes below 85 or the toggle goes above it; "always visible"
  is the rule, and a layer that covers it is a bug.

```js
const AUDIO = {
  enabled: true,      // on by default; the toggle turns it off
  blocked: false,     // a play() was refused for want of a user gesture
  bedVolume: 0.35,
  duckVolume: 0.09,
  fxVolume: 0.5,
  dim: 1,             // permanent attenuation earned at the Scene 3 tally
  bed: null,          // the element currently sounding
  bedKey: null,       // which scene/ending it belongs to
  halted: false       // stopped by an answered choice; only a new scene clears it
};

function toggleSound() {
  AUDIO.enabled = !AUDIO.enabled;
  if (AUDIO.enabled) { if (AUDIO.bedKey) playBed(AUDIO.bedKey, 800); }
  else { stopMorseAudio(); fadeTo(AUDIO.bed, 0, 400, () => AUDIO.bed && AUDIO.bed.pause()); }
  updateSpeakerIcon();
}

function duck(cb) {              // available; nothing in the shipped flow uses it (§6)
  if (!AUDIO.enabled || !AUDIO.bed) return cb && cb();
  fadeTo(AUDIO.bed, AUDIO.duckVolume * AUDIO.dim, 300, cb);
}
function unduck() {
  if (!AUDIO.enabled || !AUDIO.bed) return;
  if (AUDIO.bed.paused) AUDIO.bed.play();
  fadeTo(AUDIO.bed, AUDIO.bedVolume * AUDIO.dim, 600);
}
function silenceBed(cb, ms) {    // full stop on render; does NOT set halted
  if (!AUDIO.enabled || !AUDIO.bed) return cb && cb();
  fadeTo(AUDIO.bed, 0, ms != null ? ms : 500, () => { AUDIO.bed.pause(); cb && cb(); });
}
function haltBed(ms) {           // an answered choice; stays down until a new scene
  AUDIO.halted = true;
  if (!AUDIO.enabled || !AUDIO.bed || AUDIO.bed.paused) return;
  fadeTo(AUDIO.bed, 0, ms != null ? ms : 600, () => AUDIO.bed.pause());
}
```

`hardPauseAll` was dropped: with no ducking in the shipped flow it had nothing to switch between.
`AUDIO.dim` replaced it as the one global volume modifier, and it only ever moves in one direction.

---

## 3. Scene beds

One loop per scene. Aim for 60 to 120 seconds seamlessly looped; shorter loops become audible as
loops within a minute or two of reading. Full mood descriptions and filenames are in the asset
manifest (section 10). The three points below apply across all beds.

**Scene 3's bed should feel like Scene 2 with something wrong in it.** Not a different piece of
music — the same ambience, but one element that does not belong to the century. If using a library
track, layer a faint electrical hum underneath rather than finding a track that already contains one;
the contrast between the period atmosphere and the intrusion is the effect.

**Scene 7's bed should feel like Scene 4 with something building underneath.** Same principle: start
from the same source and add rather than replace.

**Scene 6 has no dedicated file.** It pitches Scene 2 down at runtime: `playbackRate = 0.89` with
`preservesPitch = false` (plus the `moz`/`webkit` spellings). Without that flag the browser
pitch-corrects and the slow-down stops being a pitch-down, which is the whole point.

**Ending beds do not loop.** The doc originally said this of Ending A only; it is true of all three.
B ends in a silence that a loop would step on, and C is held open rather than circular. All three are
`loop: false` in `BEDS`.

**The ending's bed carries into the tally wall, uncut and un-restarted.** The wall is where an ending
leads (script doc, *The Tally Wall*), and it opens as a layer over the same live page — so the bed
that was sounding keeps sounding, at the same volume, from wherever it had got to. This needs no
call site and has none: `Gallery.open()` touches nothing in `Sound`, which is exactly why it works.
Do not "fix" this by starting a bed for the wall, and do not loop the ending beds so the wall has
something under it. If the track runs out while the player is still reading the wall, that silence
is the one the ending earned — A is specified to end and not return, B to break off into a silence
that is not peace. The wall inherits that, deliberately.

**The title screen borrows Scene 5's bed.** Not a file of its own — `Sound.titleShown()` calls
`playBed("scene-5", …)` directly, the same `BEDS` entry Scene 5 uses later. The grandfather clock is
already ticking under the blurb, before the player has done anything, which is the point: the blurb's
closing line is "Something is already keeping count." Reusing the key rather than adding a new one
means "Enter the fog" hands off to Scene 1's bed exactly the way any two beds hand off elsewhere —
cut over `CUT_MS`, next bed starts after — with no special-casing at the call site.

Same autoplay constraint as everything else in §2: the title screen has had no gesture yet, so this
almost always starts blocked and is picked up by the ordinary first-interaction retry. In practice
that means most players never hear it — their first gesture is the "Enter the fog" click itself,
which the retry catches a beat before the click handler fires, so the clock has at most an instant
before Scene 1's bed cuts it over. It only really sounds for a player who lingers and interacts with
the page first — the sound toggle, a keypress — before pressing on.

### Chapter II's bed: one drip, the whole way through

**Chapter II has no music.** Its bed is the water itself — one drip loop running continuously from
Scene 1 to the tally wall. Nothing to source; nothing to compose.

That is not a placeholder for music that never arrived. Chapter I is scored because it is a
proceeding with a shape: rooms, a question, an instrument, an ending. Chapter II is seven ordinary
memories that only turn out to have been anything in the last scene, and a score would tell the
player they were important — which is the one thing the whole chapter is built to withhold (script
doc, *Two reveals*). A drip is the sound of nothing happening, which is exactly the register, and it
is the chapter's own motif: water is in every scene, and Scene 7 is where all of it pools.

| Asset | What |
|---|---|
| `bed-c2-drip.wav` | 11.9s, nine drip intervals at 1.323s, mono 16-bit 48kHz, ~1.1MB. Cut seamlessly from `drip.wav` by `scripts/make_c2_drip_bed.py`. |

**WAV, not AAC**, for the §7 reason: encoder padding would put a gap at the loop point. Same
exception `bed-scene-5.wav` and `drip-single.wav` take — `bed-c2-drip.wav` is the third WAV.

**It never restarts.** All ten `BEDS` keys (`c2-scene-1`…`c2-ending-c`) are the *same spec object*,
and `bedElement` pools by `src|rate|loop` rather than by key name, so all ten resolve to one `<audio>`
element. `playBed` then takes its "same bed, just bring it back up" path at every scene change instead
of cutting over. One unbroken loop for the chapter's whole 15–22 minutes. Choice beats still halt it
briefly (the same `haltBed` Chapter I uses) — "unbroken" means it does not rewind or cut over between
scenes, not that it never pauses. The universal prompt/confirm cues still fire; they are interface,
not score.

That pooling change is safe for Chapter I: its only shared `src` is `bed-scene-2.m4a`, held by
`scene-2` and by `scene-6` at `rate: 0.89`, and the rate is part of the pool identity — so those stay
two separate elements and Scene 6 still pitches down. Verified, along with the endings still being
`loop: false`.

**Chapter II's endings keep looping**, unlike Chapter I's. There is no composed piece to end, and a
drip stopping dead would read as a fault rather than a finish. The drip carries into the tally wall
the same way Chapter I's ending beds do — uncut and un-restarted, because `Gallery.open()` touches
nothing in `Sound`.

### The silence it does not make

**Scene 5's cut.** The script moves from a loud bar into an argument in a different year —
*Different place. Different year. No music.* With a single continuous bed there is no bar bed to stop,
so this is no longer an audio event at all; the line does its own work. Nothing to build.

### No plate sting

Chapter II's one plate has **no sting**. The drip keeps running straight through it.

A borrowed grandfather clock (`bed-scene-5.wav`, the one the title screen ticks under) was tried
here, on the reasoning that Chapter I opens on that clock and it could return under the one image
where the counting becomes visible. In practice it was the only sound in the chapter that was not
water, and it read as a bug rather than a callback. Removed.

This needed one change in `plateOpened`: it used to cut the bed *before* checking whether the plate
had a sting, so a sting-less plate produced dead air rather than a held image. It now leaves the bed
alone when there is no sting. Chapter I's four plates all have stings, so nothing there changes — and
Chapter I's Scene 2 plate still gets its hard cut into silence, because that silence comes from its
own sting arriving over a cut bed, not from this branch.

So Chapter II has exactly one *bed*, start to finish: the drip. The plate is not an exception to it.
(The prompt/confirm cues and the title-door `chapterTease` drip still fire; they are interface.)

Nothing above changes the `Sound` interface in §12 beyond documenting `chapterTease` and the
sting-gated `plateOpened` behaviour; these are still `BEDS` and plate-sting entries, not new call
sites for narrative moments.

---

## 4. Plate stings

Plates are held images. Each gets a **one-shot** over the bed, no loop.

**Keep stings near the length of the moment.** All three now run 4–7 seconds, which is about as
long as a plate is held. `plate-scene-5` was delivered at **87 seconds** and has been cut to 6
(see §10); nobody was ever going to sit on that plate for a minute and a half, and the tail did
nothing but wait for a chance to play over the next scene.

**A sting belongs to its plate and dies with it.** It is faded out over 300ms the moment the player
dismisses the plate, timed to be gone before the plate has finished lifting, and `sceneStarted`
stops any survivor as a second guard. Trimming the file is not a substitute for this: a player who
dismisses in two seconds should not hear the remaining four over the scene. Two plates back to back
(Scene 4's closing plate into Scene 5's opening one) cut rather than fade, so the two stings never
sound together either.

> A zero-length fade must land **synchronously**. `plateOpened` stops the outgoing sting and starts
> the next in the same breath, and the stings share one pooled element per file — so a stop
> scheduled even one tick late silences the playback that has already replaced it. `fadeTo` applies
> `ms <= 0` immediately for this reason.

| Plate | Effect | Search keywords |
|---|---|---|
| Scene 2 opening (`char-copernicus-bound`) | The jump. Sharp, dry, immediate. No musical stinger, nothing orchestral | `foot scrape stone`, `sudden breath sharp`, `impact dry short`, `chair creak wood` |
| Scene 4 closing (`char-copernicus-reveal`) | Water on stone, and a voice. Nothing else | `water pouring onto stone`, `liquid drip echo`, `whisper reverb distant` |
| Scene 5 opening (`char-player-hands`) | Wet, tacky, intimate. Recorded close, no reverb | `sticky wet fingers`, `skin friction close mic`, `viscous liquid slow` |

**Scene 2's plate should have no music at all under it.** Cut the bed on the transition from Scene 1,
let the sting land in silence, and bring Scene 2's bed up after the player advances. This mirrors the
visual note in the script that Scene 2's plate should hard-cut rather than fade.

The cut is a **200ms** fade rather than a true hard cut — a bed stopped dead mid-waveform clicks. At
200ms it reads as a cut and the sting still lands in silence. The sting fires immediately, under the
tail of the fade, rather than waiting for it.

The other two plates need no cut: both arrive after a branch has already stopped the bed (§1), so
`plateOpened` cuts only if something is actually sounding.

---

## 5. Hotspot effects

**Examine hotspots are silent, with one exception: the water-clocks.**

Giving every object its own sound turns examining into a soundboard and trains the player to click
for the noise rather than the writing. Silence on examine keeps the bed running uninterrupted
underneath the reading, which is where the atmosphere lives.

### The water-clocks (3 assets)

The same clock, three times, degrading. These carry the Morse, and hearing the rhythm match the
written dot-dash is the entire point of having audio in this game at all.

| Scene | Hotspot | Character | Keywords |
|---|---|---|---|
| 1 | Sundial | Patient, even, unhurried. The full phrase, twice through | `water drip single slow`, `drip reverb stone`, `dripping cave echo` |
| 3 | Second water-clock | Same phrase, **faster**. Insistent rather than hurried | `water drip fast`, `dripping urgent`, `drip echo quick` |
| 6 | Water-clock | **Slower, with gaps** where a drip should fall and doesn't. Stops mid-phrase and does not resume | `water drip sparse slow`, `drip final single`, `drip fading stop` |

**Build the Morse rhythm, don't search for it.** Take one clean single-drip sample and sequence it in
code or in an editor to the actual pattern:

- Scene 1: `··· ——— ·—·· / ··· — ·— —` (SOL STAT)
- Scene 3: `— · ·—· ·—· ·— / —— ——— ···— · —` (TERRA MOVET)
- Scene 6: `· ——· ——— / ·——· ·—· ·— · —·—· · —·· · —·` (EGO PRAECEDEN, cut off)

Timing: dit 200ms, dah 600ms, gap between elements 200ms, between letters 600ms, between words
1400ms. Scene 3 runs at roughly 0.7× those intervals. Scene 6 runs at 1.4× with two or three
additional dropped beats, then silence where the final `···` should be.

**Length is carried by the space after the strike, not by the strike itself.** A recorded drip cannot
be stretched into a dah — it is a transient with a decay, and time-stretching it stops it sounding
like water. So a dah is one drip followed by a long wait and a dit is one drip followed by a short
one. That is how morse is read anyway: as rhythm, not as duration of tone.

The sequencer lives in `playMorseAudio(code, opts)` in `audio.js` and takes its `code` straight from
the hotspot's own `morse` field in `scenes.js` — the written dot-dash and the rhythm under it are
necessarily the same phrase, because they are the same string. Per-scene options:

| Hotspot id | Scene | Options |
|---|---|---|
| `water-clock-1` | 1 | `{ rate: 1.0, repeat: 2 }` — the full phrase, twice through |
| `water-clock` | 3 | `{ rate: 0.7 }` — every interval shortened |
| `water-clock-6` | 6 | `{ rate: 1.4, drop: [6, 10, 15] }` — slower, three beats that keep their timing and make no sound |

A dropped beat holds its place in the sequence and plays nothing, so the gap falls where a drip
should have. The sequence simply ends after its last element; the missing final `···` needs no code.

Drips play from a four-element round-robin pool, so a drip's reverb tail is not cut off by the next
strike. Still reused elements, never a new `Audio` per playback.

The morse stops when the hotspot closes, when the scene changes, and when sound is switched off.

One sample, three sequences. Cheapest high-value audio in the project.

### Everything else

Silent. Scenes 1, 2, 4, 5, and 7 have no hotspot audio; Scenes 3 and 6 have only their clock. The bed
continues under all examine text, unducked.

**Two silences**, both costing no asset:

| Moment | Treatment |
|---|---|
| Scene 3, the tally | Full stop on open. Silence while the player reads their own name. Bed returns when the hotspot closes, at a slightly lower volume than before, and that difference is never restored. |
| Scene 6, the watcher | No change to the bed, but no sound either. It is the only hotspot in the game the player might expect something from and get nothing. |

## 6. Choice sounds

No sound *added* on choices — no click, no confirm tone, no hover state. But a choice is no longer
inaudible: **answering one stops the bed** (§1). The feedback is the room going quiet, plus the
response text arriving, and that is enough. Nothing is layered on top.

This is the one place the design changed after hearing it. The original rule was "the bed continues
unducked" through choices, with crossfades carrying the scene changes. Crossfading two ambient beds
turned out to be the weakest sound in the game, and stopping at the choice removes the need for one
entirely.

The three full-stop moments (Scene 3 tally, Scene 4 branch, Scene 7 branch) are specified in
section 1 and require no assets, only the absence of sound.

**One exception, and it is not a choice sound.** Scene 4's branch resolves into "a single low
sustained note" (§1), for which the manifest allocates no file. It is synthesised with WebAudio
instead of downloaded: two sines, 55Hz and 82.5Hz, 600ms attack, held, released over ~3.3s. Costs no
asset and no bytes. The `AudioContext` is created on a user gesture so it starts unsuspended.

---

## 7. Sourcing

| Source | Licence | Notes |
|---|---|---|
| **Freesound.org** | CC0 / CC-BY | Deepest library for field recordings. Filter to CC0 to avoid attribution admin. |
| **Pixabay Audio** | Pixabay licence | No attribution required. Weaker on odd textures, fine for drones. |
| **BBC Sound Effects** | Personal/educational | Excellent stone, water, interior room tones. Check terms before commercial release. |
| **Zapsplat** | Free with attribution | Broad, reliable, decent search. |
| Generative (Suno, ElevenLabs SFX) | Per-service | Fastest route for the 10 beds; check licence terms for game use. |

**Format as shipped:** **AAC in an MP4 container (`.m4a`)** — 96kbps for beds, 128kbps for the plate
stings — with three exceptions that stay uncompressed, below. AAC rather than MP3 because macOS
`afconvert` is the encoder here and cannot write MP3; support is universal in every browser this
game targets. Audio lazy-loads and never blocks the first scene render.

**The two interface cues ship as `.mp3`** — a third extension, and the only files here not produced
by the `afconvert` pipeline. They were delivered as MP3, they are 41KB and 129KB, and re-encoding
them to AAC would save nothing worth the generation loss. Do not assume one extension anywhere in
this directory; `js/audio.js` is the only place the filenames are written down.

Three files stay WAV on purpose:

- **`bed-scene-5.wav`** is a seamless tick loop, and every lossy codec adds encoder padding at the
  head and tail that a loop turns into an audible click. It is 16-bit stereo (down from 24-bit),
  3.1MB for 17 seconds. The lossy beds all have the same padding, but they are long enough that a
  player rarely reaches the loop point.
- **`drip-single.wav`** is 60KB and is fired dozens of times in a row with tight timing. Nothing to
  gain by compressing it, and decode latency to lose.
- **`bed-c2-drip.wav`** is Chapter II's continuous drip bed — an 11.9s seamless loop cut from
  `drip.wav` by `scripts/make_c2_drip_bed.py`. Same loop-gaplessness reason as `bed-scene-5.wav`.
  Built by that script, not by `optimize_audio.sh`.

**`plate-scene-7.m4a` looks like it should be a fourth exception and is not.** It loops, so the
`bed-scene-5` rule appears to apply — but that rule needs a loop whose head meets its tail, and this
recording fades to digital silence 1.15s before it ends. AAC's padding (measured at 64ms) lands
inside silence the recording already has. Checked, not assumed, and the check is the point: *does the
seam fall in sound or in silence* is the question, not *does it loop*.

**Size, and where it went:**

| | Original delivery | Shipped | Target |
|---|---|---|---|
| Beds | 3.6MB – 21MB each | 1.0MB – 6.0MB each | ≤1.5MB each |
| Effects | 60KB – 7.4MB | 56KB – 117KB | ≤50KB each |
| Total | ~127MB | **~31MB** | <8MB |

The effects are now within sight of their target; the beds are not, and they are the entire
remaining overage.

**Still over target, and the remaining gap is length, not bitrate.** The beds run 4 to 9 minutes;
§3 asks for 60–120 second seamless loops. `bed-scene-3` alone is 8.7 minutes and 6MB. Trimming each
bed to a ~120s loop would land the set near 9–13MB and, more importantly, cap what a player
downloads no matter how long they linger — a loop is fetched once and replayed, a nine-minute track
keeps pulling bytes. That trim is an editorial decision about the music and has deliberately not
been made.

**What a player actually downloads is not the total.** Browsers stream these with range requests, so
transfer is roughly *minutes listened × bitrate*: about 0.7MB per minute at 96kbps, so a 15–20
minute playthrough moves ~11–15MB, not 33MB. Nobody fetches the whole set. That was ~2.4MB/min and
36–48MB per playthrough before the re-encode.

**Originals** are kept, untouched, in `assets_sound_src/` at the repo root — 320kbps MP3 and 24-bit
WAV, git-ignored alongside `assets_backup/` and `assets_tint/`. Re-encode from there, never from the
shipped files. Re-encoding is a packaging step, not a code change: nothing in `audio.js` assumes a
bitrate or a container, only exact filenames.

**Trim aggressively.** Most Freesound uploads have a half second of silence at the head. On a
one-shot triggered by a click, that reads as lag.

---

## 8. Build notes

- **Autoplay is blocked** until a user gesture — so sound being *on* by default means armed, not
  sounding. Do not attempt to start audio on page load, and do not treat a refused `play()` as an
  error: catch it, set `AUDIO.blocked`, and start at the next interaction (§2).
- **Preload the current scene's bed and its hotspot effects only.** Preload the next scene's bed
  during the current scene, mirroring the image preload already specified in the tech doc.
  **Only scenes with a single exit are warmed.** Warming a branch would fetch every destination's
  bed at once — at Scene 7 that is all three ending beds, tens of megabytes, to use one. Branch
  destinations stream from the moment of choice instead. Warming matters less than it did under the
  original crossfade rule: a bed now starts from silence, so a few hundred ms of load reads as part
  of the pause rather than as a hole in a crossfade. Beds are created with `preload="none"` and
  promoted to `"auto"` only when warmed or played, so nothing is fetched while sound is off.
- **One `Audio` object per bed, reused.** Creating new `Audio` objects per playback leaks on mobile
  Safari.
- **Respect `prefers-reduced-motion`?** No. That flag is about motion, not audio. But do keep the
  toggle reachable at all times, including mid-plate.
- **Test with sound off first.** If any beat only works with audio, the beat is broken. Sound
  amplifies this game; it should never carry it.

---

## 9. Priority if time runs short

Cut from the bottom. The asset count is now small enough that all of this is achievable.

1. **The three full-silence moments** (Scene 3 tally, both branch points). No assets required, only
   the absence of sound. Highest impact per minute of work in the entire document.
2. **The three water-clock Morse sequences.** One drip sample, three sequences.
3. **Scene beds.** Nine loops, since Scene 6 is Scene 2 pitched down.
4. **The three plate stings.**

**Total shipped audio count: 17.** Nine Chapter I beds, one Chapter II drip bed, two drip files
(the source recording lives in `assets_sound_src/` only; the single-drip cut ships), four plate
stings, two interface cues. Everything else is sequencing, silence, or volume automation —
including Scene 4's low note, which is synthesised (§6).

---

## 10. Asset manifest

All files live under `assets/sound/`. **Filenames are referenced from `js/audio.js` only** — not
from `scenes.js` or `endings.js`, which stay narrative data. Sound is the one domain where the
mapping (which scene gets which bed, which plate gets which sting) is itself a sound decision, so it
lives with the rest of the sound logic in the `BEDS`, `STINGS` and `CLOCKS` tables. Keys in those
tables are scene ids and tier2 hotspot ids, so a renamed scene or hotspot must be renamed there too.

### Beds (10)

| Filename | Scene | Mood |
|---|---|---|
| `bed-scene-1.m4a` | Scene 1, The Gate | The feeling of arriving somewhere that has been waiting for you. Not threatening yet. Patient. The way an empty house feels inhabited even when no one is home. Something is counting in the dark and does not mind that you can hear it. |
| `bed-scene-2.m4a` | Scene 2, The Chapel (also Scene 6 pitched) | Many bodies in one room, all of them certain. The certainty is the unsettling part, not the cruelty. A weight of accumulated ritual, of a thing done so many times it has worn grooves in the air. You are the only person present who does not know the order of service. |
| `bed-scene-3.m4a` | Scene 3, What They Believed | Scene 2, but something in it is wrong. Not louder, not faster. The same room, the same ritual, except one instrument in the ensemble is playing something that does not belong to this century, and the longer you listen the harder it is to unhear. The wrongness hums. |
| `bed-scene-4.m4a` | Scene 4, He Sees Me | Almost nothing. The moment before a held breath breaks. One note, very low, that does not resolve and does not move. Whatever it is waiting for, it has been waiting for a long time, and it can wait longer. |
| `bed-scene-5.wav` | Scene 5, Waking; **also the title screen**, before the game starts (§3) | A grandfather clock ticking in an otherwise silent room. Nothing else. The tick should be dry and close, not distant or reverberant — the clock is in the room with you, and you cannot find it. Loops seamlessly so the ticking never stops. |
| `bed-scene-7.m4a` | Scene 7, The Choice | Scene 4 with something underneath it that was not there before. The same held breath, the same low note that will not resolve — but beneath it, something is building so slowly you cannot say when it started. It will not arrive before you have to decide. |
| `bed-ending-a.m4a` | Ending A, The Drained | Water running out of a room that is already empty. Not grief exactly — the sound after grief, when the feeling has finished and what remains is the absence of it. Does not loop; should end and not return. |
| `bed-ending-b.m4a` | Ending B, The Kept Hour | Something broken that is still trying. Ragged at the edges, interrupted, going wrong in small ways and then in larger ones. And then, without warning, complete silence, which is not peace. |
| `bed-ending-c.m4a` | Ending C, The Relay | The only ending permitted to sound like continuity rather than conclusion. Unresolved — not because it is sad, but because it has handed something to the next movement and that movement has not begun yet. Held open. |
| `bed-c2-drip.wav` | Chapter II, every scene and ending (§3) | One drip loop. No music. Cut seamlessly from `drip.wav` by `scripts/make_c2_drip_bed.py`. |

> **Scene 6 has no dedicated bed.** Load `bed-scene-2.m4a` and set `playbackRate = 0.89`
> (roughly two semitones down, also slowing it slightly, which suits the scene). If that sounds
> wrong, render a pitched offline copy and save it as `bed-scene-6.m4a`.

### Drip (2)

| Filename | Used in | Description |
|---|---|---|
| `drip.wav` | — (source only) | The delivered recording: 87 seconds of regularly spaced drips, 24-bit stereo, 25MB. Not shipped and not loaded — far too large to fetch for a 200ms strike, and a continuous take cannot be sequenced. It lives in `assets_sound_src/` with the other originals. |
| `drip-single.wav` | Scenes 1, 3, 6 water-clock hotspots | One clean drip cut from `drip.wav` at 21.245s, the most isolated strike in the take: 0.62s, mono, 16-bit, ~60KB, 2ms fade in and 100ms fade out, peak-normalised. This is the file the Morse sequencer plays. |

`drip-single.wav` is derived, not sourced — regenerate it from `drip.wav` rather than re-recording if
it ever needs to change. Keep it mono 16-bit: 24-bit WAV playback in `<audio>` is not reliable
everywhere, and the sample is short enough that the format costs nothing.

`bed-c2-drip.wav` is the other cut of the same master — see §3 and the Beds table above. Regenerate
it with `scripts/make_c2_drip_bed.py`, not by hand.

### Plates (4)

| Filename | Plate | Description | Search keywords |
|---|---|---|---|
| `plate-scene-2.m4a` | Scene 2 opening, `char-copernicus-bound` | **Piano Jump Scare Stinger** by TheSoundFXGuy_YT. Download from https://freesound.org/s/534218/ — License: Attribution 4.0. Credit must appear in the game's credits or attributions file. |
| `plate-scene-4.m4a` | Scene 4 closing, `char-copernicus-reveal` | Water on stone and nothing else | `water pouring onto stone`, `liquid drip echo`, `whisper reverb distant` |
| `plate-scene-5.m4a` | Scene 5 opening, `char-player-hands` | Wet, tacky, intimate. Recorded close, no reverb. **6.0s, cut from the 87-second source** at 46.75s — the point where the texture swells out of near-silence, peaks, and settles — with an 8ms fade in and a 1.2s fade out. Trimmed copy kept as `assets_sound_src/plate-scene-5-trimmed.wav` | `sticky wet fingers`, `skin friction close mic`, `viscous liquid slow` |
| `plate-scene-7.m4a` | Scene 7 opening, `plate-scene-7` | **Blowing into a small glass bottle - Low** by Wastefield. Download from https://freesound.org/s/692098/ — License: Creative Commons 0, no attribution required. 8.55s, mono. Not a drone but a single breath: 4s swell, 2.5s sustain around −20 dBFS, 1s decay, then 1.15s of digital silence. See the note below — this is the only plate sound that **loops**, and that shape is what looping it means. |

> **`plate-scene-7` is a presence, not an event, and it is the only plate sound that loops.** The
> other three are stings: they land with the image, mark it, and are gone. This one enters with the
> image at **0.2**, no fade in, does not react to the question being read, and is still there
> whenever the player finally clicks. The hollow resonance of air through glass reads as breath and
> emptiness at once, patient and without urgency. It was already sounding before the monk knelt down.
>
> It does not end; it is **replaced**. On advance it fades over **1200ms** while `bed-scene-7` comes
> up under it, so the two overlap rather than hand off — the only crossfade in the game, and it is
> between a plate and a bed rather than between two beds (beds still never cross, see §5). In
> `js/audio.js` this is a `STINGS` entry with `loop`, `volume` and `fadeOut` rather than a bare
> filename; the bare-string form still means "one-shot at `fxVolume`, gone on `STING_FADE_MS`".
>
> **What looping it actually sounds like, measured from the master.** The recording is not a steady
> drone. It is one breath: a 4-second swell up from −55 dBFS, about 2.5 seconds of sustain around
> −20, a 1-second decay, and then **1.15 seconds of digital silence** before the file ends. Its first
> and last samples are both zero, so there is no click at the seam — but looped raw, what the player
> hears is a breath every 8.55 seconds with a second of nothing between them, and each breath
> arriving as a crescendo.
>
> **That is a live editorial question, not a settled one.** "Breath and emptiness" is arguably exactly
> what that shape is, and the swell gives a held plate somewhere to go. But a crescendo that restarts
> every 8.5 seconds is a sound that *changes*, and a full second of silence between passes can read as
> the audio having stopped rather than having exhaled. The two fixes, if it comes to it, are: trim the
> dead tail in `assets_sound_src/` so the breaths cycle without dead air, or cut to the sustain
> (≈3.9–6.3s) and loop that for a flat presence. Both are trims to the master and a re-run of
> `scripts/optimize_audio.sh` — neither is a code change.
>
> **On the format: it loops and still ships as AAC, deliberately.** §7's rule is that a seamless loop
> stays WAV, because lossy encoders add padding a loop turns into an audible seam — the entire reason
> `bed-scene-5.wav` is a WAV. AAC does pad this file too, measured: encoded at 128kbps it reports
> **8.615s** in the browser against the master's **8.550s**, so 64ms is real. It is also inaudible
> here, because it lands inside the 1.15s of silence the recording already ends with. The rule needs a
> loop whose head meets its tail; this one does not have one, so it stays 117KB instead of 740KB.
> **If the tail is ever trimmed away, re-check this** — a trim that removes the silence is exactly
> what would make the padding audible, and then `plate-scene-7` belongs in `STING_LOOP`.

### Interface cues (2)

| Filename | Moment | Description |
|---|---|---|
| `prompt-notification.mp3` | The end of every choice's held beat, as the question becomes readable, and the tally wall's secret plaque uncovering | Marks the arrival of a question. Played at **0.26** — it lands in the gap the bed left, and does not need volume to be heard. 4.03s as delivered, against a stagger that finishes in under three, so it is faded out at 220ms whenever the answer, a plate, or a new scene arrives on top of it. |
| `confirmation.mp3` | Every choice answered, a name carved at the Scene 1 gate, and the tally wall's secret plaque | The answer going in. Played at **0.34**. 1.31s. On Scene 4's branch it sounds under the low note. Not played when the player declines to carve, or guesses the wall's phrase wrong: both are moments meant to cost nothing and make no noise. |

Neither file needs an attribution block; they are not credited assets. §11 and `ATTRIBUTIONS.txt`
stay as they are.

> `prompt-notification.mp3` is the longest cue in the game relative to the moment it marks. If it
> reads as ringing on rather than landing, trim it in `assets_sound_src/` and re-encode — do not edit
> the shipped file in place, and do not fix it by dropping the volume further.

### Full list in path order

```
assets/sound/                 assets_sound_src/     (git-ignored originals)
  bed-c2-drip.wav               drip.wav  (cut by scripts/make_c2_drip_bed.py)
  bed-ending-a.m4a              bed-ending-a.mp3
  bed-ending-b.m4a              bed-ending-b.mp3
  bed-ending-c.m4a              bed-ending-c.mp3
  bed-scene-1.m4a               bed-scene-1.mp3
  bed-scene-2.m4a               bed-scene-2.mp3
  bed-scene-3.m4a               bed-scene-3.mp3
  bed-scene-4.m4a               bed-scene-4.mp3
  bed-scene-5.wav   (16-bit)    bed-scene-5.wav   (24-bit)
  bed-scene-7.m4a               bed-scene-7.mp3
  confirmation.mp3              —  (delivered as shipped)
  drip-single.wav               drip.wav
  plate-scene-2.m4a             plate-scene-2.wav
  plate-scene-4.m4a             plate-scene-4.wav
  plate-scene-5.m4a             plate-scene-5.wav
  plate-scene-7.m4a             plate-scene-7.wav (Float32)
  prompt-notification.mp3       —  (delivered as shipped)
```

17 shipped files. **Mixed `.m4a`, `.wav` and `.mp3` — load each by its exact filename.** Do not
assume a single extension and do not derive one from the scene id; the three WAVs are WAVs and the two
cues are MP3s for the reasons in §7.
Alphabetical order matches Finder and most file browsers.

The re-encode is a script, not a command to retype:

```sh
./scripts/optimize_audio.sh
```

It is the audio counterpart to `scripts/optimize_images.sh` and keeps the same bargain: it always
encodes from the masters in `assets_sound_src/`, never from its own output, so re-running it does not
stack generational loss, and it never edits a shipped file in place. The rules it implements are the
ones above — beds to AAC 96k, stings to AAC 128k, `bed-scene-5` down to 16-bit WAV, looping stings to
16-bit WAV if listed in `STING_LOOP`. It skips the two delivered-as-shipped cues, `drip-single.wav`,
and `bed-c2-drip.wav` (cuts this script does not make, see §10). Masters that are Float32 are brought
down to 16-bit even when they stay WAV: 32-bit float playback in `<audio>` is not reliable across
browsers.

Underneath, it is these three `afconvert` calls, which ship with macOS and need no install:

```sh
afconvert -f m4af -d aac -b 96000  bed-scene-1.mp3   bed-scene-1.m4a     # beds
afconvert -f m4af -d aac -b 128000 plate-scene-2.wav plate-scene-2.m4a   # stings
afconvert -f WAVE -d LEI16         bed-scene-5.wav   bed-scene-5.wav     # 24- to 16-bit
```

---

## 11. Attributions

All assets below require credit. Add this block verbatim to the game's credits screen and to
`ATTRIBUTIONS.txt` in the project root before release.

---

"Piano Jump Scare Stinger"
TheSoundFXGuy_YT
https://freesound.org/s/534218/
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Blue Feather"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Canon in D for Two Renaissance Harps"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Waltz (Tschikovsky Op. 40)"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Virtutes Instrumenti"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Virtutes Vocis"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Mourning Song"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Toccata and Fugue in D Minor"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Agnus Dei X"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

---


"WATRPlmb_Kitchen-sink_tap_water_runs_in_bowl.wav"
DBS_Sounds
https://freesound.org/s/613664/
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/

"Slimy flesh"
iampagan
https://freesound.org/s/177017/
Licensed under Creative Commons 0
https://creativecommons.org/publicdomain/zero/1.0/

"grandfather-clockdown"
newagesoup
https://freesound.org/s/337163/
Licensed under Creative Commons 0
https://creativecommons.org/publicdomain/zero/1.0/

"Blowing into a small glass bottle - Low"
Wastefield
https://freesound.org/s/692098/
Licensed under Creative Commons 0
https://creativecommons.org/publicdomain/zero/1.0/

> Add further credits here as assets are locked. One block per asset, same format.
> The `ATTRIBUTIONS.txt` file should be copy-pasteable from this section without editing.

---

## 12. The `Sound` interface

`js/main.js` holds no audio state and no filenames. It reports what just happened on screen and
`js/audio.js` decides what that sounds like. Every method is a no-op when sound is off, apart from
bookkeeping that must survive being switched on mid-scene (which bed is current, and `AUDIO.dim`).

| Call | Made from | Does |
|---|---|---|
| `Sound.init()` | `DOMContentLoaded` | Wires the toggle button, paints its icon |
| `Sound.titleShown()` | `DOMContentLoaded`, right after `init` | Brings up Scene 5's bed under the title screen (see §3). Cut over the normal way when Scene 1's bed starts — no special-casing |
| `Sound.sceneStarted(id)` | `renderScene`, inside the fade | Brings that scene's bed up from silence (cutting any bed still sounding first, never across it), clears `halted`, warms the next bed, stops any morse |
| `Sound.endingStarted(id)` | `renderEnding` | Brings up the ending's bed, cutting any interface cue the final choice left ringing. The only place an ending's bed begins |
| `Sound.plateOpened(sceneId)` | `renderPlate`, once visible | If the plate has a sting, cuts a still-sounding bed over 200ms and starts that plate's sound — one-shot, or looping at its own volume if the `STINGS` entry says so. A sting-less plate (Chapter II Scene 7) leaves the bed alone |
| `Sound.plateClosed()` | `renderPlate`, on dismiss | Fades that sound out with the plate, so nothing a plate started carries into the scene behind it. A sting with its own `fadeOut` still goes, only slowly enough that the next bed comes up through it (Scene 7). No-op when the plate had no sting |
| `Sound.hotspotOpened(sceneId, item)` | tier2 accordion, on open | Water-clocks start their morse; the tally sets `AUDIO.dim` and stops the bed; everything else is silent |
| `Sound.hotspotClosed(sceneId, item)` | tier2 accordion, on close | Stops the morse; brings the bed back after the tally, quieter — unless a choice has since halted it |
| `Sound.choicesArriving(sceneId)` | `renderChoices`, when a choice block uncovers itself | Settles the bed out and halts it until the next scene. **This is where the music stops** |
| `Sound.promptShown(sceneId)` | `renderChoices`, at the end of the held beat | Sounds the prompt cue. Every choice, no exceptions |
| `Sound.choiceMade()` | `renderChoices`, on any pick | Stops any prompt cue still ringing, then the same halt as a backstop for the one path with no arrival (see below), then the confirmation. Every choice, no exceptions. Called **before** the pick's own handler, so a branch that starts the next bed (Scene 7) is not stopped by it |
| `Sound.nameCarved()` | the Scene 1 gate interaction, on a name actually carved | The confirmation. Declining sounds nothing |
| `Sound.secretPrompted()` | the tally wall's secret plaque, once, when the player scrolls (or tabs) to it | The prompt cue — the same one every in-scene choice sounds as its question arrives |
| `Sound.secretRevealed()` | the tally wall's secret plaque, on a matching guess or the ask-outright link | The confirmation. A wrong guess sounds nothing |
| `Sound.chapterTease()` | title-screen Chapter II door, on hover/focus | One drip from the Morse pool — Chapter II's whole bed in miniature |
| `Sound.branchChosen(sceneId, nextId)` | `renderExit`, on selection | Scene 4 sounds the low note. Scene 7 sounds nothing |

`sceneId` on a plate is the scene the plate **belongs to** — the arriving scene for an opening plate,
the departing one for a closing plate. That is what names the sting: Scene 4's closing plate is
`plate-scene-4.m4a` even though the game is on its way to Scene 5.

`Sound.choicesArriving()` and `Sound.choiceMade()` do the same thing, and in normal play only the
first of them does anything: by the time a choice is answered its arrival has already halted the bed.
`choiceMade` stays because one path reaches a scene's end without any choice ever arriving — a scene
whose only reactive block was gated away — and that path still has to leave silence behind it.
Neither uses the scene id it is given, and `choiceMade` takes no argument at all. Both apply to every
choice in the game, reactive blocks and branches alike. `sceneId` stays on `promptShown` for the same
reason the other methods carry it — a future cue that does vary by scene should not have to change
the call site to find out where it is.

`Sound.branchRendered()` is gone. It existed to fall silent on Scenes 4 and 7 before the choice; now
every choice does that, so it had nothing left to say.

Adding a sound to a moment that has none should mean adding a case inside `audio.js`, not a new call
site in `main.js`. If a new moment genuinely needs one, add a method here and in the table above.
