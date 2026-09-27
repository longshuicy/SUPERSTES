# SUPERSTES — CHAPTER II

**Internal title:** *The Last Word*  
**Player-facing title before Scene 7:** **SUPERSTES — II** only. Do **not** reveal the chapter subtitle, the phrases “last word,” “last words,” “last conversation,” “final conversation,” or the shared nature of the memories before Scene 7.

A short narrative web-game chapter. First person, past tense. Black-and-white line illustration.

Tone: intimate, ordinary, melancholy, slightly surreal. The surrealism should arrive slowly. The first six scenes must feel like memories that returned for no obvious reason, not like a collection of farewells.

**Companion docs:** `superstes-chapter-2-art-prompts.md` (art), `superstes-tech-design.md` (build —
Chapter II needs no schema change, see §3), `superstes-sound-design.md` (audio — Chapter II adds ten bed
slots and reuses everything else, see §3), `superstes-localization.md` (translations).  
This file is the single source of truth for Chapter II narrative content.

**Translations.** The English below is the source text; a translation is a derived work living in
`content/<lang>/`. Chapter II's plainness relative to Chapter I is load-bearing and a translation
must preserve the gap — see `superstes-localization.md` §8.

---

## THEME SUMMARY

Chapter II is about **time changing the meaning of an event after the event is already over**.

The protagonist is flooded by disconnected memories: dropping someone at work, a train station in a small half-remembered town, a water bottle returned in a parking lot, a friendly encounter on a street, a noisy summer bar, an argument, a childhood walk home after cleaning duty. None of the scenes announce why they matter.

Only in the final scene does the pattern become visible: **nothing came after any of them.** They were the last conversations she had with those people, but they were not experienced as endings. They were ordinary days whose category was changed later by the future.

Threads running through every scene:

- **The myth of last words:** We imagine final words as deliberate, weighted, backward-looking statements. In reality, people usually speak as though there will be more time, because they do not know there will not be.
- **Time edits labels:** The future reaches backward and renames an ordinary car ride “the last car ride,” a random street encounter “the last conversation,” a walk home from school “the last walk home.” The event itself did not know what it was.
- **Memory is not an archive:** Memory keeps useless details and drops the sentence history later demands. This is not a failure of attention; the witness did not know which evidence would one day be requested.
- **Witness vs. record:** SUPERSTES means witness — and specifically the one who outlived the thing. Latin separates the bystander who happened to be present (*testis*) from the survivor who came out the other side and can still speak, and the game is named for the second. A witness can truthfully say *I was there* without being able to reproduce a transcript. Testimony is not the same thing as perfect recall.
- **Water as time:** Water is present quietly in every memory—condensation, station glass, a water bottle, a street puddle, a spilled drink, cleaning water. In Scene 7 these separate waters pool together. Time, like water, obeys a direction while the people inside it do not know where it is carrying them.
- **Importance arrived later:** The memories were not “important moments” when they happened. Their importance was conferred afterward. That is why they were not memorized as monuments.

**Emotional spine:** ordinary → oddly persistent → unstable → accumulating → recognized → impossible choice: release, reconstruct, or testify.

---

## SPOILER / REVEAL RULE

This is a hard narrative constraint.

Before Scene 7:

- Never call any encounter the “last” anything.
- Never say the protagonist never saw/spoke to the person again.
- Never frame departures with cinematic finality.
- Never use “goodbye” as a thematic keyword. Characters may make ordinary parting gestures, but the narration must not underline them.
- Never show a UI label such as `LAST WORD`, `FINAL MEMORY`, or `GOODBYE`.
- Earlier reactive choices may ask what detail the player trusts, follows, or notices, but never “what do you think they said at the end?”

Scene 7 is where the pattern is named for the first time.

### Two reveals, and only one of them is protected

This rule is about **the pattern** — that nothing came after any of these conversations. It is *not*
a rule against strangeness. Those are two different reveals and they escalate on different schedules:

| | Reveal | Where it starts |
|---|---|---|
| **The strangeness** | Something is wrong with these memories. Water misbehaves, a reflection lags, a place holds architecture that isn't there. | **Scene 4's puddle**, then increasing |
| **The pattern** | These were the last conversations. Nothing followed any of them. | **Scene 7 only** |

Withholding both until Scene 7 is what makes the reveal feel unearned — the theme summary's emotional
spine already puts *unstable* third, before *accumulating* and *recognized*, and Scene 4 is where that
belongs. So Scene 4 is the turn: the first anomaly the player is meant to actually catch, and the
first time the narrator knows a memory is not behaving.

**What she may do:** report an impossible fact plainly, and say she can't account for it. *The
reflection lagged. The puddle held a window that wasn't there. I could not tell you what it was.*
**What she may not do:** interpret it, connect it to the other memories, or treat it as a message.
Nothing before Scene 7 may suggest the anomalies are *about* endings.

---

## FLAG SYSTEM

```js
flags = {
  dropoff_focus: null,          // Scene 1: "plan" | "conversation" | "return"
  station_anchor: null,         // Scene 2: "hug" | "waiting" | "message"
  bottle_reaction: null,        // Scene 3: "object" | "gesture" | "leave"
  turned_back: null,            // Scene 4: true | false — only non-final branch with visible scene variation
  noise_strategy: null,         // Scene 5: "listen" | "watch" | "leave"
  childhood_reaction: null,     // Scene 6: "call" | "follow" | "stay"
  acknowledged_departures: null,// Scene 7: "held" | "avoided"
  final_choice: null            // Scene 7: "A" | "B" | "C"
}
```

### Which flags are consumed where

