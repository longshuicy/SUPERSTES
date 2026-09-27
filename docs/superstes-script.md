# SUPERSTES
*(Latin: "witness" — literally "standing beyond," the one who outlived it and can still testify)*

A short narrative web game. First person, past tense. Black and white line illustration.
Tone: bizarre, anachronistic, sad, melancholic. Themes: time, destiny, witness vs. intervention.

**Companion docs:** `superstes-art-prompts.md` (image generation), `superstes-tech-design.md` (build spec),
`superstes-localization.md` (translations).
This doc is the single source of truth for narrative content. Where they disagree, this one wins.

**Translations.** The English below is the source text. A translation is a derived work and lives in
`content/<lang>/`, never here — see `superstes-localization.md`. A change to *wording* here needs no
translation work; a change to the *shape* of a scene (a new hotspot, a renamed flag, a reordered
choice list) invalidates every translation, and `scripts/build_content.py --check` will say so.

**Revision note.** This is v3. Scene count, every tier2 object, every reactive block, every flag key,
both branch points, and all three endings are **unchanged** from v2. Only prose changed. The art and
the build spec remain valid.

---

## THEME SUMMARY

The game is about **the loneliness of being correct too early, and the violence institutions do to
protect their own certainty.** But it is structured as a *mystery*, not a metaphor. The player should
leave every scene asking "wait, what does that mean?" rather than "I understand the symbolism."

### The mystery, stated plainly (for the writer, never for the player)

Copernicus did not discover heliocentrism. It was given to him, by a witness who came from ahead of
his time. That witness was given it too. The chapel is not punishing him for being right; it is
trying to find out **who told him**, because the institution knows the knowledge is arriving
backward through history and wants to find the source. The tally under the table is a roster of
everyone who has stood where the player is standing. The water-clock does not measure hours. It
measures witnesses.

The player is the next one. They have always been the next one.

### Dramatic function per scene

Each scene has one job. No scene explains the previous scene fully.

| Scene | Function | Question the player leaves with |
|---|---|---|
| 1. The Gate | Curiosity | Why does this place seem to be expecting me? |
| 2. The Chapel | Fascination, first wrongness | Who is he, and why won't they say his name either? |
| 3. What They Believed | Suspicion into dread | They aren't asking him to recant. What are they asking? |
| 4. He Sees Me | Revelation and horror | He didn't discover it. Who gave it to him? |
| 5. Waking | Personal dread | Why is it in me now? |
| 6. The Chapel, Again | Recognition | How many times has this happened? |
| 7. The Choice | Moral dilemma | Do I continue this, or does it end with me? |
| Endings | Consequence | (answered) |

### Threads
- **Witness vs. intervention.** The first half is powerless observation; the second half reveals that
  observation was never neutral. Watching is how the knowledge transmits. The witness *is* the vector.
- **Time as mechanism, not metaphor.** The clocks, the tally, and the anachronistic tools are not
  symbols of recurrence. They are the machinery of it, and the game should treat them as physical.
- **The apology that isn't his to make.** He says "I'm ahead of my time" as an apology, and by Scene 4
  the player learns it was never true. He was behind someone else's.
- **Identity as inheritance.** The name in the threshold, the water in the seam, the words handed back
  to the monks. Truth-telling is a role passed bodily, not intellectually.

### Historical grounding
- Copernicus delayed publishing *De revolutionibus* for over **30 years**. In this fiction, the delay
  is not caution. It is him refusing to pass it on.
- Tradition holds he received the **first printed copy on the day he died**. Scene 3's manuscript page
  is that copy, arriving in a room where he has not finished writing it.
- Printer Andreas Osiander added an **anonymous preface** framing heliocentrism as mere hypothesis,
  without permission. Someone softening his truth to protect it. Echoed in Scene 4, option B.
- Historically he was a **canon**, not a persecuted outsider, and no one drilled his skull. The monks
  are a personified Institution, not literal history. This is dream-logic, not biography.

---

## FLAG SYSTEM

```js
flags = {
  player_name: null,          // Scene 1, optional carved name, text input, max 20 chars
  gate_action: null,          // Scene 1, "called" | "silent" | "listened"
  identity_found: false,      // Scene 2, true only if player chooses to name him
  tally_reaction: null,       // Scene 3, "before" | "denial" | "refuse"
  tools_reaction: null,       // Scene 3, "denial" | "acceptance" | "silence"
  witness_reaction: null,     // Scene 4, "silent" | "reached" | "asked_why" | "absolved"
  looked_away: null,          // Scene 4 branch, true | false
  waking_reaction: null,      // Scene 5, "dream" | "mirror" | "understand"
  seen_reaction: null,        // Scene 6, "yes" | "no" | "sat_down"
  acknowledged_witness: null, // Scene 7, "held" | "avoided"
  final_choice: null          // Scene 7, "A" | "B" | "C", determines ending
}
```

**Which flags are consumed where.**

| Flag | Consumed by |
|---|---|
| `final_choice` | Routes to Ending A / B / C |
| `witness_reaction` | Ending A conditional middle |
| `tools_reaction` | Ending B conditional middle |
| `identity_found` | Ending C conditional middle |
| `seen_reaction` | Ending C conditional middle |
| `looked_away` | Scene 5 conditional line, Scene 6 tier2 hands, all three ending middles + witness callback |
| `acknowledged_witness` | Witness callback in all three endings |
| `player_name` | **Scene 3 tally (new in v3)** and the final line of all three endings |
| `gate_action` | **Local only.** Sets tone in Scene 1, never read again. |
| `tally_reaction` | **Local only.** Sets tone in Scene 3, never read again. |
| `waking_reaction` | **Local only.** Sets tone in Scene 5, never read again. |

> **Build change, v3.** `player_name` is now read **twice**: once in Scene 3's tally object, and once
> in the endings. This is the single most important payoff in the game and it uses machinery the tech
> doc already specifies. Same `{player_name}` token, same interpolation, same `a name` fallback. See
> the Scene 3 build note.

The three local-only flags are deliberate. They give the player agency in the moment without
multiplying ending permutations.

**Art style suffix:** maintained in `superstes-art-prompts.md`, the single source of truth for art
direction. Don't duplicate it here; it drifted once already.

---

## PLATES

Three scenes carry a **plate**: a held character image that renders alone, full screen, with its own
text and a single advance control. No examine hotspots, no choices, no scene furniture. The player
clicks once and moves on.

| Plate | Asset | Position | Job |
|---|---|---|---|
| Scene 2 opening | `char-copernicus-bound.webp` | Before Scene 2's text | The jump. First sight of him, unannounced. |
| Scene 4 closing | `char-copernicus-reveal.webp` | After Scene 4's branch resolves | Carries the "ahead of my time" line. |
| Scene 5 opening | `char-player-hands.webp` | Before Scene 5's text | The seam and the wet fingers, held in silence. |

**Why they exist.** These three moments are single images the player should sit inside rather than
read past. Putting them in the scene body means they arrive competing with hotspots and choices; as
plates they get the whole screen and nothing to click but *continue*.

