# Content schema

Every rebuildable unit (engine or transmission) is one JSON file in `src/data/units/<id>.json`.
Alongside the units sits one shared file, `src/data/parts/catalog.json`, that describes each
*kind* of part once (see [Parts catalog](#parts-catalog)). This document is the contract between
the content and the code.

Units in v1:

| id | Unit | Vehicle |
|---|---|---|
| `fb25` | Subaru FB25 2.5L DOHC boxer four (port injection) | 2014–2018 Subaru Forester 2.5i |
| `tr580` | Subaru Lineartronic TR580 CVT | 2014–2018 Subaru Forester 2.5i |
| `ingenium-pt204` | JLR 2.0L Ingenium turbo petrol four (PT204, 237 hp) | 2018 Land Rover Discovery Sport (US) |
| `zf-9hp48` | ZF 9HP48 9-speed automatic | 2018 Land Rover Discovery Sport |

## Rules for content

- **Write every step in your own words.** Do not copy factory service manual text. The repo is public.
  Facts (torque values, clearances, sequences, part names) are fine; prose is ours.
- **No invented numbers.** A `spec` must come from a cited source. If you can't source a value,
  leave `spec` out and say in `action` what is measured or torqued ("torque to spec in the
  tightening sequence"). An honest gap beats a confident wrong number.
- **Order is the point.** The learner is memorizing the sequence, so `order` must be the real
  order a technician follows, and `why` should say what forces the order when something does
  ("the crank must be locked before the pulley bolt will break loose").
- Aim for **at least 100 steps per unit** across teardown, inspection and reassembly, unless the
  unit honestly needs fewer. Transmissions may run fewer than engines; say so in `notes` if so.

## Shape

```jsonc
{
  "id": "fb25",                       // matches the file name
  "kind": "engine",                   // "engine" | "transmission"
  "name": "Subaru FB25",              // short display name
  "fullName": "Subaru FB25 2.5L DOHC 16-valve horizontally opposed four",
  "vehicle": "2014–2018 Subaru Forester 2.5i",
  "pairsWith": "tr580",               // the other unit in the same vehicle
  "summary": "2–4 sentences: what makes this unit distinctive to rebuild.",
  "facts": [                          // 6–15 headline facts for the overview screen
    { "label": "Layout", "value": "Horizontally opposed (boxer) four", "sourceIds": ["s1"] }
  ],
  "notes": ["Anything the learner must know up front: special tools, things usually replaced, things usually sublet"],
  "sources": [
    { "id": "s1", "title": "Short title", "url": "https://...", "kind": "oem|manual|forum|vendor|video|reference" }
    // kind "manual": a factory manual cited by title only, never linked (no url)
  ],
  "components": [                     // the parts the diagram and steps refer to
    { "id": "timing-chain", "name": "Timing chain", "group": "timing",
      "part": "timing-chain" }        // required: a parts catalog id (see below)
  ],
  "phases": [                         // in order
    { "id": "teardown-ext", "name": "External teardown", "kind": "teardown",
      "summary": "One sentence." }
    // kinds: "prep" | "teardown" | "inspect" | "machine" | "assembly" | "final"
  ],
  "steps": [
    {
      "id": "fb25-001",               // <unit>-NNN, stable once published
      "order": 1,                     // 1..N, unique, gapless across the whole unit
      "phase": "teardown-ext",        // a phases[].id
      "title": "Drain oil and coolant", // 2–7 words, imperative, unique within the unit
      "action": "One or two sentences on what you do.",
      "why": "Optional: what this step protects or what forces it here.",
      "tools": ["Oil drain pan"],     // optional
      "spec": {                       // optional, only with a source
        "kind": "torque",             // "torque" | "clearance" | "angle" | "sequence" | "fluid" | "other"
        "value": "45",
        "unit": "N·m",                // N·m, ft·lb, mm, deg, L, qt...
        "note": "Optional: e.g. 'plus 90°' or 'new bolt'",
        "sourceIds": ["s1"]
      },
      "critical": true,               // optional: getting this wrong damages the unit
      "mistake": "Optional: the common mistake here, in one sentence (older field; see mistakes).",
      "mistakes": [                   // optional: every way this step goes wrong (see below)
        {
          "id": "fb25-012-m1",         // unique in the unit and stable: it keys saved drill progress
          "title": "Reusing the crank bolt", // 2 to 10 words, the mistake itself
          "what": "One or two sentences: what the mistake looks like on the bench.",
          "consequence": "What it costs: the failure it causes, and when it shows up.",
          "prevent": "One imperative line: how to stay ahead of it.",
          "detect": "Optional: how you would catch it before it costs you.",
          "severity": "ruins-unit",    // "ruins-unit" | "costly" | "rework" | "minor"
          "sourceIds": ["s1"]
        }
      ],
      "components": ["timing-chain"], // optional: components[].id this step touches
      "sourceIds": ["s1"]             // where the step itself comes from
    }
  ]
}
```

### Mistakes and failure modes

`steps[].mistakes` feeds the "Ways this goes wrong" block on each step card, the unit's "Ways
to screw up" page, its printable pre-flight checklist (the `prevent` lines), and the mistake
drill. A step with `mistakes` shows only those; the older one-sentence `mistake` is shown (as
an unrated entry, not drilled) only on steps with no `mistakes`, so fold it into the list.

The drill quizzes each mistake three ways: pick its `consequence` from four, pick its `prevent`
from four, or pick its `title` as the risk at its step. Wrong answers are other mistakes' text
from the same unit, closest in length, so:

- write each `consequence` and `prevent` so it stands on its own and is specific to its
  mistake (two mistakes on different steps with the same consequence make one of them
  unanswerable);
- keep `title`s distinct within the unit;
- keep the right answer about as long as its neighbours: a long, careful `consequence` among
  short ones gives itself away.

`failureModes` (unit level, optional) lists how the unit usually dies in service:

```jsonc
"failureModes": [
  {
    "id": "chain-stretch",
    "title": "Timing chain stretch",
    "cause": "What causes it.",
    "symptoms": ["Rattle on cold start", "Cam/crank correlation code"], // a string or a list
    "rebuildAngle": "What the rebuild does about it.",
    "stepIds": ["fb25-040", "fb25-150"], // steps where it matters; must resolve
    "sourceIds": ["s3"]
  }
]
```

## Parts catalog

`components[]` are the parts of one unit, named the way that unit's manual names them
("Timing chain RH", "Secondary (upper) timing chain"). Many of them are the same kind of part
in different units. `src/data/parts/catalog.json` lists each kind once, so a picture and a plain
description written for "timing chain" serve every unit that has one.

Every component in a real unit carries `"part": "<catalog id>"`. Several components can point
at the same part (both cylinder heads of the FB25 point at `cylinder-head`), and a part can
serve engines and transmissions alike (`pump-drive-chain`). The practice fixture may leave
`part` out.

```jsonc
[
  {
    "id": "timing-chain",             // kebab-case, unique
    "name": "Timing chains",          // plain name; a set is one part ("Piston rings", "Head bolts")
    "category": "timing",             // see the list below
    "what": "One sentence: what it is, for someone who has never seen one.",
    "does": "One sentence: what it does in the engine or transmission.",
    "lookFor": "One sentence: what to inspect during a rebuild, or \"\" if nothing applies.",
    "photoQuery": "engine timing chain", // 2 to 5 words to search Wikimedia Commons with
    "drawable": true                  // false only for things with no useful picture (fluids)
  }
]
```

Categories: `engine-block`, `rotating`, `valvetrain`, `timing`, `lubrication`, `cooling`,
`fuel-air`, `turbo`, `sealing-fasteners`, `electrical-sensors`, `transmission-case`,
`hydraulics`, `clutches-gears`, `cvt-variator`, `torque-converter`, `driveline`, `tools`, `other`.

Rules for the catalog:

- **Group by kind of part, not by unit.** One `crankshaft` serves both engines; one
  `torque-converter` serves both transmissions. Add a unit-specific part only when the part is
  genuinely unique to that design (the Ingenium CVVL unit, the TR580 variator pulleys, the 9HP
  dog clutches).
- **Same writing rules as steps:** our own words, plain English, no em dashes.
- **Adding a component:** pick an existing part if one fits. Add a new catalog entry only when
  none does, and fill every field.

## Glossary

`src/data/glossary.json` lists every technical term, abbreviation and name the content uses,
so the learner can tap a word such as "bearing" in any step and read what it means. It is
also a **dependency graph**: each term names the terms a beginner must understand first, so
the app can teach them in order and no definition uses a word the learner has not met yet.

```jsonc
[
  {
    "id": "main-bearing",             // kebab-case, unique
    "term": "Main bearing",           // display form
    "aliases": ["main bearings", "mains", "main bearing shells"],
                                      // every other surface form in the content: plurals,
                                      // abbreviations, spelled-out forms, hyphen variants
    "short": "One plain sentence, under 25 words, that a beginner understands.",
    "long": "Optional 2 to 4 sentences: how it works, why it matters in a rebuild.",
    "category": "engine",             // see the list below
    "group": "Rotating assembly",     // concept cluster the term is taught with
    "part": "main-bearings",          // optional: catalog id when the term names a part type
    "requires": ["bearing-shell", "main-journal"],
                                      // DIRECT prerequisites only (0 to 4 is typical)
    "level": 5,                       // 0 with no prerequisites, else 1 + deepest prerequisite
    "plainWord": true,                // optional: the term is also ordinary English (seat, gap, cover)
    "seeAlso": ["rod-bearing"],       // optional: related glossary ids
    "example": {                      // optional: one real sentence that uses the term
      "unit": "fb25", "stepId": "fb25-084",
      "text": "Checking mains with only a few bolts snug gives a reading that is too loose."
    }
  }
]
```

Categories: `general`, `engine`, `transmission`, `measurement`, `tools`, `fasteners-sealing`,
`electrical`, `abbreviation`, `brand`.

Groups in use: Basics, Engine structure, Rotating assembly, Valvetrain and timing,
Lubrication and cooling, Fuel, air and turbo, Measuring and machining, Fasteners and sealing,
Tools and procedures, Electronics and control, Hydraulics, Clutches and gears, CVT,
Torque converter, Makers and service info.

How terms are found in text: the app's matcher (`src/engine/termMatch.js`) is whole-word,
case-insensitive and leftmost-longest, so "main bearing" wins over "bearing" and the two never
overlap; a hyphen joins words, so "ring" does not match inside "O-ring"; an alias written in
capitals ("RH", "TDC") matches only in capitals. The validator uses the same matcher.

Rules for the glossary:

- **Our own words, accurate, no em dashes.** No invented specs. Where Subaru and JLR use
  different words for the same thing (knock pin and dowel, one-time use and renew, end play
  and end float, AT learning and adaptation), say so.
- **One owner per name.** A term or alias belongs to exactly one entry, compared without
  case. Add a multi-word entry ("main bearing", "piston ring") when it means something more
  specific than its last word. Aliases must be forms the content actually uses, or a very
  likely variant (a plural, a spelling).
- **Direct prerequisites only.** List what the term rests on, not everything below that.
  Foundational entries (engine, shaft, bearing, torque, pressure, clearance) have none.
- **No forward references.** Every glossary term that appears in `short` or `long` must be
  one of the entry's prerequisites, directly or through them. Reword, or add the prerequisite.
  Terms marked `plainWord` are ordinary English and do not count, so "seat" or "cover" in a
  definition is not read as the technical term.
- **Examples are copied, not written.** `example.text` is one sentence taken word for word
  from a step's `action`, `why` or `mistake`, preferably one that uses the term once. It feeds
  the "spot it in a sentence" exercise. Leave it out when no step sentence uses the term.

## Checks (`npm run validate`)

- ids unique, `order` is 1..N with no gaps, every `phase`, `components[]` and `sourceIds[]` resolves.
- every `spec` has at least one `sourceId`.
- titles unique within a unit and 2–7 words, so "what's next" choices can't be guessed by length.
- every component in a real unit has a `part` that resolves to a catalog id.
- catalog ids are unique kebab-case, every field is present, `category` is from the list above
  and `drawable` is true or false. A `photoQuery` outside 2 to 5 words and a catalog part no
  component uses are warnings.
- glossary ids are unique kebab-case; `term`, `short`, `group`, `aliases`, `category`,
  `requires` and `level` are present and well formed; no term or alias belongs to two entries;
  `seeAlso`, `requires` and `part` resolve.
- the `requires` graph has no cycles (the cycle is printed), every `level` matches the value
  computed from `requires`, and every entry above level 0 has at least one prerequisite.
- no `short` or `long` uses a glossary term that is not among the entry's prerequisites,
  matched with the app's own term matcher, ignoring `plainWord` terms and the entry's own names.
- every `example` resolves to a real step and is copied from its `action`, `why` or `mistake`,
  and uses the term.
- warnings: a `short` of 25 words or more, an em dash, a prerequisite already implied by
  another listed one, and an entry whose term and aliases never appear in the unit or
  catalog text.