| Flag | Consumed by |
|---|---|
| `final_choice` | Routes to Ending A / B / C |
| `dropoff_focus` | Ending A conditional middle |
| `station_anchor` | Ending C conditional middle |
| `noise_strategy` | Ending B conditional middle |
| `childhood_reaction` | Ending C conditional middle |
| `turned_back` | Scene 4 variation; all three endings; shared departure callback |
| `acknowledged_departures` | Shared departure callback in all endings |
| `bottle_reaction` | **Local only.** Scene 3 tone; deliberately not consumed later |

The local-only bottle flag is intentional. It gives the player a moment of agency without making every object a future key.

---

## THE PLATE

Chapter II has **exactly one** plate: Scene 7's opening. Same mechanism as Chapter I's — a held image
rendering alone, full screen, with its own text and a single advance control. No examine hotspots, no
choices, nothing to click but *continue*.

| Plate | Asset | Position | Job |
|---|---|---|---|
| Scene 7 opening | `plate-c2-pool.webp` (4:5) | Before Scene 7's text | The arrival. First image allowed to be symbolic, and the seam where the voice changes. |

**Why only one, and why here.** Scene 7 otherwise has to carry the pool, the seven figures arriving
one by one, the reveal, the title, three inspectables, a reactive block *and* the three-way final
branch. On the page the reveal arrives as one more paragraph in something the player is already
scrolling, with hotspots and choices crowding in behind it. Held, the arrival is the only thing on
screen and the player has to click to leave it — so the reveal that follows lands in a scene the
player has *entered* rather than scrolled into.

It also does structural work the other six scenes can't. Scenes 1–6 are deliberately flat and
unsymbolic (see *Deliberate design decisions*); the plate is where that stops. It is the first held
image, the first permitted symbolism, and the first time the narrator interprets anything. The format
change is the drama — after six small ordinary rooms, one full-screen image with nothing to click.
Do not add a second plate to Scenes 1–6 to "balance" it; the singularity is the effect.

**The plate must not reveal the pattern.** It carries the arrival only. The seven figures, the
*nothing came after any of these conversations* line, and the title card all belong to the scene body,
after the click. The spoiler rule applies to the plate exactly as it applies everywhere before the
reveal.

**PLATE TEXT:**

> I stood ankle-deep in all of it.
>
> The water was not deep enough to drown in. That made it worse.
>
> Everything was lying just under the surface, close enough to pick up. The bottle. The gas station receipt. A cello case. A name tag I still couldn't read. A train ticket I don't remember keeping.
>
> And above them, reflections of places that had never shared a sky. Glass doors. A station window. A parking stripe. A streetlamp. A bar table. Classroom windows. All of it holding still in four inches of water, in a light that belonged to none of them.
>
> I stood there with my shoes ruined and understood that I was not going to be allowed to call this a dream.

**Pacing.** The plate is what Scene 6's closing lines hand off to — *None of these waters had
touched. / Then they did.* — so it wants a slow fade up out of that, **not** Chapter I's Scene 2
trick of cutting in hard. Longer fade in and out than a scene, and no hover effect on the advance
control. Nothing animates: it is a still image that fades, like every other plate in the game.

**Build.** Uses the `openingPlate` field, the same one Chapter I's Scenes 2 and 5 use. (Chapter I's
script doc proposes a single `plate: { position }` field; that is not what shipped — see the tech
doc's scene schema, which is the schema of record.) No new schema.

---

# SCENE 1: The Drop-Off

**IMAGE:** ordinary car stopped outside a workplace entrance on an unremarkable day; passenger about to get out; no dramatic farewell composition

**TEXT:**

> I drove him to work that day.
>
> I don't remember why.
>
> There had been a plan before that. Lunch, maybe. Some errand. We had meant to go somewhere and either went or didn't. I remember the plan existing. I don't remember what it was.
>
> The heater was on too high. I remember reaching over to turn it down and not turning it down.
>
> We were talking about blood pressure.
>
> *“If you're worried about your blood pressure, you should really check out—”*
>
> That is where it stops. Check out what, I can't say. A doctor. A test. Some number you are supposed to stay under. It's possible I wasn't the one saying it.
>
> He reached for the door.

**TIER 2, examine the dashboard clock:**

> Green digits. I looked at them directly and couldn't read them, the way you can't read a sign in a dream.
>
> The hour had been there. I never learned it. There was no reason to.

**TIER 2, examine the passenger seat:**

> A shallow crease in the fabric where he had been sitting. It stayed after he stood up. Ten seconds, maybe fifteen. Then the foam did whatever foam does.

**TIER 2, examine the cup holder:**

> A receipt, folded twice, damp in one corner where the cup had sweated on it. I turned it over expecting a place name to bring the day back. Most of the ink had gone gray and spread.
>
> One line was still readable. A gas station, forty miles from anywhere we had reason to be.
>
> A gas station. That is what got kept.
>
> I held it for a while and then put it back in the cup holder.

**TIER 2, examine the workplace entrance:**

> Automatic glass doors. A badge reader on a post. A strip of fluorescent light inside.
>
> A door into a building where a person went five days a week. There was nothing else to say about it.

**REACTIVE, what are you trying to recover?** *(sets `dropoff_focus`)*

- **A. “What was the plan that day?”** → *Start with the logistics. Where we went, what for, in what order. If I could get the itinerary back, maybe the rest would come with it.* → `"plan"`
- **B. “What were we talking about?”** → *The sentence came back and stopped in the same place. It stops there every time. I have tried it from several directions.* → `"conversation"`
- **C. “Why did this day come back at all?”** → *Too early to ask. The memory hadn't told me what it wanted yet. It had shown up the way someone shows up for an appointment you don't remember making, and stood there.* → `"return"`

**CONTINUATION:**

