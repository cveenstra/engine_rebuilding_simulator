# Rebuild Bench

A mobile-first study game for memorizing full engine and transmission rebuild sequences, step by step,
until you can run the whole order from memory.

Live site: https://cveenstra.github.io/engine_rebuilding_simulator/

> **Study aid only. This is not a service manual.** Rebuild Bench helps you learn the order of a rebuild. Every
> torque, clearance, angle and fluid value shown in it must be verified against the factory service manual for
> your exact unit before you work on it. Sources disagree, revisions change values, and mistakes happen. The
> factory manual wins every time.

## The units

| Vehicle | Engine | Transmission |
|---|---|---|
| 2014 to 2018 Subaru Forester 2.5i | Subaru FB25 2.5L DOHC boxer four (port injection) | Subaru Lineartronic TR580 CVT |
| 2018 Land Rover Discovery Sport (US) | JLR 2.0L Ingenium turbo petrol four (PT204) | ZF 9HP48 9-speed automatic |

Each unit is one JSON file in `src/data/units/`. The format is documented in
[`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md).

## Game modes

- **Walkthrough**: every step in order with the action, why it comes here, tools, spec, critical flag and the common mistake. Swipe or tap next and previous; jump by phase.
- **Order drill**: 5 to 8 consecutive steps, shuffled. Tap them back into order.
- **What's next**: see a step, pick the one that follows from four titles.
- **Spec flashcards**: every step with a sourced spec, as a flip card.
- **Full rebuild run**: rebuild the whole unit by picking each next step from three or four candidates, against the clock. A run in progress is saved if you leave.
- **Review due**: every step transition (step N to step N+1) is a spaced-repetition card. A miss in any mode makes it due right away; right answers on the due day push it out to 1, 3, 7, 16 and 35 days.
- **Compare**: the two engines and the two transmissions side by side.

Progress is stored only in your browser (localStorage). There is no account and no server. Export and import a JSON
backup from Progress and settings.

## Run it

```sh
npm install
npm run dev        # http://localhost:5181, also on your LAN for testing on a phone
```

Other scripts:

```sh
npm run validate   # check every unit file against docs/CONTENT_SCHEMA.md
npm run lint       # oxlint
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

## Adding or editing content

1. Edit or add `src/data/units/<id>.json` following `docs/CONTENT_SCHEMA.md`.
2. Run `npm run validate` and fix every error. Warnings are worth reading too.
3. New unit ids appear in the app automatically. To place a new unit in the garage under a vehicle, add it to
   `VEHICLES` in `src/data/index.js`; otherwise it shows under "Practice bench".

Write every step in your own words and cite a source for every spec. Never copy factory manual text into this
repo.

A fake practice unit lives in `src/data/fixtures/sample-unit.json`. It shows in development, and in a production
build only while no real unit exists.

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`: install, validate, build, and deploy `dist/` to GitHub
Pages. In the repo settings, set Pages to deploy from GitHub Actions. The app uses relative asset paths and a hash
router, so it works from any sub-path.

## Disclaimer

Rebuild Bench is a study aid. It is not a service manual, not a repair procedure and not a substitute for the
factory service information, proper training or the correct special tools. Verify every specification against the
factory service manual for your exact vehicle and unit. Not affiliated with or endorsed by Subaru, Jaguar Land
Rover or ZF; product names are used only to identify the units studied.
