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
      "mistake": "Optional: the common mistake here, in one sentence.",
      "components": ["timing-chain"], // optional: components[].id this step touches
      "sourceIds": ["s1"]             // where the step itself comes from
    }
  ]
}
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

## Checks (`npm run validate`)

- ids unique, `order` is 1..N with no gaps, every `phase`, `components[]` and `sourceIds[]` resolves.
- every `spec` has at least one `sourceId`.
- titles unique within a unit and 2–7 words, so "what's next" choices can't be guessed by length.
- every component in a real unit has a `part` that resolves to a catalog id.
- catalog ids are unique kebab-case, every field is present, `category` is from the list above
  and `drawable` is true or false. A `photoQuery` outside 2 to 5 words and a catalog part no
  component uses are warnings.