**Build requirements.** A plate is a simplified scene: `background`, `text`, one advance control.
Scene 2 and Scene 5 render their plate *before* the scene, Scene 4 renders its plate *after* the
branch resolves, replacing the v2 `closingText` field. Suggested schema addition, minimal:

```js
{
  id: "scene-2",
  plate: { position: "before", image: "images/char-copernicus-bound.webp", text: [ /* paragraphs */ ] },
  background: "images/scene-2-chapel.webp",
  // ...rest unchanged
}
```

Scene 4 uses `position: "after"`, which supersedes `closingText`. No other scene has a plate.

**Pacing.** Plates want slower transitions than scenes. A longer fade in and out, and no hover
effects on the advance control. The Scene 2 plate in particular should land hard: consider having it
appear with no fade at all, cutting straight in from Scene 1's last line.

---

## SCENE 1: The Gate
*Function: curiosity. The place is expecting someone.*

**IMAGE:** `scene-1-gate.webp`

**TEXT:**
> I came to the gate the way one comes to a grave, without deciding to, and too late to turn back. The fog did not part for me. It had already been standing where I meant to walk.
>
> The gate was open. Not forced, not broken. Open the way a door is open when someone has gone to the trouble of opening it and then gone back inside to wait.
>
> Somewhere behind the stone, water was falling. Not the indifferent chatter of rain. Something metered. Something counted, and counted carefully, as if the dark were keeping a record it expected to be checked against later.

**TIER 2, examine the sundial:**
> A dial with no sun to read by, and yet its shadow falls anyway, and falls precisely, as though the hour it names has nothing to do with the sky.

**TIER 2, examine the water-clock behind the wall:** *(reuses `obj-water-clock`, per the art doc's
"reused in Scenes 1, 3"; kept as its own hotspot rather than folded into the sundial's, so the
image renders)*
> Beneath the wall the drip keeps its rhythm, patient, unhurried, the same figure over and over:
>
> `··· ——— ·—·· / ··· — ·— —`
>
> I did not know then that it was saying anything. I only knew it was not random, and that things which are not random are usually addressed to someone.

> **Build note, Morse fragment 1 of 3.** Decodes to **SOL STAT**, "the sun stands still." Three
> water-clocks in Scenes 1, 3, and 6 carry one sentence: **SOL STAT / TERRA MOVET / EGO PRAECEDENS.**
> Scene 6's clock is `obj-water-clock-2`, not a reuse — the same clock, failing, and its own image so
> the wear can show.
>
> Never translate it in-game and never acknowledge that it decodes. Render as selectable text so it
> can be copied into a decoder. Notation: interpunct `·` for dits, em-dash `—` for dahs, single space
> between letters, ` / ` between words.

**TIER 2, examine the gate's iron latch:**
> Cold under my palm, and wet, though nothing above it could have rained. My fingers came away with a film on them, thin as the skin on old milk.
>
> The wet was on the inside face of the latch. Whoever touched it last had been leaving, not arriving.

**TIER 2 / INTERACTION, the worn threshold letters:**
> Someone had carved letters here once. Time, or water, or both, had worn them back to suggestion.
>
> Not one name. Several, I thought, cut over each other at different depths, in different hands, across what must have been a great many years. The oldest were barely a roughness in the stone. The newest still had edges.
>
> Beneath them all, the stone was bare enough for another hand.

**INTERACTION, carve your name?** *(sets `player_name`, max 20 characters)*
- **A. [text input: carve your name, max 20 characters]** → *I pressed the word into stone the way you press a thumb into wet clay, not because it would last, but because for a moment it was mine to make last. It did not occur to me to wonder why the space had been left empty, or who had been leaving it empty, or for how long.* → `player_name: <input, truncated to 20 chars>`
- **B. "Leave the stone as you found it."** → *I let the letters stay half-erased. Whoever they had been, they had not been asked either.* → `player_name: null`

**REACTIVE, what do you do at the gate?** *(sets `gate_action`)*
- **A. "Call out."** → *No one answered, but the dripping stopped. Only for a moment, only for the length of a held breath, and then it resumed exactly where it had left off, as though it had been counting and did not intend to lose its place.* → `"called"`
- **B. "Step through in silence."** → *I entered the way guilt enters a room, sideways, already apologizing for a thing I hadn't done yet. Nothing challenged me. I have thought since that being unchallenged is not the same as being unexpected.* → `"silent"`
- **C. "Listen to the water a moment longer."** → *I counted the drips until I lost count. Somewhere past forty I understood that the pattern had repeated, and that I had heard the whole of it twice without learning anything, which is a particular kind of failure I would get better at.* → `"listened"`

→ Scene 2

---

## SCENE 2: The Chapel
*Function: fascination, first wrongness. Not "who is he" but "why won't anyone say?"*

**OPENING PLATE:** `char-copernicus-bound.webp`
*Held image. Renders alone, before the scene proper. Advance on click.*

> I had expected an empty room. I do not know why. Nothing about the night had promised me an empty room, and still, that was what I had prepared for.
>
> He was six feet from me and facing my way and I did not see him until I had already walked in.
>
> Rope at both wrists. Head up. Eyes open.
>
> I stopped so hard I heard my own foot scrape the stone, and not one person in that room turned around.

**IMAGE:** `scene-2-chapel.webp`

**TEXT:**
> He sat bound at the center of them, and the monks moved around his stillness the way tide moves around a stone. Patient. Certain. In no hurry to be cruel.
>
> His face troubled me before I understood why. A face I had seen pressed flat and yellowing in the margin of some lecture I had half-slept through. A name under a woodcut, a woodcut under a name, the two worn so far together I could no longer say which I remembered.
>
> They did not use his name. Not once, in all the time I stood there. They spoke *to* him constantly and *of* him never, the way you might avoid saying a word out loud in a house where saying it has consequences.
>
> He had not yet seen me. I was, as far as this room was concerned, only weather.

**TIER 2, examine the astrolabe at his neck:**
> Tarnished, still around his throat, as though no one had thought to take a compass from a man no longer going anywhere.
>
> Or as though it was not his to take. It was worn at the chain in two places, unevenly, the way a thing wears when it has hung on more than one neck.

**TIER 2, examine the star-chart under the chair:**
> Circles within circles, and at the center, not the earth. I had been taught it wrong, or he had been taught it early.
>
> The paper was old. Older than him, I thought, and then I put the thought down carefully, the way you put down something you have realized is hot.

**TIER 2, examine the confiscated books, spines to the wall:**
> They had turned every spine to face the stone, as if a title left visible might argue back.
>
> One volume had slipped enough to show a fragment of a diagram. The same circles. The same sun where the earth should be.
>
> The binding was three centuries older than the man in the chair.

**TIER 2, examine the monk murmuring a name, not his own:**
> A name, repeated like a rosary bead worn smooth. Not his.
>
> I assumed at first it was a saint's. Later I understood it was a question, phrased as a name, and that the monk was practicing it, the way one practices a difficult word before an examination.

