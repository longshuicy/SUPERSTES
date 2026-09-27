// SUPERSTES — the chapter registry.
//
// Two chapters share one page. Since there are no ES modules here (tech doc §1),
// every data file declares a plain global, and the four names the rest of the
// code actually reads — SCENES, ENDINGS, WALL, SHARED_CALLBACK — are `let`
// bindings pointed at whichever chapter is active. Nothing else in main.js or
// gallery.js has to know a second chapter exists: they keep reading the same
// four names they always did.
//
// This is the answer to the module-layout question the tech doc left open.
// The alternative was namespacing every reference (SCENES_C1 / SCENES_C2) at
// each of the ~40 call sites, which buys nothing: only one chapter is ever
// playable at a time, so a pointer swap is the honest shape of the problem.
//
// Localization slots in at the same seam. `I18N.content(name, fallback)` hands
// back the active pack's copy of a data global, or the English one when there is
// no pack — so a chapter's four getters are the only place in the engine that
// has to know translations exist. See js/i18n.js.
//
// No narrative content lives here. Copy belongs to the chapters' own data files
// and, for a translation, to content/<lang>/.

let SCENES = [];
let ENDINGS = [];
let WALL = null;
let SHARED_CALLBACK = null;

const CHAPTERS = [
  {
    key: "i",
    numeral: "I",
    start: "scene-1",
    scenes: () => I18N.content("SCENES_C1", SCENES_C1),
    endings: () => I18N.content("ENDINGS_C1", ENDINGS_C1),
    wall: () => I18N.content("WALL_C1", WALL_C1),
    sharedCallback: () => I18N.content("WITNESS_CALLBACK_C1", WITNESS_CALLBACK_C1),

    // Chapter I's flag set (script doc, FLAG SYSTEM). `identity_found` is a
    // real boolean, not null — Ending C's rows match it with strict equality.
    flags: {
      player_name: null,
      gate_action: null,
      identity_found: false,
      tally_reaction: null,
      tools_reaction: null,
      witness_reaction: null,
      looked_away: null,
      waking_reaction: null,
      seen_reaction: null,
      acknowledged_witness: null,
      final_choice: null
    }
  },

  {
    key: "ii",
    numeral: "II",
    start: "c2-scene-1",
    scenes: () => I18N.content("SCENES_C2", SCENES_C2),
    endings: () => I18N.content("ENDINGS_C2", ENDINGS_C2),
    wall: () => I18N.content("WALL_C2", WALL_C2),
    sharedCallback: () => I18N.content("DEPARTURE_CALLBACK", DEPARTURE_CALLBACK),

    // Chapter II's flag set. `turned_back` is a real boolean once set; every
    // other flag is a string or null. No player_name — Chapter II has no
    // carving, so nothing is interpolated into its endings.
    flags: {
      dropoff_focus: null,
      station_anchor: null,
      bottle_reaction: null,
      turned_back: null,
      noise_strategy: null,
      childhood_reaction: null,
      acknowledged_departures: null,
      final_choice: null
    }
  }
];

let currentChapter = null;

function chapterByKey(key) {
  return CHAPTERS.find(c => c.key === key) || null;
}

// The pointer swap on its own, with no state reset. Also the whole of a
// language switch: the getters read through I18N, so re-running them re-points
// the same four names at the same chapter's *other* language, leaving flags,
// examined and the wall's count exactly where the run left them.
function pointAtChapter(chapter) {
  SCENES = chapter.scenes();
  ENDINGS = chapter.endings();
  WALL = chapter.wall();
  SHARED_CALLBACK = chapter.sharedCallback();
}

function relocalizeChapter() {
  if (currentChapter) pointAtChapter(currentChapter);
}

// Points the four shared bindings at a chapter and resets everything that
// belonged to the previous one. Safe to call before the first render; that is
// in fact how Chapter I starts.
function activateChapter(key) {
  const chapter = chapterByKey(key);
  if (!chapter) {
    console.error("activateChapter: unknown chapter", key);
    return null;
  }

  currentChapter = chapter;
  pointAtChapter(chapter);

  // `flags` is a const object shared across the whole app, so it is emptied and
  // repopulated rather than replaced — every existing reference stays valid.
  if (typeof flags === "object" && flags) {
    Object.keys(flags).forEach(k => { delete flags[k]; });
    Object.assign(flags, chapter.flags);
  }

  if (typeof examined !== "undefined" && examined.clear) examined.clear();
  if (typeof Gallery !== "undefined" && Gallery.reset) Gallery.reset();

  document.body.dataset.chapter = chapter.key;
  return chapter;
}
