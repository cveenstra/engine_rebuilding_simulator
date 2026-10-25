# Content schema

Every rebuildable unit (engine or transmission) is one JSON file in `src/data/units/<id>.json`.
The app reads nothing else, so this file is the contract between the content and the code.

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
    { "id": "timing-chain", "name": "Timing chain", "group": "timing" }
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

## Checks (`npm run validate`)

- ids unique, `order` is 1..N with no gaps, every `phase`, `components[]` and `sourceIds[]` resolves.
- every `spec` has at least one `sourceId`.
- titles unique within a unit and 2–7 words, so "what's next" choices can't be guessed by length.