**REACTIVE, do you try to name him?** *(sets `identity_found`. Only appears if BOTH the astrolabe and the star-chart have been examined. If the player skipped either, this never renders and `identity_found` stays `false`.)*
- **A. "Say his name to yourself, silently."** → *I said it once, in my head, the way you test a floorboard before trusting your weight to it. It held. And one of the monks, who could not possibly have heard me, stopped what he was doing and looked, for a moment, directly at the place where I was standing.* → `identity_found: true`
- **B. "Refuse to. Some part of me wasn't ready to know."** → *Better, I thought, to let him remain a face I half-recognized than a name I would have to carry out of this room. I did not yet know that the room had a use for names, and that mine was already in it.* → `identity_found: false`

> **Build note.** Two distinct routes reach `identity_found: false`: never examining the clues
> (passive), and finding them and declining (active refusal). Ending C's `false` rows accommodate
> both readings. No extra flag needed.

→ Scene 3

---

## SCENE 3: What They Believed
*Function: suspicion into dread. The scene where the mystery turns.*

**IMAGE:** `scene-3-tools.webp`

**TEXT:**
> The instruments were wrong before I could say how. Steel too smooth for any forge I knew. A faint hum in them like trapped bees, or captured lightning.
>
> A monk was speaking, low and unhurried, and I listened for the accusation I expected. That the earth does not move. That scripture is not a matter for arithmetic. That he had reached above his station and would now be assisted back down to it.
>
> He said none of it. He never once told the man in the chair that he was wrong.
>
> He asked him where he had gotten it.
>
> Again, and then again, with the patience of someone who has asked this many times before and expects to ask it many times more. Not *why do you believe this.* Not *will you recant.*
>
> **Who gave it to you.**

**TIER 2, examine the humming instrument:**
> A thin cold light lived inside it, the way a firefly holds its own small blasphemy.
>
> It was not sharpened. Nothing about it was made for cutting. It ended in a smooth blunt cup, and the cup was ringed with a fine grille, and the grille was where the humming came from.
>
> It was not built to open a man. It was built to listen to one.

**TIER 2, examine the dark glass surface among the tools:**
> Black glass, smooth as still water, holding no image at all, and yet I had the distinct sense it was capable of one, the way an unlit room is capable of a lamp.
>
> When the monk's hand passed near it, something beneath the surface moved. Not a reflection. A *response*.
>
> It was seated into the table. Not resting on it, not carried in and set down. Set into the wood, and the wood had swelled and darkened around its edges the way wood does after many years of holding something in place. Whatever this room was doing, it had not started doing it recently.

**TIER 2, examine the second water-clock, half-hidden:**
> Same brass, same crack along its base, same slow patient drip, as though the room kept a spare in case the first one ever told the truth too plainly. I could not tell, looking at them side by side, which had been built first. They agreed with each other too perfectly for the question to matter.
>
> But this one was faster. Not hurried. Insistent, the way a man repeats himself when he suspects he was not heard:
>
> `— · ·—· ·—· ·— / —— ——— ···— · —`

> **Build note, Morse fragment 2 of 3.** Decodes to **TERRA MOVET**, "the earth moves." The
> acceleration between Scenes 1 and 3 was already established in v2; this is consistent, not new.

**TIER 2, examine the tally scratched under the table:**
> Marks. Dozens of them, grouped in fives the way a prisoner counts days, except these were not days. They were names, or the ruins of names, each one struck through with the same single unhurried line.
>
> Some were cut deep and square, in a hand that had time. Others were scratched fast and shallow, as if by someone who expected to be interrupted. They ran the length of the board and around its edge and onto the underside of the leg, and they did not stop there, they only stopped being legible.
>
> I read the last one twice, and then a third time, and the third time did not help.
>
> **{player_name}**
>
> The cut was fresh. The dust was still in it.

> **Build note, the payoff.** This is the second and more important use of `player_name`, and the
> single strongest beat in the game. The name the player carved into the threshold in Scene 1, before
> they understood anything, is already on the roster of witnesses, struck through, twenty minutes
> before they learn what the roster is.
>
> Interpolation is identical to the endings: same `{player_name}` token, same `a name` fallback. If
> the player **declined** to carve, render this instead, which is quieter and arguably worse:
>
> > *The last one had been started and abandoned. A single stroke, no letters, the beginning of a
> > name by someone who had thought better of giving one. The dust was still in it.*
>
> Do not let the narrator react beyond what is written. No "how is this possible," no explanation.
> The player should recognize their own name a beat before the narrator does, and then the narrator
> should say nothing about it at all. Move to the next line.

**TIER 2, examine a folded, unsent letter tucked beneath the tools:**
> Addressed to no one. The hand that wrote it had crossed out more than it kept.
>
> *"I have kept this correct for thirty years,"* it read, in a script gone brittle at the folds. *"I no longer remember if I was protecting the world from it, or protecting it from the world. He did not tell me what it would cost to hold. I do not think he knew. I think he was only glad to set it down."*
>
> There was no signature. There did not need to be one.
>
> The paper was dated seventy years before the man in the chair was born, and it was unmistakably his handwriting.

**TIER 2, examine a single printed page, ink still faintly wet, half-hidden under cloth:**
> A page, freshly pressed, smelling of iron and oil the way new print does before it has had time to become old. Diagrams. Circles around circles, and at the center, not what the room believed.
>
> It was from his book. The book he had not finished. The book that would not be printed for years yet, that he would receive on the day he died, that no press in this country had yet been given a single page of.
>
> The ink was still wet.
>
> I reached for it. A monk's hand closed over mine before I could lift it clear, and not roughly, the way you would stop a dying man from reaching for water he has already had enough of.
>
> "Later," the monk said, in a tone that made it clear he meant never, said kindly.

**REACTIVE, how do you react to the tally?** *(sets `tally_reaction`. Only renders if the tally tier2 object was examined; otherwise skip to the tools reaction.)*
- **A. "This has happened before."** → *I said it the way you say a diagnosis you already suspected. Relief and dread arriving in the same breath. Before, and before that, and before that, and the marks did not begin at the top of the board. They only began where I could still read them.* → `"before"`
- **B. "This is only this room. It means nothing."** → *I told myself that. I have noticed that the things we tell ourselves most firmly are the ones we believe least.* → `"denial"`
- **C. "I don't want to know."** → *I let the cloth fall back over the ledger. Some doors close easier from the outside than the mind ever closes them from within.* → `"refuse"`

**REACTIVE, how do you react to the anachronism generally?** *(sets `tools_reaction`)*
- **A. "This is wrong. This shouldn't exist here."** → *I said it to no one, which was, I was beginning to learn, the only audience this dream kept for me. Wrong for this century, I meant. It did not occur to me until later that the tools might be exactly right, and the century wrong.* → `"denial"`
- **B. "Maybe time doesn't move the way I was told."** → *If he could be early, perhaps the room could be late. Perhaps things do not arrive in the order we are taught to expect, and perhaps some of them arrive going backward, and have to be carried the rest of the way by hand.* → `"acceptance"`
- **C. "Watch and say nothing. Some questions aren't for asking."** → *I had the sense that understanding it would not have stopped it. Only made me complicit a little sooner.* → `"silence"`

→ Scene 4

---

## SCENE 4: He Sees Me ★
*Function: revelation and horror. The scene the whole game is built around.*

**IMAGE:** `scene-4-reveal.webp`