> He got out.
>
> One of us raised a hand. I think it was me.
>
> The door shut with that padded sound a car door makes when it shuts properly.
>
> Then I drove away.

→ Scene 2

---

# SCENE 2: The Station

**IMAGE:** small train station in an unnamed town, cold glass, sparse platform, one traveler boarding while another remains behind near the station

**TEXT:**

> The next memory arrived with weather.
>
> A small station in a town whose name has blurred. The kind of place a train stops at briefly on its way somewhere else.
>
> He came to see me off. Thanksgiving break was ending. We had already settled on Christmas, a few weeks out, nothing that needed confirming.
>
> We hugged. I remember the pressure of the coat between us. I don't remember what either of us said into the other's shoulder.
>
> Then he turned back toward the station.
>
> I thought he had left.
>
> I boarded.
>
> From inside the train I saw him again through the glass. He was still standing there, waiting while the train waited.
>
> When the train finally moved, my phone lit up in my hand.

**TIER 2, examine the departure board:**

> City names. Times. Delays measured in minutes.
>
> One thing after another. A platform becomes a train. A train becomes distance. The board was certain about all of it.

**TIER 2, examine the station glass:**

> My reflection lay faintly over his figure, so that for a moment we were on the same patch of glass from opposite sides. Then the train shifted and we came apart.

**TIER 2, examine the phone:**

> A message had arrived as the train began to move. I remembered receiving it. I remembered looking down. I remembered the small blue-white brightness of the screen in the dark carriage.
>
> The words themselves would not come.

**TIER 2, examine the empty place beside you:**

> My bag sat there, buckled in by nothing, behaving as though the seat had always belonged to it.

**TIER 2, the man beside you:**

> A middle-aged man had taken the seat across the aisle and decided, unprompted, that I would want to hear about his daughter. She was, he told me twice, exactly my age. He had photographs. He had opinions about her boyfriend. He talked the way people talk when a phone has no signal and a stranger hasn't yet worked out how to look busy enough to be excused from listening.
>
> I don't remember one word of what he said about her. I remember that he never ran out of things to say.

**REACTIVE, which detail feels most trustworthy?** *(sets `station_anchor`)*

- **A. “The hug.”** → *The coat, the arms, the small awkwardness of letting go before either person knows who should let go first. Bodies keep pressure. I trusted that much.* → `"hug"`
- **B. “That he stayed until the train moved.”** → *I had been wrong once already in the memory: I had thought he'd gone. The correction mattered to me more than I understood.* → `"waiting"`
- **C. “The message on the phone.”** → *A written thing should have been safer. I looked for the words and found only the fact that there had been words.* → `"message"`

**CONTINUATION:**

> The station slid backward.
>
> Or I did.
>
> From inside the train there was no way to tell.

→ Scene 3

---

# SCENE 3: The Bottle

**IMAGE:** workplace parking lot, person beside a packed car handing a reusable water bottle to the narrator; mundane daylight

**TEXT:**

> Then a parking lot.
>
> He was moving away that day.
>
> His car was packed the way cars are packed for a move: bags fitted into gaps, soft things pressed around hard things, everything wedged so it would hold at highway speed.
>
> I had left a water bottle at his place.
>
> Of everything still unsettled before he drove away, this was the part that could be handled.
>
> He asked me to meet him in the parking lot at work so he could give it back.
>
> He held it out.
>
> I took it.

**TIER 2, examine the water bottle:**

> Scratched plastic. A bite mark on the straw. A little water still moving at the bottom, though neither of us had touched it for several seconds.
>
> An object returned to its owner.
>
> I don't remember what became of it after that. Whether it came home with me and sat in a cupboard for a year before I recycled it. Whether I left it in the car. I can't tell you how long ago any of this was.

**TIER 2, examine the packed car:**

> I could see bedding through the rear window. A lamp wedged sideways. His cello case, upright between two boxes, taking up more room than anything else he owned.
>
> He used to play for me sometimes. Badly, he said, though I never believed him. I would sit with a glass of wine and we would pretend the apartment was somewhere more expensive than it was.
>
> Standing in that parking lot, I could not remember the last thing he had played.
>
> Something red I couldn't identify was pressed against the glass.

**TIER 2, examine the parking stripe between you:**

> A white line, badly painted, thickening where the roller had slowed. We stood on opposite sides of it. Neither of us had chosen where to stand.

**REACTIVE, what do you do with the bottle?** *(sets `bottle_reaction`, local only)*

- **A. “Keep holding it.”** → *I held it through the rest of the conversation, if there was a rest of the conversation, as though the object had given my hands an assignment and might complain if I finished early.* → `"object"`
- **B. “Look at his hand after he lets go.”** → *His hand dropped to his side. Empty. Mine did not. I noticed this and immediately distrusted myself for noticing it.* → `"gesture"`
- **C. “Put it in your bag.”** → *The bottle went into my bag without any trouble at all. I zipped it shut and we kept talking.* → `"leave"`

**CONTINUATION:**

> We stood there a little longer.
>
> I know we spoke.
>
> I have the bottle and not the conversation.
>
> Then his car pulled out of the lot.

→ Scene 4

---

# SCENE 4: The Street ★

**IMAGE:** ordinary city street a few days after rain; two people unexpectedly passing each other; one smiling in friendly recognition; no romantic framing

**TEXT:**

> A street came next.
>
> We hadn't seen each other in a few years. Long enough that I had assumed we wouldn't again — no falling out, nothing I could point to, just two people who had stopped making the effort.
>
> Then I ran into him by accident.
>
> There should have been awkwardness. I remember expecting it.
>
> Instead he smiled.
>
> Not cruelly. Not sadly. Not with the careful face people wear when they have prepared to run into someone difficult.
>
> He looked pleased to see me.
>
> He told me he'd just adopted a dog. A rescue, some mutt with a name he was clearly delighted by. He said I should come meet it sometime.
>
> I said something about being glad for him. I meant it.
>
> For a minute, maybe less, we stood on the sidewalk and talked like two people for whom talking had never become complicated.

