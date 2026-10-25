# Research notes: ZF 9HP48 (2018 Land Rover Discovery Sport)

Unit file: `src/data/units/zf-9hp48.json` (117 steps, 14 specs, 28 sources).

## Variant confirmation

- **2018 Discovery Sport (L550, pre-facelift) = ZF 9HP48.** JLR North America bulletins list the L550
  "2015 Onwards ... 9HP48 9-Speed Automatic Transmission - AWD" (LTB00837NAS1/NAS3, s12) and SSM71847/72946
  name the 9HP48 for L550 (s13, s14). GEARS announces ZF9HP50 kits for **2020–2024** Discovery Sport (s25), which
  matches the 2020MY PTA-platform facelift.
- **Conflict:** youcanic.com's lookup table lists "Evoque 2018 ... ZF9HP50". No JLR document found supports a 9HP50
  in a 2018MY L550/L538. Treated as an error in that table and not cited. Still worth confirming against a 2018MY VIN.
- 2018MY North American vehicles use **JLR Pathfinder** (LTB00837NAS3 lists Pathfinder "from 2018MY"; s12).
- US Discovery Sport is AWD, so the transmission has a PTU on the differential side (s12, s13).

## Sources and what each was used for

| id | Source | Used for |
|---|---|---|
| s1 | Transmission Digest, *ZF9HP48 FWD Nine Speed Part 1* (Riley 2015) | No bottom pan; plastic side cover; TCM bolted to case (not mechatronic); bell housing contents (hub bearing, snap-ring seal, stator support, pump housing, filter); chain-driven dual-chamber vane pump; filter bypass tube for start-stop; gallery plate with bonded gasket; external line; C/D brake construction and apply ranges; transfer bearing must come off before D housing; tube seal case to bell housing |
| s2 | Transmission Digest, *Part 2* | Geartrain layout; E clutch (steel drum, bonded piston, cushion spring, gears 4–9); F dog on output gear support grounds 1/2 sun (P/N, R, 1–4); sets 3/4 share housing, 3-sun/4-ring is one part splined for A dog; B clutch inverted pack (R, 3, 5, 9); A dog on input shaft (1–7); transfer gear has park gear, tapered bearings; 9 or 10 solenoids; manual valve alignment; mark solenoids; connecting tubes and two oblong tubes; connector plate carries sensor wiring |
| s3 | Transmission Digest, *Chrysler 948TE: doggy dog* (Colonna 2022) | A dog sensing valve, roll pin, loose sensing-plate screw failure; ~29 psi at sensor during travel; F dog uses a sensing hole |
| s4 | Transmission Digest / Sonnax, *line pressure control* (2021) | SV-SP valve wear; lockup available in gears 1–9 |
| s5 | GEARS, *ZF 9HP48: a mechanical marvel* (Boyle, Dec 2019) | Clutch clearances B/C/D/E and 45 lb measuring force; selective parts; F dog ~60 psi to shuttle; pump marking, dished plate, raised lip; transfer bearing puller; Miller tools; air-check before teardown |
| s6 | GEARS, *worn parts create stuck-in-park* (Apr 2026) | A dog inspection, dial-caliper freedom check, air-check procedure, replace input shaft assembly on failure; sensor bench test |
| s7 | GEARS, *948TE goes to the dogs* (Dec 2015) | A = driving dog on input shaft, F = holding dog; pressure transducer needs live power to test |
| s8 | GEARS, *948TE checking fluid levels* (Apr 2017) | Level varies with temperature (scan-tool temp + chart); no leak dye. Used only as general principle; its dipstick/mm method is Chrysler-specific |
| s9 | FCA TSB 21-008-15 Rev A (948TE C-clutch snap ring) | **Backbone of the internal sequence**: drain plugs, cover (7 bolts), 9 VB bolts, pry off tubes, sensors, 17 outer + 11 inner bell bolts (keep #2, #8), bell housing lifts with E clutch/OPSA/filter, diff, transfer gear, gear 4 then gear 3 annulus/carrier, D retainer compression, lift geartrain by input shaft, D pack, C selective ring and pack, C spring compression; full reverse order; torques 29 / 6.5 / 11 / 11 N·m; special tools |
| s10 | FCA TSB 21-032-14 | Adaptation memory cells explained; gear ratios 4.700…0.479, R 3.805 |
| s11 | FCA TSB 21-013-16 | Quick Learn needed after repair/VB/TCM replacement |
| s12 | JLR LTB00837NAS3 | L550 9HP48 AWD applicability; cover gasket leak; fluid LR023288; Pathfinder from 2018MY |
| s13 | JLR SSM71847 (2016) | Serial-number thresholds; leak points (cover gasket, case to converter housing, cooler, PTU joint); update software first |
| s14 | JLR SSM72946 | Check leaks/level, update TCM before replacing |
| s15 | JLR Q500NAS1 | "Configure TCM" routine prompts for transmission serial number |
| s16 | JLR SSM72569 | M10 transmission-to-engine bolt 48 N·m ±7.5 (16MY GTDi) |
| s17 | JLR SSM71857 | New flexplate-to-converter nuts required |
| s18 | JLR SSM71847 (2014) | Adaptation procedure after software update |
| s19 | JLR NAS20.03.002 | US extended warranty (2015MY L550, 2014–15 L538) |
| s20 | PMM / Autodata Evoque article | Oil gallery plate gasket fault; new bolts, 10 N·m in sequence |
| s21 | Sonnax 85740-22K | A/F dog plunger valve sleeve wear and symptoms; PBW/PBC plunger diameter caution |
| s22 | Wikipedia ZF 9HP | 450/480 N·m rating, 86 kg |
| s23 | SAE 2013-01-1276 abstract | 4 sets / 6 elements, axially parallel vane pump, two dog clutches |
| s24 | ZF LifeguardFluid 9 data sheet | Fluid for 8HP/9HP; use only LG9 |
| s25 | GEARS 9HP50 kit release | 9HP50 = 2020–2024 Discovery Sport |
| s26 | Cararac capacities | ~6.5 L automatic transmission capacity (aggregator, low confidence) |
| s27 | JLR SSM71994 | Software-only fix for several 9HP codes |
| s28 | ATRA PDF-948TE listing | Confirms C/D spring compression tooling and that a fluid-level procedure/torque table exist |

Also read but not cited: The Truth About Cars "Ur-Turn" (gear tooth counts; names A as clutch, F as brake),
motales.com 9HP page, NHTSA Chrysler Quick Learn variants 21-035-14/21-053-15, Sonnax converter-unit page.

## Conflicts noted

- **Which dog is a "brake":** Wikipedia calls A a dog *brake* and F a dog *clutch*; Transmission Digest, GEARS,
  ATRA and TTAC say A is a driving dog clutch on the input shaft and F holds a sun gear (a brake). Went with the
  trade sources (s2, s3, s7).
- **Planet numbering:** ZF/TD count sets 1–4 from the output end (F holds the 1/2 sun); ATRA/Chrysler say F
  holds the "P3 and P4 sun". Same part, opposite numbering. The steps use Chrysler's "gear 3 / gear 4 annulus"
  names only where quoting the FCA sequence.
- **D brake apply:** TD Part 1 lists D in P/N, 1, 7–9 and omits reverse; Wikipedia's chart has D on in reverse.
  Not used in the unit file.
- **Input shaft end play:** FCA TSB 21-008-15 prints ".07 and .32 in.", which is implausibly large and probably a
  unit typo (mm). Left out of the unit file; the step says to check end play and free rotation.
- **Clutch clearances** come from GEARS quoting service data for the 948TE/9HP48 family. JLR/ZF values for the
  Land Rover unit were not found publicly and may differ by pack count.

## Open questions / unconfirmed

1. JLR fluid level check temperature window and check-plug location for the 9HP48 (the 35–45 °C figures found
   online are for 8HP Discovery 5). Left without a spec.
2. Fluid capacity: only an aggregator (6.5 L) and a vendor kit size (7 L, Liqui Moly) were found; no JLR figure.
3. Torque values for drain/fill plugs, converter nuts, output gear nut, TCM bolts, PTU-to-transmission bolts:
   not found. Steps say "to spec" without a number.
4. Whether all 948TE torque values (29 N·m bell housing, 11 N·m valve body/cover, 6.5 N·m sensors) apply to the ZF
   9HP48 built for JLR. Flagged in each spec note.
5. 48 N·m transmission-to-engine bolt comes from a 16MY bulletin for the Ford-sourced 2.0 GTDi; same bolt size is
   likely on the Ingenium installation but not confirmed.
6. Differential and transfer gear bearing preload: whether it is shimmed and to what value is not documented in
   any public source. No preload step was written.
7. TCM mounting position on the JLR installation (TD says it varies by model).
8. Whether the JLR unit has the 10-solenoid electronic-park valve body (the L550 uses a rotary shift-by-wire
   selector, which suggests it, but no source confirms it).
9. No public YouTube rebuild video was located with a stable URL; the sequence relies on the FCA TSB and trade press.