**TEXT:**
> The instrument found its place against his temple, and the room exhaled the way a held breath does. Not with violence. With relief.
>
> When the skin gave, no blood came. Only water, clear as the water in the clock, running past his ear onto the stone in a small patient psalm. He did not cry out. He did not seem to be in pain at all, only tired, the way a man is tired after a debate he has already lost the crowd on, or a book he finished decades before anyone agreed to print it.
>
> The monks leaned in. Not to cut. To *catch* it. There was a basin, and it was not there to keep the floor clean.
>
> And then he looked at me.
>
> Not at them. At me. The one thing in the room that should not have been visible, and was.

**TIER 2, examine his eyes:**
> In the wet dark of them, for just a moment, I saw something reflected that was not candlelight. A face.
>
> Mine, I think, though I could not say afterward whether I had recognized it or only hoped I would.
>
> He was not surprised to see it there. That was the part I could not get past, later. He looked at me the way you look at a face you have been expecting for thirty years and have privately dreaded arriving.

**REACTIVE, what do you do?** *(sets `witness_reaction`)*
- **A. "Say nothing."** → *He seemed almost grateful for the silence, as if speech, even mine, would have been one more thing draining out of him. Then, quietly, not quite to me: "Good. The last one talked."* → `"silent"`
- **B. "Try to reach out. Touch his shoulder, though no one sees you."** → *My hand passed through him the way a hand passes through fog, and yet something in his face eased, as though he had felt weather change, if not a hand. "You did that last time as well," he said.* → `"reached"`
- **C. "Why didn't you fight them?"** → *"Fighting is for men who believe the argument is still open. Mine closed the day I was handed it." He said handed the way you would say a diagnosis. "And others have taken it upon themselves since to soften what I meant, to make it safer than I intended. I have grown used to my own truth arriving secondhand, wearing someone else's caution. It arrived that way to me."* → `"asked_why"`
- **D. "I'm sorry."** → *I did not know what I was apologizing for. It arrived before the reason did, the way an apology sometimes does when the body has understood something the mind has not been told yet.*
>
> *"No," he said, so gently it was almost absolution. "Not yours. It rarely is anyone's, and it is never the one holding it at the end. That is the part they never write in the histories."*
>
> *He held my eyes a moment longer than the sentence needed.*
>
> *"You will want to remember I said that."* → `"absolved"`

**BRANCH POINT 1** *(sets `looked_away`)*
- **"I looked away."** → `true`
- **"I kept watching."** → `false`

**CLOSING PLATE:** `char-copernicus-reveal.webp`
*Held image, rendered after the branch resolves. This text sits on the plate. Advance to Scene 5 on click.*

> They were still asking him. Even then, even with the basin filling and the water going over the stone, the same question in the same unhurried voice, over and over, and he would not answer it.
>
> He turned his head as far as the rope allowed. He looked at me while he said it, and I understood that the answer was not a name he was protecting.
>
> "I'm ahead of my time," he said.
>
> Not as excuse. Not as grievance. As apology.
>
> And I understood, too late, that he was not apologizing to them.

> **Writer's note.** The line lands differently now. In v2 it was a man explaining himself. Here it
> is a man lying to protect the person he is looking at, because the true answer to "who gave it to
> you" is standing in the room, and does not know it yet. He takes the question to the basin with him.
>
> Do not have him say anything clearer. This is the last time he speaks.

→ Scene 5

---

## SCENE 5: Waking
*Function: personal dread, and a failed attempt to dismiss it. The player checks, and the check confirms.*

**OPENING PLATE:** `char-player-hands.webp`
*Held image. Renders alone, before the scene proper. Advance on click.*

> I woke the way a candle wakes, not remembering it had ever been out.
>
> My hand had already found my temple before my mind caught up to it, the way a tongue finds a broken tooth before the pain arrives to explain it. There was a seam there. Not a scar. A seam, the kind a thing has when it was made in two pieces and someone forgot to finish the joining.
>
> And it was wet.
>
> Not bleeding-wet. Something slower than blood, that clung the way old glue clings, half-dried and unwilling to let go of either surface it was meant to join. I brought my fingers down where I could see them and held them there a while, in the dark, not doing anything about it.

**IMAGE:** `scene-5-waking.webp`

**TEXT:**
> So I did the sensible thing. I went looking for the date.
>
> This is what a reasonable person does, I think, after a dream that will not sit down. You find something ordinary and you hold it up against the dream and you watch the dream lose. I had done it before, after other nights. It had always worked.
>
> There was a calendar. I do not remember the room having one, but there it was, and it was open, and someone had been keeping it.
>
> **May. Fifteen forty-three.**
>
> The days behind me were crossed through, one by one, in a small careful hand that had not missed any. The days ahead were empty, except for one, which was circled.
>
> I looked at the circled date for a long time. It meant nothing to me. That is the part I would like understood: it meant nothing to me *then*, and I went on looking at it anyway, the way you go on pressing a bruise.
>
> On the desk beneath the window there were pages.
>
> Diagrams. Circles inside circles, and at the center of them the thing that had been at the center of his. Marginal notes in a cramped and hurrying hand. Corrections. A calculation begun three times and abandoned twice.
>
> It was my handwriting.
>
> I do not mean it resembled mine. I mean I recognized the way I make a seven, and the place where I lift the pen in the middle of a word because my hand cramps, and a small ugly habit in my letters that I have never liked and have never managed to stop.
>
> The last page stopped in the middle of a sentence, as though whoever was writing it had been interrupted, or had run out of the thing they were writing with, or had simply not yet got round to finishing.
>
> The ink was not dry.

**Conditional line (`looked_away`):**
- if `true`: *I had looked away from him. I had not wanted to see what came out. And here it was on my desk in my own hand, finishing itself without me, and I had not even had the decency to watch it arrive.*
- if `false`: *I had watched all of it and I had thought that was the whole of my part. Standing over those pages, I understood that watching had not been the observation. It had been the delivery.*

**TIER 2, examine the wetness itself:**
> It dried slightly at the edges of the seam, the way a puddle dries at its shore first, leaving a faint ring like the stain a glass leaves on wood. The center stayed wet no matter how long I waited.
>
> It was the same water. I want to be clear that I knew this immediately and without evidence, and that I have never since been able to explain how.

**TIER 2, examine your reflection in the dark window:**
> The glass gave back less a face than a suggestion of one, and for a moment the suggestion wore a collar I did not own, and a face older than mine by three centuries and several apologies.
>
> Then it was only me again. Or only tired, which in that light amounted to the same thing.
>
> The reflection had turned its head slightly before I did.

**TIER 2, examine the calendar:**
*No image asset. This hotspot renders an interactive HTML calendar. See the build spec below.*

> Someone had been keeping it. That was the part I kept returning to, more than the year. The crossings-out went back weeks and none had been missed, and the hand that made them had been steady at the start and was not steady now.
>
> One day ahead was circled. Only one. Not marked in the same ink as the crossings, and not, I thought, by the same hand.
>
> I counted the days between where the crossings stopped and where the circle was. It was not many. I counted them twice and got the same answer both times, and then I stopped counting things for a while.