**TIER 2, examine the puddle beside the curb:**

> His reflection smiled a fraction later than he did.
>
> I want to be accurate about this, because it is the first thing in any of these memories that I know did not happen the way I remember it. He smiled. Then the water smiled. Not together. There was a gap, about the length of a blink, and I noticed it while it was happening rather than afterward.
>
> A bus went past and broke the face into black water.
>
> When the surface settled he was still standing there, whole again — and for a moment the puddle was holding something else as well. A window, or a glass door, belonging to no building on that street. It was gone before I could look at it properly.
>
> I could not tell you what it was. I could tell you it did not belong there.
>
> I looked up. He was still talking. Nothing in his face suggested anything had happened.

**TIER 2, examine his shirt:**

> A graphic tee, faded at the collar. He owned a rotation of them, dozens deep, each printed with some band or joke or cartoon I could still individually picture if asked, the one with the cracked egg, the one from the aquarium gift shop, the one so old the design had gone illegible.
>
> I could picture every shirt he had ever worn to meet me. I could not tell you which one he was wearing.

**REAL BRANCH, after you pass each other, do you turn around?** *(sets `turned_back`)*

- **A. “Turn around.”** → `turned_back: true`
  > I turned after several steps.
  >
  > He was still walking.
  >
  > I saw the back of his coat, then another pedestrian crossed between us, and when the view cleared he had become merely one person among several moving in the same direction.
- **B. “Keep walking.”** → `turned_back: false`
  > I kept walking.
  >
  > It didn't feel like a decision.

**CONTINUATION:**

> The street remained where it was.
>
> I left it anyway.
>
> Something had changed by then. Up to that afternoon I had been remembering ordinary days. After it I was doing something else, and I did not have a word for what.

→ Scene 5

---

# SCENE 5: Noise

**IMAGE:** crowded summer bar with old friends, layered reflections and glasses; the scene should subtly double into a second memory of an argument without obvious supernatural horror

**TEXT:**

> The next memory was loud.
>
> He had been studying abroad and came back for the summer. Old friends gathered somewhere with drinks and bad acoustics. A bar, I think. Or a restaurant that became a bar after a certain hour.
>
> I don't remember, now, what he looked like that night. I know the shape of a person leaning toward me, the angle of it, but the face refuses to resolve, as though memory kept the geometry and lost the artist.
>
> Someone laughed too loudly behind me. Glass touched glass. Music occupied every empty part of the room.
>
> He leaned toward me and said something.
>
> I leaned closer.
>
> The sentence entered the noise and did not come out intact.

**TIER 2, examine the half-finished drink:**

> Melted ice had raised the waterline without adding anything worth drinking. A ring spread beneath the glass. I watched it reach the edge of the napkin and continue onto the table.