> **Build spec, the calendar widget.** This is the only tier2 hotspot with no image. It renders a
> static HTML calendar for **May 1543**, styled to match the game.
>
> **Do not use `<input type="date">`.** Browsers nominally accept year 1543, but native picker UI is
> inconsistent across Safari and Firefox at that range, and the player can navigate away from the
> fixed month, which defeats the point. Render a plain static table. It is roughly thirty lines and
> behaves identically everywhere.
>
> **The month is Julian**, not Gregorian. The Gregorian reform is 1582, thirty-nine years after this
> scene, so a Gregorian grid would be an anachronism in a game whose entire subject is anachronism.
> The correct grid:
>
> ```
>              MAIUS · MDXLIII
>
>    S    M    T    W    T    F    S
>              1    2    3    4    5
>    6    7    8    9   10   11   12
>   13   14   15   16   17   18   19
>   20   21   22   23   24   25   26
>   27   28   29   30   31
> ```
>
> May 1 falls on a Tuesday and May 24 on a Thursday. Verified against Julian day number.
>
> **Rendering rules.**
> - Days 1 through 20 are struck through, hand-drawn feel, a slightly irregular line rather than CSS
>   `line-through`. The strikes should get looser toward the 20th.
> - **24 is circled.** Ink-drawn circle, not a border-radius box. It should read as drawn, not styled.
> - No month navigation. No arrows, no year field, nothing clickable except closing the hotspot. The
>   calendar shows one month and refuses to show any other, which is itself the horror.
> - No tooltip, no label, no hover state on the 24th. Never name the date's significance.
>
> **Why 24 May 1543.** It is the day Copernicus died. The game never says so. A player who looks it
> up gets the whole ending in advance; a player who doesn't simply feels the room counting down.
> Same principle as the Morse and the tally.
>
> **Optional, if cheap:** the gap between the last strike-through and the circle is four days. If the
> player revisits this hotspot after Scene 6, one more day could be struck. Nothing in the build
> requires it and it is fine to cut.

**REACTIVE, what's your first thought?** *(sets `waking_reaction`)*
- **A. "This is still the dream."** → *I said it out loud, to the calendar and the pages and the wet ink, in the tone you use on a dog that has got up on the furniture. Nothing in the room was persuaded. I held onto the thought anyway, the way one holds a coat too thin for the weather, out of habit rather than belief.* → `"dream"`
- **B. "I need to see my own eyes."** → *Not the pages. Not the date. My own eyes, because there had been something in his and I wanted to know whether it was in mine yet. There was no mirror in the room. I found this, somehow, less frightening than finding one would have been.* → `"mirror"`
- **C. "Finish the sentence."** → *I picked up the pen. I want to say that I fought it, and I did not. My hand knew where the sentence was going and finished it in a hand I recognized, and I read it afterward the way you read something a stranger has written, and it was correct, and I had not known it before I woke.* → `"understand"`

> **Writer's note.** The scene never states that anything was transferred into the player. It shows
> a calendar three hundred years wrong, pages in the player's own hand they did not write, and wet
> ink. The player assembles it. The old draft explained the mechanism outright in its final
> paragraph; that paragraph is gone and should not come back.
>
> The circled date is **24 May 1543**, the day Copernicus died. Never say this. Never let the
> narrator work it out. The date is legible in the fiction and meaningless to the character, which
> means a curious player can look it up and a passive player simply feels the room is counting down
> to something. Same principle as the Morse.
>
> Option C changed from "I understand now" to "Finish the sentence" so the beat is an *action*
> rather than a report of feeling, but the flag value is still `"understand"` and the build spec is
> unaffected.

→ Scene 6

---

## SCENE 6: The Chapel, Again
*Function: recognition. How many times has this happened?*

**IMAGE:** `scene-6-chapel-again.webp`

**TEXT:**
> The chapel had not moved, but I had. From the fog outside it to the chair at its center. The rope was old in the same place. The candle guttered at the same hour it always had, because it seemed this room did not keep time so much as repeat it, the way a copied page repeats an error until someone checks it against the original.
>
> The monks looked at me now. All of them at once, the way a held breath is finally released.
>
> One of them, the eldest I think, though the hood made ages hard to keep, tilted his head at me with something almost like recognition. Not the recognition of a stranger. The recognition of a man greeting a guest he has hosted so many times he has stopped bothering to relearn the name, only the shape of the visit.
>
> "Back again," he said, not unkindly, the way you would greet weather you had stopped being surprised by.
>
> And then, past his shoulder, where the candlelight gave up and the dark began, I saw someone standing. Still. Unclaimed by the room, the way I once had been.
>
> I could not see a face. Only the outline of someone watching the way one watches a thing they do not yet understand they will become responsible for. The monks did not turn to look at what I was looking at. Of course they didn't. I had not turned either, the first time.

**TIER 2, examine your own hands:**
*Image: `obj-hands-bound.webp`*
- if `looked_away == true`: *My hands were shaking the way his never had, as if he had spent his fear already and left me only the leftover of it.*
- if `looked_away == false`: *My hands were steady. I had rehearsed this without knowing it, every time I refused to look away from his.*