**TIER 2, examine the conversation instead of listening:** *(no dedicated image; text-only, like Chapter I's calendar hotspot)*

> I have tried, standing in this memory, to recover a single sentence of what either of us actually said. Not the tone, not the shape of it — the words themselves, in order, the way a person actually talks.
>
> Nothing comes. I get as far as knowing we were talking, which is either a very small thing to know or, depending on the day, the only thing that ever mattered.

**TIER 2, examine the sign above the door:**

> A sign hung above the door, lit from within, whatever it said long since sanded down by the years into two shapes and a color. I have decided, without any real evidence, that it was a restaurant. Not a bar. A restaurant that had, by the hour we arrived, forgotten it served food.
>
> It felt important to settle on one answer, even an invented one. A memory with no name for its own room starts to feel like it might not have happened at all.

**TRANSITION — the sound peaks, then cuts:**

> I blamed the room for losing the sentence.
>
> Then another memory struck it from the side.
>
> Different place. Different year. No music.
>
> His long-distance girlfriend had broken up with him.
>
> He was furious. Hurt. He threw the whole weather of it at me.
>
> He yelled.
>
> I remember the volume.
>
> I remember thinking it was unfair that I had become the nearest wall for someone else's collapse.
>
> I remember his face red with the effort of saying things.
>
> I do not remember what any of the things were.
>
> The first room had been too loud to hear.
>
> The second was loud enough.
>
> I lost both.

**TIER 2, examine the doorway from the argument:**

> I had stood close enough to leave and far enough away to pretend leaving would have been dramatic. The hallway beyond him was empty. I remember measuring it with my eyes.

**REACTIVE, when the words won't stay, what do you trust instead?** *(sets `noise_strategy`)*

- **A. “Listen harder.”** → *I replayed tone as though tone were a cipher. Anger became syllables; laughter became possible consonants. I knew I was manufacturing evidence. I did it carefully.* → `"listen"`
- **B. “Watch the face.”** → *Faces had survived where language hadn't. I let expression stand in for quotation, which is unfair to both.* → `"watch"`
- **C. “Leave the words alone.”** → *I stopped asking the memories to perform. For a moment the rooms became ordinary again: one noisy, one painful, neither obligated to explain why it had returned.* → `"leave"`

→ Scene 6

---

# SCENE 6: The Road Home

**IMAGE:** middle-school classroom after cleaning duty, late afternoon; two schoolchildren leaving together with brooms and schoolbags; quiet residential road beyond

**TEXT:**

> The oldest memory was smaller than the others.
>
> Middle school.
>
> He was transferring to another school.
>
> We had cleaning duty together that day.
>
> I remember chairs lifted onto desks. A broom leaning in the corner. The wet mineral smell of a floor that had just been mopped. Sunlight arranged in long rectangles where the windows permitted it.
>
> We finished.
>
> We walked home together.
>
> Then, the way we always did, we split off, him pushing his bicycle the last stretch rather than riding it, some rule of his I never asked about and he never explained. I could not tell you, now, which corner it was. Which street. Whether he waved, or said something, or simply peeled away mid-sentence the way children do when the conversation has already moved on without them noticing it end.
>
> It happened the way it always happened. That, apparently, was the whole problem.
>
> I don't remember being devastated.
>
> I don't remember trying to make the walk longer.
>
> I don't remember understanding that the afternoon deserved any special treatment.
>
> We were children. Tomorrow was a place adults managed for us.

**TIER 2, examine his name tag:**

> Sewn crooked into the collar of his uniform, the way the school made every one of us do, in case we got lost or forgot which coat was ours.
>
> I cannot read it. I have tried angling the memory every way I know how. I can tell you the color of the thread. I cannot tell you the name.
>
> I am fairly sure I knew it once. That feels like it should count for something.

**TIER 2, examine the mop bucket:**

> Cloudy water trembled each time someone stepped nearby. When the room became empty, it went still. The dirt sank slowly to the bottom as though time, even then, preferred layers.

**TIER 2, examine the schoolbag:**

> Too heavy. Textbooks, notebooks, a pencil case with one broken zipper. The ordinary equipment of a future extending at least as far as tomorrow morning.

**TIER 2, examine the road home:**

> We had walked it before. That was what made it a route instead of a scene. Houses, trees, driveways, a crossing where we knew when to look without discussing it.

**REACTIVE, the memory begins to move away from you. What do you do?** *(sets `childhood_reaction`)*

- **A. “Call to the child.”** → *I wanted to tell her to listen. To look. To memorize everything. She did not turn. Perhaps she couldn't hear me. Perhaps she heard and had the good sense to ignore an adult asking a child to become an archivist of her own life.* → `"call"`
- **B. “Follow them.”** → *I walked several steps behind. Their conversation moved easily between topics I could no longer make out. Neither child seemed aware that I had mistaken their ordinary walk for evidence.* → `"follow"`
- **C. “Stay in the empty classroom.”** → *I let them go. The wet floor reflected the windows. The bucket settled. For a while, the room remembered only that two students had completed the task assigned to them.* → `"stay"`

**TRANSITION TO SCENE 7:**

> A drop fell from the mop into the bucket.
>
> I heard, impossibly, another drop answer from the parking lot.
>
> Condensation slipped from the cup holder.
>
> Water moved inside the bottle.
>
> Rain gathered at the station glass.
>
> A street puddle shivered.
>
> Melted ice crossed a bar napkin.
>
> None of these waters had touched.
>
> Then they did.

→ Scene 7

---

# SCENE 7: The Pool ★ REVEAL

**OPENING PLATE:** `plate-c2-pool.webp`
*Held image. Renders alone, before the scene proper. Advance on click. Text and rationale in THE
PLATE, above — the arrival happens there, and the scene body picks up with the figures.*

**IMAGE:** impossible shallow pool combining fragments of all prior places; train glass, workplace doors, parking stripe, streetlamp, bar table, schoolroom windows; seven ordinary figures at different distances moving away or attending to their own business; no horror

**TEXT:**

> Around the edge of the pool, the people from the memories appeared one by one.
>
> No one faced me as though summoned.
>
> One walked toward work.
>
> One waited beside a station window.
>
> One stood by a packed car.
>
> One smiled on a street.
>
> One leaned across a noisy table.
>
> One was caught forever in the posture of anger.
>
> One was still a child walking home.
>
> And then the reason arrived.
>
> Not as a recovered sentence. As a fact.
>
> **Nothing came after any of these conversations.**
>
> I searched the years beyond each memory and found no later exchange waiting there. No correction. No second version. No ordinary next time to reduce the importance of the one before it.
>
> These were the last times I had spoken to them.
>
> I had spent years imagining last words as something a person says while standing at the edge of an ending.
>
> But none of us had been standing at an edge.
>
> We had been in cars. Parking lots. Bars. Classrooms. Streets.
>
> We had been talking about blood pressure.
>
> **I hadn't forgotten their last words. I had never known I was hearing them.**
>
> Memory had not failed to preserve a monument.
>
> There had been no monument yet.
>
> **Importance arrived later.**
>
> Time had reached backward and renamed the day.

**TITLE REVEAL — display only now:**

> **CHAPTER II: THE LAST WORD**

> **Presentation.** Plainly. No flash, no glitch, no typing, no animation of any kind — the words are
> simply there, with space around them and nothing else. This is the payoff of a subtitle withheld for
> six scenes, and anything that performs the arrival cheapens it. (Implemented as `.title-reveal` in
> `css/style.css`, which carries no animation for exactly this reason.)

**TIER 2, examine the water:**

> Every scene had contributed something to it. None had known where the water was going. That, I thought, was the vulgar advantage time held over everyone inside it: it knew the direction without having to tell us the destination.

**TIER 2, examine the objects beneath the surface:**

> They had survived because objects do not need to understand importance in order to persist. A bottle can outlive a sentence without ever knowing it has won.

**TIER 2, listen to the overlapping voices:**

> Fragments rose and vanished.
>
> *...tomorrow...*
>
> *...text me...*
>
> *...anyway...*
>
> *...when you...*
>
> *...see...*
>
> I could no longer tell which fragments were remembered, inferred, or merely grammatically likely.
>
> Almost all of them faced forward.

**REACTIVE, do you look at the people around the pool?** *(sets `acknowledged_departures`)*

- **A. “Look at them. Hold the scene as it is.”** → *I looked from one to the next without asking any of them to turn around. For once I let seeing be different from retrieving.* → `"held"`
- **B. “Keep your eyes on the water.”** → *I watched the reflections instead. They were easier. Reflections cannot disappoint you by continuing to walk away.* → `"avoided"`

**FINAL BRANCH** *(sets `final_choice`, determines ending)*

- **A. “Let the words stay where time left them.”** → Ending A: **The Unrecorded**
- **B. “Go back. Listen again.”** → Ending B: **The Kept Word**
- **C. “Say only what you know happened.”** → Ending C: **The Testimony**

---

# THE TALLY WALL

Chapter II has **its own wall**, and it is deliberately asymmetric with Chapter I's. Copy lives in
`js/wall-c2.js`; captions derive at runtime from the scene and ending data, same as Chapter I's, so
nothing is restated in two places.

| Element | Chapter I | Chapter II |
|---|---|---|
| Heading | Something is already keeping count | **Something *was* already keeping count** |
| Register I | The Rooms | The Places |
| Register II | Evidence | What Was Kept |
| Register III | The Accused | The People |
| Register III layout | 4:5 portrait | 4:5 portrait — the pool plate is cropped to match |
| Un-inked cell | Not seen | **Not remembered** |
| Ending's last button | See what was counted | See what was kept |
| Secret plaque | the Morse phrase | **none** |
| Foot of the wall | Begin again, then the Chapter II door | Begin again |

**No plaque.** There is no Morse in Chapter II, so there is nothing withheld for a plaque to hand
back. Chapter I's plaque is a courtesy for outside effort; Chapter II has asked nothing of the player
that it is holding an answer to. One consequence: Chapter II's *Begin again* is visible as soon as
the wall opens, where Chapter I's waits for the plaque to be dealt with.

**The tense change in the heading** is doing the same work as *Not remembered*: Chapter I's wall says
something is *already* counting, before the player has done anything. By the time Chapter II's wall
opens, the counting is what has just been revealed.

> **Reversed decision, recorded.** Chapter II's wall was originally a dead end — no *Begin again*, no
> close control, nothing to click — on the argument that Chapter I is a relay and loops while Chapter
> II is about nothing coming next. It read well as an argument and badly as a screen to actually sit
> in front of, so it offers the way out. It still has no `nextChapter`: Chapter II is the last one.

## Getting here from Chapter I

Two routes, sharing one label so they read as one door:

**The title screen**, under the blurb and above *Enter the fog*. The blurb ends *"Something is
already keeping count."* and the door answers it — **Someone else was keeping count · II** — so it
belongs in that couplet rather than in the fine print below the runtime line. One line in the label
face with the numeral inline and picked out in the accent — a stacked blackletter **II** above the
line was tried and read as a stray mark rather than a chapter number. Hovering it sounds a single
drip, which is Chapter II's entire score (sound doc), so the tease tells the truth about what it
opens without describing it. It names no chapter; that would spoil it.

**The foot of Chapter I's wall**, beside *Begin again* and revealed with it once the plaque has been
dealt with — the plaque holds the whole foot of the wall shut, not one button of it. It loads Chapter
II as a fresh page (`?chapter=ii`) rather than swapping it in place: nothing is persisted, so a
reload costs the player nothing and buys clean state instead of unwinding an ending's body classes,
backgrounds and runtime by hand.

---

# ENDINGS

## Assembly spec

Every ending renders as one continuous screen, assembled in this exact order:

1. **Base opening** — fixed per ending
2. **Conditional middle** — one row from that ending's table
3. **Shared departure callback** — one row from the 4-row shared table
4. **Ending-specific callback**
5. **Closing** — fixed per ending

No visible headers or seams in-game.

---

## Ending A: The Unrecorded

**IMAGE:** shallow pool after the figures have left; ordinary objects visible under still water; no tragedy iconography

**Base opening (always):**

> I let the words stay missing.
>
> Not the people. Not the days. Only the sentences I had spent years trying to force back into their mouths.
>
> They had not failed to leave me a final message.
>
> They had not known they were leaving one.

**Conditional middle, by `dropoff_focus` + `turned_back`:**

| dropoff_focus | turned_back | Flavor |
|---|---:|---|
| plan | true | I had begun by trying to reconstruct a plan—the itinerary of an ordinary day—and later turned on a street to keep one disappearing figure in sight. Both impulses had come from the same superstition: that if I recovered enough sequence, sequence would become meaning. It did not. The day was allowed to have been badly documented. |
| plan | false | I had wanted the plan first: where we'd gone, what we'd meant to do, what came before the workplace. On the street I had kept walking instead of turning back. I understood now that both choices were ordinary, and ordinariness was not negligence. A day does not owe the future minutes precise enough to survive cross-examination. |
| conversation | true | I had chased the blood pressure sentence and later turned to watch another person recede down a street. Words and bodies: I had wanted both to hold still after the moment had finished using them. Neither had agreed. I released the sentence first. |
| conversation | false | I had wanted the conversation back but had not turned around on the street. Apparently some part of me already knew what the rest of me would take years to learn: you can continue walking without possessing the final transcript of what happened behind you. |
| return | true | I had asked why the drop-off memory returned, then turned back when another memory offered me the chance. The answer was smaller than I expected. They returned because nothing followed them. Not prophecy. Not unfinished business. Only chronology, arriving late and dressed as significance. |
| return | false | I had wondered why the day returned and then kept walking on the street. I could answer myself now: the future had selected these scenes after the fact. I had not missed a sign. There had been no sign to miss. |

**Fallback:**

> I stopped treating forgetting as a crime scene. Memory had kept what it could without knowing what the future would subpoena.

### Shared departure callback

| turned_back | acknowledged_departures | Flavor |
|---|---|---|
| true | held | I had turned back once, trying to keep a disappearing person in sight. At the pool I looked again, but this time I did not ask anyone to return. Looking was enough. |
| true | avoided | I had turned back on the street, but here I watched only the water. Perhaps I had finally exhausted the belief that one more look could make a moment stay. |
| false | held | I had kept walking on the street. Here I looked at them fully. The two acts did not contradict each other. Presence is not measured by how long you can delay leaving. |
| false | avoided | I had kept walking then and looked away now. Some endings receive no ceremony at all. They remain true anyway. |

**Ending-specific callback:**

> A phrase floated up from nowhere I could responsibly assign it:
>
> *See you.*
>
> Perhaps someone had said it. Perhaps no one had.
>
> It was simply the grammar of ordinary parting: a future assumed without evidence.

**Closing (always):**

> I had thought time took the words.
>
> What time had actually taken was the next time.
>
> The water became still.

---

## Ending B: The Kept Word

**IMAGE:** repeated overlapping versions of the car, station, street, bar and classroom reflected in concentric ripples; dialogue fragments multiply but never resolve

**Base opening (always):**

> I went back.
>
> I knew memory changed when handled. I knew repetition polished guesses until they acquired the shine of facts.
>
> I went back anyway.
>
> There is a kind of dignity in refusing to surrender evidence you know you do not possess. There is also a kind of madness. From inside the work, they feel almost identical.

**Conditional middle, by `noise_strategy` + `turned_back`:**

| noise_strategy | turned_back | Flavor |
|---|---:|---|
| listen | true | I had listened harder in the noisy rooms and turned back on the street. So I did both again. I replayed tone, posture, breath, distance. Every pass produced another plausible syllable. Plausibility accumulated until it began impersonating memory. |
| listen | false | I had listened harder but kept walking on the street. Now I reversed only the second decision. In memory I could turn around forever. That was the obscenity of it: the past had become more obedient than life had ever been. |
| watch | true | I had trusted faces when words failed and turned back to watch one body disappear. I built dialogue from eyebrows, smiles, anger, shoulders. Soon everyone in the memories was saying exactly the thing their faces suggested. It was elegant. It was almost certainly false. |
| watch | false | I had watched faces and refused the backward glance. Returning now, I discovered I could manufacture both. I gave the street another angle, the bar another camera, the argument another expression. The archive improved as its truth declined. |
| leave | true | I had once left the words alone, then turned back on the street. The contradiction had bothered me. Now I resolved it badly: I disturbed every word and turned back in every scene. Nothing was allowed to remain unexamined. Nothing survived examination unchanged. |
| leave | false | I had once let the words alone and kept walking. I broke both mercies. I reopened every room. The memories received me politely. They had learned by then what I wanted from them. |

**Fallback:**

> I replayed the scenes until uncertainty developed habits. A habit, repeated often enough, can pass for recollection even to the person who invented it.

**SHARED DEPARTURE CALLBACK:** render the same 4-row table from Ending A verbatim.

**Ending-specific callback — reconstruction loop:**

> The workplace returned first.
>
> *“If you're worried about your blood pressure, you should really check out—”*
>
> This time I heard something after *out*.
>
> Or believed I did.
>
> The station followed.
>
> Then the street.
>
> Then the bar.
>
> Then the classroom.
>
> Each pass gave me one more syllable and took away one more reason to trust it.
>
> Somewhere in the repetitions a voice said:
>
> *See you.*
>
> I replayed it until I could no longer tell whether I remembered the phrase or had taught the memory to say it.

**Closing (always):**

> I kept the words.
>
> All of them.
>
> Every possible version.
>
> The pool filled until there was no room left for silence.

---

## Ending C: The Testimony

**IMAGE:** protagonist standing in the pool facing the viewer/reflection, with seven ordinary scenes faintly reflected around them; emphasis on witness, not departure

**Base opening (always):**

> I stopped asking what they had said.
>
> Instead I said what I knew.
>
> Not because it was enough to reconstruct the past.
>
> Because it was enough to testify that there had been one.

**Conditional middle, by `station_anchor` + `childhood_reaction`:**

| station_anchor | childhood_reaction | Flavor |
|---|---|---|
| hug | call | I had trusted the pressure of a hug and later called after a child who could not hear me. Both were attempts to warn the body that time was happening. The body had known only warmth, distance, a road home. I testified to those instead. |
| hug | follow | I had trusted the hug and followed the children home. I could not quote either scene, but I could say this: once, arms closed around me at a station; once, two children walked side by side beneath schoolbags too heavy for them. The facts did not need better dialogue. |
| hug | stay | I had trusted the hug, then stayed behind in the empty classroom. Touch and absence: both had survived without explanation. I let them stand as evidence. |
| waiting | call | I had trusted that he stayed until the train moved, then tried to call after the child. One person had waited; another had kept walking. Time permitted both and explained neither. I testified to the difference. |
| waiting | follow | I had trusted the waiting at the station and followed the children down the road. Presence, I learned, was often made of minutes no one had thought to count. I could not recover the sentences, but I could count that much. |
| waiting | stay | I had trusted that he stayed while the train waited, then remained in the classroom while the children left. The two rooms faced each other across years: one person staying, two people going. I did not force them into a lesson. I simply named what I had seen. |
| message | call | I had trusted the fact of a message even when its words were gone, then called after a child to listen more carefully. The irony was obvious. A record can survive without content; a witness can survive without a transcript. I allowed myself the same incompleteness. |
| message | follow | I had trusted the message's existence and followed the children home. I testified in the same modest tense: a message arrived; two children walked; a bottle changed hands; someone smiled. History is often built from sentences no grander than these. |
| message | stay | I had trusted the fact that the phone lit, then stayed in the empty classroom. The screen and the wet floor both reflected light after the people had moved on. I could not ask reflections to quote anyone. I stopped trying. |

**Fallback:**

> I could not provide the words. I could provide the scene. A witness is allowed to have limits and remain a witness.

**SHARED DEPARTURE CALLBACK:** render the same 4-row table from Ending A verbatim.

**Ending-specific testimony (always):**

> I drove him to work.
>
> We were talking about blood pressure.
>
> He waited at the little station until the train moved.
>
> Someone returned my water bottle before leaving town for good.
>
> A man I hadn't seen in years smiled when we met by accident on the street, and invited me to meet his new dog.
>
> Someone came home from studying abroad and leaned toward me in a loud room.
>
> Someone else was furious because his long-distance girlfriend had left him, and I stood there while the anger passed through the room.
>
> Two children finished cleaning duty and walked home together before one transferred schools.
>
> These are poor last words.
>
> Fortunately, they are not last words.
>
> They are testimony.

**Closing (always):**

> I had mistaken remembering for witnessing.
>
> A witness is not an archive.
>
> A witness loses things.
>
> A witness arrives too early to know which details history will later demand.
>
> And still a witness can say:
>
> **I saw you.**
>
> The water carried the sentence outward without telling me where it would end.

---

# STATUS

**Narrative content is complete, and a first implementation pass is built.** All seven scenes, the reveal, Tier-2 inspectables, reactive blocks, the Scene 4 branch, final branch, and ending callback tables are written.

### Content inventory

| Item | Count |
|---|---:|
| Scenes | 7 |
| Plates (held images) | 1 (Scene 7 opening) |
| Distinct real-world memory episodes | 7 (Scene 5 contains two) |
| Endings | 3 |
| Tier-2 inspectables | 25 (21 dedicated object-art assets; Scene 7's 3 and Scene 5's "the conversation" are text/scene-art only) |
| Reactive blocks | 7 |
| Real branch points | 2 (`turned_back`, `final_choice`) |
| Shared ending callback rows | 4 |
| Ending A conditional rows | 6 |
| Ending B conditional rows | 6 |
| Ending C conditional rows | 9 |
| Estimated playtime | 15–22 minutes |

### Deliberate design decisions

- **The subtitle is hidden until Scene 7.** Do not spoil the chapter in navigation, URL-visible copy, loading text, or asset alt text shown to the player. Internal filenames may use “last-word.”
- **The first six scenes are not presented as a sequence of exes or relationships.** The people may be different people; the game should not label relationship categories unless a scene requires it (Scene 4 is deliberately ambiguous — years apart, no stated cause — rather than a named breakup; Scene 5 explicitly mentions a long-distance girlfriend).
- **No canonical missing sentence exists.** The blood pressure fragment, bar sentence, argument, station speech, etc. must remain unresolved. Ending B may generate plausible fragments, but the script never certifies them as true.
- **Ordinariness is essential.** Avoid cinematic farewell language, crying-at-the-platform clichés, dramatic sunset staging, or music that tells the player a scene is important before Scene 7.
- **The prose voice is testimony, not epigram — and this is structural, not taste.** Scenes 1–6 state
  what is remembered with physical precision, state the gaps plainly, and **draw no conclusions**.
  Concretely: no paragraph ends on an aphorism about memory or time; nothing backfills a plausible
  reason after the narrator says she doesn't remember something; dry understatement is allowed,
  authorial verdict is not. The reason is the reveal — an aphorism is a *conclusion*, and a narrator
  who concludes has already understood, which contradicts the whole architecture. Scene 5's
  `I remember the volume. […] I do not remember what any of the things were.` and Scene 6's name tag
  (`I can tell you the color of the thread. I cannot tell you the name.`) are the reference register;
  Scenes 1–4 were brought into line with them.
- **Chapter II has one plate and it is Scene 7's.** See THE PLATE. Adding plates to Scenes 1–6 would
  destroy the effect — the format change is what makes the arrival land, and it only works once.
- **Scene 7 and the endings are the one place interpretation is earned.** She has just understood, so
  the aphoristic register that is forbidden earlier is correct there — Ending B's conditional rows in
  particular. The register shift is itself part of the reveal: a narrator who refused to draw a
  conclusion for six scenes finally draws one. Do not flatten the endings to match Scenes 1–6, and do
  not let the aphorisms migrate back up into Scenes 1–6.
- **Water accumulates without explanation.** It is atmosphere in Scenes 1–6 and becomes structural only at the Scene 6→7 transition. **Scene 4's puddle is the single exception** and is deliberate — see *Two reveals*. It is where the water first does something it shouldn't, and it is the only pre-Scene-7 anomaly the player is meant to catch.
- **Scene 4 is the instability turn, and it is not optional.** The vivid version lives in the puddle inspectable, but tier-2s can be skipped, so the continuation carries a plain non-missable version (*I did not have a word for what*). Do not move the whole beat into the hotspot; a player who never clicks the puddle must still feel the floor tilt.
- **Ending A is surrender without erasure.** The protagonist lets the transcript go, not the people.
- **Ending B is resistance without certainty.** The protagonist knowingly chooses reconstruction even though reconstruction contaminates memory.
- **Ending C is SUPERSTES's relay equivalent.** What is carried forward is not a recovered quote but honest testimony: “I was there; this happened.”
- **The line “Importance arrived later.” is a thematic anchor.** Preserve it unless a later rewrite finds something clearly stronger.
- **The line “I hadn't forgotten their last words. I had never known I was hearing them.” is the reveal hinge.** Do not foreshadow it too explicitly.