**TIER 2, examine the water-clock:** *(own image, `obj-water-clock-2.webp` — not a reuse of Scenes 1
and 3's `obj-water-clock`, since this is the same clock later, dry and failing)*
> Nearly dry, the basin beneath it dark with old use, and beside it, I now noticed, a second empty basin, drier still, as though it had finished this same errand some while before I arrived to start mine.
>
> What was left of it was still trying. Slower now, with long gaps where a drip should have fallen and didn't, the way a voice goes when there isn't breath enough left to finish:
>
> `· ——· ——— / ·——· ·—· ·— · —·—· · —·· · —·`
>
> Then nothing. Whatever it had been counting toward, it did not reach.

> **Build note, Morse fragment 3 of 3.** Decodes to **EGO PRAECEDEN**, cut short. The full word is
> **EGO PRAECEDENS**, "I am ahead of my time" — the same claim, almost word for word, as Ending A's
> closing line ("I'm ahead of my time," said to no one). The clock reaches for the thing the narrator
> will later say aloud and runs out one letter short of it. The final `···` never comes because the
> clock runs out. The sentence completes only in the player's head. The truncation is deliberate; do
> not add the missing letter.

**TIER 2, examine the watcher in the dark:**
> They did not move when I looked at them, which is its own kind of answer. I raised a hand, half a greeting, half a warning. I could not tell if they raised one back, or if I only wanted them to.
>
> I knew what they were waiting for. I had waited for it myself, in the same corner, wearing whatever face I had then, and I had not known I was waiting, and neither did they.

**REACTIVE, a monk speaks: "Do you understand why you're here?"** *(sets `seen_reaction`)*
- **A. "Yes. I always have."** → *"Then you understand," he said, "why understanding was never going to save you. We do not ask because we hope to be surprised. We ask because the asking is how it is kept moving."* → `"yes"`
- **B. "No, and I don't think you do either."** → *He did not answer that. I chose to take his silence as agreement, since he had given me nothing else to take. But he wrote something down, and he did not seem disappointed, and I have thought since that both answers were probably acceptable.* → `"no"`
- **C. Say nothing, only sit down in the chair yourself.** → *This, more than anything I could have said, seemed to satisfy them. I had given them the answer in advance without meaning to. One of them made a mark on the underside of the table. I did not need to see it to know what it was.* → `"sat_down"`

→ Scene 7

---

## SCENE 7: The Choice
*Function: moral dilemma. Does it continue, or end here?*

**IMAGE:** `scene-7-choice.webp`

**OPENING PLATE:** `plate-scene-7.webp`
*Held image. Renders alone, before the scene proper. Advance on click.*

> A monk knelt before me with the instrument that had opened him. Its cold light pulsed once, patient, unbothered by which century had summoned it.
>
> "Does it hurt to be ahead," he asked me, not unkindly, "or only to be alone in it?"
>
> And then, in the same even voice, the question he had asked the man in this chair a hundred times and never once been answered:
>
> "Who gave it to you?"

> **Writer's note.** These four paragraphs were the head of Scene 7's body text in v3. Moving them
> onto a held plate is not a reformat — it changes what the player is doing while they read them.
> On the page, the question arrived as one more paragraph in a scene they were already scrolling
> through, and the watcher, the rope, and the choice all crowded in behind it. Held, it is the only
> thing on screen, and the player has to click to leave it. The question gets its own beat, and
> everything after it is a response to a question already asked rather than a paragraph that happens
> to follow one.
>
> The plate is the monk's face cropped too close (see the art doc) — the player never sees who is
> asking, which is the same withholding the whole game runs on.

**TEXT:**
> Past his shoulder, they were still there. Closer now than in the chapel. Near enough that I understood, with the strange calm of a fact arriving too late to be useful, that they were not going to intervene. They had not come to save me. They had come the way you come to a bedside, not to change what is happening, only to make sure it is not unwitnessed.
>
> I found, oddly, that this was the closest thing to mercy the room had offered me all night.
>
> And I understood what he had been protecting, at the end, when he lied and called himself early. Not a name. A *person*. The one standing in the dark, who had not done it yet, who would not understand they had done it until they were sitting here being asked.

**TIER 2, examine the rope at your wrists:**
> Soft with age. The same rope, I was almost certain, that had held him. It had not been replaced. Perhaps it never needed to be.
>
> The fibers had gone shiny at two places, where wrists narrower than mine had worn them, and at two more where wrists wider had. I stopped counting the places. The rope had a longer memory than the room did.

**REACTIVE, do you acknowledge them?** *(sets `acknowledged_witness`)*
- **A. "Look at them and hold their gaze."** → *I did not look away, and neither did they. Some conversations do not need words to be complete, only two people willing to stay in the room for them. I thought: you will not understand this for a long time, and then you will understand it all at once, and I am sorry.* → `"held"`
- **B. "Don't look. Keep your eyes on the monk instead."** → *I kept my eyes forward. I told myself it was courage. I suspect now it was the same fear he must have felt, wearing a newer coat. If I did not look at them, perhaps they were not there. Perhaps no one had to be next.* → `"avoided"`

**FINAL BRANCH** *(sets `final_choice`, determines ending)*
- **A. "Let it happen. Say nothing, and let it end with me."** → Ending A: The Drained
- **B. "Refuse. Fight them, though I knew the rope would win."** → Ending B: The Kept Hour
- **C. "Say his words back to them: 'I'm ahead of my time.'"** → Ending C: The Relay

> **Writer's note on the three choices.** All three are now answers to *"who gave it to you."*
>
> **A** is silence: the answer dies with him, the chain may break, and he will never know if it did.
> **B** is refusal: not of the monks, but of the whole arrangement, including his own part in it.
> **C** is the lie he was told, repeated: the same protective falsehood, passed on, which keeps the
> witness safe and the cycle intact. It is the kindest and the worst.

---

## ENDINGS

**Assembly spec.** Each ending renders as one continuous screen, assembled in this order. No headers,
no visible seams. The player should read one passage, not a stitched lookup result.

1. **Base opening** (always, fixed per ending)
2. **Conditional middle** (one row from that ending's table, or fallback)
3. **Witness callback** (one row from the shared 4-row table)
4. **Manuscript callback** (Ending C only)
5. **Closing** (always, fixed per ending, `{player_name}` interpolated)

**`{player_name}` interpolation.** If carved, substitute directly. If declined, or empty or
whitespace-only, substitute the literal words **`a name`**. Never render `null`, `undefined`, or a
gap. This is the last line of the game and the second payoff of a Scene 1 decision.

---

### Ending A: The Drained
**IMAGE:** `ending-a.webp`

**Base opening (always):**
> I said nothing.
>
> Not out of courage. I want to be honest about that. I had simply understood, somewhere between the chapel and the chair, that the answer they wanted was standing in the dark behind them, and that giving it would only move the marks on the table one line further down.
>
> There is a particular quiet in choosing your own ending. Not peace exactly, but its patient cousin.

**Conditional middle, by `witness_reaction` + `looked_away`:**

| witness_reaction | looked_away | Flavor |
|---|---|---|
| reached | false | I thought, as the water began, of the hand I had tried to press through him. *You did that last time as well,* he had said, and I had not understood. I understood now. I had been trying to reach him for longer than either of us had been counting, and I had never once managed it, and I had never once stopped. |
| silent | true | *Good,* he had said. *The last one talked.* I had not talked then and I did not talk now, and I looked away from him besides, and it seems only fitting that no one had anything to say to me either. I had asked for this quiet. I could not now complain that it was quiet. |
| asked_why | false | I had asked him why he did not fight, and watched him answer with his whole tired face. *Mine closed the day I was handed it.* I understood, sitting where he had sat, that I was not going to fight either, and that the reason was the same, and that neither of us had chosen the moment the argument closed. |
| absolved | true | I said sorry to him without knowing what for, and he told me it was not mine, and then I looked away before I could watch him pay for it anyway. *You will want to remember I said that.* I have remembered. It has not done what he intended. A man can hand you an absolution and still be wrong about who needed one. |
| reached | true | I had tried to reach him, then looked away before I could learn whether it mattered. I will never know now. That, I think, was the sentence I was actually serving. |
| asked_why | true | I had wanted his reasons and then looked away from what the reasons cost him. Understanding, it turns out, is not the same as staying. |
| silent | false | I said nothing to him, but I stayed, and I watched all of it. I used to think silence was the coward's version of presence. Sitting here now I am less sure. He never asked me to speak. He only needed someone in the room while it happened, and I managed that much. |
| absolved | false | I said sorry to him before I knew why, and he refused it, and I watched the whole cost of his refusing without looking away. *Not yours,* he said. *It is never the one holding it at the end.* He was telling me about himself and I heard it as kindness. Sitting here now, holding it at the end, I understand he was telling me about me. |

**Fallback:** I thought of him, and of the water, and of the apology he had offered a room that had not asked for one. It was never about being right. It was only about being handed something early and being made to carry it alone.

*(All 8 combinations covered. Fallback is a null-flag guard and should never fire.)*

**WITNESS CALLBACK, by `looked_away` + `acknowledged_witness`.** *(Shared block, rendered verbatim in all three endings, immediately after the conditional middle. All 4 combinations covered, no fallback.)*

| looked_away | acknowledged_witness | Flavor |
|---|---|---|
| true | held | I looked away from him once. I did not look away from them. Perhaps that was the only debt I managed to repay in either direction. |
| false | avoided | I watched him fully, and could not offer the same to whoever was watching me. I understand now what that must have cost him to forgive, and I notice he forgave it without being asked. |
| true | avoided | I looked away from him, and looked away from them in turn. Some patterns do not break simply because you have lived both halves of them. |
| false | held | I watched him fully, and let myself be watched fully in return. If this is a relay, at least I ran my leg of it with my eyes open. |

**Closing (always):**
> "I'm ahead of my time," I said to no one, because it was the only lie left that might be useful to somebody.
>
> The marks under the table did not stop at mine. I had seen that and understood it and chosen this anyway, which is either the bravest thing I have done or the most useless, and I was not going to find out which.
>
> Somewhere, someone was carving {player_name} into a threshold, not yet knowing whose chapel it would lead them to.

---

### Ending B: The Kept Hour
**IMAGE:** `ending-b.webp`

**Base opening (always):**
> I fought them, though I knew the rope would win.
>
> Not to escape. I understood by then that there was nowhere in this arrangement to escape *to*, that the door I had come in by opened onto the same fog it always had. I fought because a thing that has been done this many times, this smoothly, deserves at least once to be done badly.
>
> It is a strange kind of dignity, choosing a fight you cannot survive. Not for victory. So that the losing has your fingerprints on it.

**Conditional middle, by `tools_reaction` + `looked_away`:**

| tools_reaction | looked_away | Flavor |
|---|---|---|
| denial | false | I called the instruments wrong the moment I saw them, and I called this wrong too, with my whole struggling body, all the way down. Wrong for the century, I had meant then. I meant something larger now, and there was finally somebody in the room to hear me mean it. |
| acceptance | true | I had wondered once whether the room was late rather than he early, whether things arrive out of order and have to be carried the rest of the way by hand. Fighting now felt like trying to hold a door shut against weather. Necessary. Useless. Mine, at least. |
| silence | false | I watched the tools in silence once and told myself understanding was not complicity. I no longer believe that. This, the fighting, was the interest accrued on that earlier quiet, and it was owed. |
| denial | true | I refused the wrongness of the tools once and looked away from him besides. The fighting felt less like courage than a debt called due all at once, with interest, in a currency I had not known I was borrowing. |
| silence | true | I watched in silence once and looked away besides. But rebellion does not require an audience to be real. This fight was quiet too, mine alone, unwitnessed by anything but the rope. It did not need to be loud to be a refusal. |
| acceptance | false | I had told myself the room was only borrowing tomorrow's tools for yesterday's cruelty, and I had watched him without looking away. I fought the same way I had accepted that, without illusion, inside the shape of the thing rather than against it, finding what courage remains available to a man standing where the machine expects him. |

**Fallback:** I fought the way water fights a dam, not expecting to win, only refusing to be still about losing. The rope held. I would like to think something in the room noticed that it had to.

**WITNESS CALLBACK:** render the shared 4-row table from Ending A verbatim. Store once, reference from all three endings; do not duplicate in data.

**Closing (always):**
> They did not stop. Nothing stops, once a room has decided what a man's insides are for.
>
> But I never answered the question. Not once, not at the end, not when answering would have been easier than the rope. Whatever else the marks under that table record, mine has that next to it, and I find I can live with the rest.
>
> Somewhere, someone was carving {player_name} into a threshold, not yet knowing whose chapel it would lead them to.

---

### Ending C: The Relay
**IMAGE:** `ending-c.webp`

**Base opening (always):**
> I said his words back to them. "I'm ahead of my time."
>
> I knew it was not true when I said it. That was rather the point. He had known it was not true either, and had said it anyway, in this chair, to protect a person standing in the dark who had not done anything yet.
>
> I felt the words leave my mouth the way a coin leaves a hand thrown into water. Not lost, exactly. Given.

**Conditional middle, by `identity_found` + `seen_reaction`:**

| identity_found | seen_reaction | Flavor |
|---|---|---|
| true | yes | I had learned his name once, quietly, in a chapel that did not know I was listening. Saying his words now felt less like theft than custody. Someone has to keep them, and it may as well be the one who went looking. |
| false | no | I never let myself learn his name. I said his words anyway, borrowed and unearned, and understood as the room went quiet that some things do not require permission to be inherited. Only a willingness to carry them. |
| true | sat_down | I knew who he was and still said nothing until now. Perhaps that is what a relay actually is. Not urgency. Patience, holding a thing quietly until it is your turn to run. |
| false | yes | I never learned his name, and the room saw me and called it recognition anyway. Perhaps that is all any of them ever were: not prophets, not heretics, only people who never needed a name to be understood, and who stayed long enough to be seen. |
| true | no | I had learned his name, and learning it turned out to be the same as inheriting it. That is all destiny is, I think. Finding out whose story you were always going to finish, and discovering the name was never his alone to keep. |
| false | sat_down | I never learned why he was who he was. I sat down anyway. Some circles do not need to be explained to be closed, only completed by whoever is willing to sit where the last one sat. |

**Fallback:** I did not fully know whose words I was borrowing when I said them. I only knew they were the truest lie in the room, and that someone would need to keep saying it until a century arrived that did not require it.

**WITNESS CALLBACK:** render the shared 4-row table from Ending A verbatim. Store once, reference from all three endings; do not duplicate in data.

**Manuscript callback (Ending C only, always plays):**
> I thought, saying it, of the page I had reached for and was not allowed to hold, the one a monk had covered with his own hand and called later, meaning never. Wet ink, in a room where the book had not been written.
>
> I understood at last which direction it had been traveling.
>
> No one stopped me now. I said the words all the way through, out loud, to a room that had no choice left but to hear them, and the one in the dark heard them too, which was the entire purpose of saying them at all.

**Closing (always):**
> Somewhere, and I could feel it the way you feel a door closing in another room of the same house, someone was dreaming this exact chapel. Watching someone they did not yet realize was themselves. Carrying something home in their hands without knowing they had picked it up.
>
> I hope, when it is their turn to wake, they remember it was not punishment.
>
> It was only ever a relay. And I had just handed off the water.
>
> Somewhere, someone was carving {player_name} into a threshold, not yet knowing whose chapel it would lead them to.

---

## THE TALLY WALL

Where an ending leads. The ending itself no longer offers to start over — it offers *See what was
counted*, and the wall is the black page that opens: a record of every image the game can show, with
the ones this run witnessed inked in and the rest left as marks scratched into the wall. "Begin
again" waits at the foot of it. (`?all` opens the same wall fully inked, outside the fiction.)

It is the title screen's last line kept as a promise. *Something is already keeping count* — and
what it turns out to have been counting is pictures of the thing that happened, which is the same
move Scene 3's tally makes when the player finds their own name already carved among the ruined
ones. The wall is not a completion meter. Nothing rewards filling it, no ending is gated behind it,
and it is gone on refresh like everything else here.

**Copy that belongs to this doc** (implemented in `js/wall.js`):

| Element | Text |
|---|---|
| Heading | Something is already keeping count |
| Register I | The Rooms |
| Register II | Evidence |
| Register III | The Accused |
| Un-inked cell | Not seen |
| Plate label | Plate — followed by a Roman numeral |
| Ending's last button | See what was counted |
| Foot of the wall | Begin again |
| Secret plaque, the question | Bonus: what was the water clock trying to tell you? |
| Secret plaque, input placeholder | — |
| Secret plaque, ask-outright link | Show it to me anyway |
| Secret plaque, revealed phrase | SOL STAT. TERRA MOVET. EGO PRAECEDENS. |
| Secret plaque, revealed translation | the sun stands still. the earth moves. I am ahead of my time. |

"Not seen" is deliberate, and deliberately not *Locked* or *???*. The wall is a witness's record;
the honest word for a plate you did not reach is that you were not there. The register names carry
the same voice as the rest of the proceeding: rooms, evidence, the accused.

**Which register a plate hangs in is decided by its filename prefix** (`js/wall.js`), so a new asset
joins a register by being named for what it is: `scene-`/`ending-` are rooms, `obj-` is evidence,
`char-`/`plate-` are the accused. An asset matching no prefix is silently left off the wall, which is
how the decorative frame border stays off it without being special-cased — and is also the trap to
remember when adding art. Scene 7's `plate-scene-7` needed `plate-` added to Register III before the
wall would count it; the prefixes are tested with `startsWith`, so it did not fall into The Rooms on
the strength of the "scene-7" in the middle of its name.

**The secret plaque** sits below the credit line, at the foot of the wall, built on the same held-beat
mechanism a scene's choice uses: it holds nothing until the player actually scrolls to it (or tabs
into it), then asks its one question — *Bonus: what was the water clock trying to tell you?* — and
sounds the same prompt-notification cue every in-scene choice sounds as its question arrives. The
"Bonus" is doing real work: it's the only word on the whole wall that steps outside the fiction,
flagging this one plaque as the exception it is (see "the Morse is never decoded," below) rather than
another thing the wall witnessed. Below the question, one unlabeled input,
and under that, a quiet second way in for a player who would rather be told than guess. Typing the
completed Morse sentence (any punctuation or spacing; comparison strips everything but letters) or
clicking the ask-outright link both do the same thing: the plaque grows the phrase and a plain
translation fragment beneath it, sounds the same confirmation an answered choice gets, and stays that
way for the rest of the session. A wrong guess does nothing at all — no error, no shake — the same
restraint the rest of the game gives a wrong answer. This is the one deliberate exception to "the
Morse is never decoded" (Deliberate Decisions, below): out of the fiction, not in it.

**"Begin again" waits for it.** On the wall an ending arrives at, the button is not there to see until
the plaque has been answered or asked for — it fades in once it has been. Nothing about the ending
itself, the wall's count, or any flag changes as a result; the plaque is a courtesy, not a reward. But
the run's last screen does not hand back its one way out until the player has done something with the
one thing on it they haven't already seen. `?all` never shows the button at all (it closes instead),
so this only applies to the wall an ending actually leads to.

Putting the count *after* the ending rather than under it matters: the ending gets to finish on its
own last line, and the tally is the thing that outlives it by one screen. There is no way back to
the ending text from the wall — the only exit is beginning again, which loses the count. That is the
same bargain the title screen states, arrived at from the other side.

Every **caption** on the wall is derived at runtime from data already in this doc — scene and ending
titles, and the tier-2 examine labels — so no plate description exists in two places. Adding an
examine hotspot or a scene names its own wall cell automatically; renaming one here renames it
there. Do not add a parallel caption list.

---

## STATUS

**Narrative content is complete.** No placeholders.

### What changed in v3
Prose only. Scene count, tier2 objects, reactive blocks, flag keys, branch points, and endings are
identical to v2, so **all existing art and the tech design doc remain valid.**

- The monks now ask **"who gave it to you"** rather than demanding recantation. This single change
  converts the story from metaphor to mystery and required no structural edits.
- Existing objects were **reinterpreted, not replaced**: the books are older than him, the letter is
  in his hand but predates his birth, the manuscript is wet ink from a book not yet written, the
  tools record rather than cut, the astrolabe has hung on more than one neck.
- **The tally now contains the player's carved name.** Second use of `player_name`. See build note in
  Scene 3.
- Scene 4's closing line is recontextualized: he is lying to protect the witness watching him.
- The three endings are now three answers to the same question rather than three moods.

### Content inventory
| Item | Count |
|---|---|
| Scenes | 7 |
| Plates (held images) | 4 (Scene 2 opening, Scene 4 closing, Scene 5 opening, Scene 7 opening) |
| Endings | 3 |
| Tier 2 examine objects | 22 (20 dedicated images; `obj-water-clock` reused across Scenes 1 and 3, Scene 6's clock is its own `obj-water-clock-2`; Scene 5 "calendar" is an HTML widget) |
| Reactive blocks (non-branching) | 8 |
| Real branch points | 2 (Scene 4 `looked_away`, Scene 7 `final_choice`) |
| Conditional ending rows | 8 + 6 + 6, plus 4 shared witness rows |
| `player_name` interpolation points | 4 (Scene 3 tally, plus one closing per ending) |
| Estimated playtime | 15 to 20 min per run |

### Remaining work
- [ ] Two tech-doc additions: (1) `player_name` interpolation in Scene 3 tier2 text, plus the
      alternate body when the player declined to carve, same token and fallback as the endings;
      (2) the `plate` field, see the PLATES section above, Scene 4's plate supersedes `closingText`;
      (3) the Scene 5 calendar hotspot, which renders an HTML widget rather than an image.
- [ ] Build per `superstes-tech-design.md`
- [ ] Playtest all three endings; confirm no conditional row renders the fallback unintentionally

### Deliberate decisions, recorded so they don't get "fixed"
- **The mystery is never explained in narration.** No scene tells the player what the tally is, what
  the tools record, or which direction the knowledge travels. They assemble it or they don't.
- **Three flags are local-only** (`gate_action`, `tally_reaction`, `waking_reaction`). Not a bug.
- **Scene 4 has exactly one tier2 object.** It is the emotional peak; more clickables dilute it.
- **The narrator never reacts to seeing their own name** in the tally. The player gets there first.
- **The Morse is never decoded — in the fiction.** SOL STAT / TERRA MOVET / EGO PRAECEDENS across
  Scenes 1, 3, 6, the last cut off mid-word. No translation, no hint, no completing the truncation,
  and Scene 6's clock still stops at `EGO PRAECEDEN`. **One deliberate exception, out of the fiction
  entirely:** the tally wall carries a small plaque (below) that hands the completed phrase back to
  a player who already has it, or who asks for it outright. The game itself still explains nothing
  to a player who hasn't reached the plaque — the exception is a courtesy for outside effort (or
  outside patience), not a narrated hint.
- **The monks are never individuated or named.** One collective. The Institution has no face.
- **No persistence.** Refresh restarts. Correct for a 15-minute playtime.
