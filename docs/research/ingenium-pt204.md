# Research notes: JLR Ingenium 2.0L petrol (PT204 / AJ200P), 2018 Discovery Sport (US)

Unit file: `src/data/units/ingenium-pt204.json`. All step prose was written fresh. These sources supplied facts only (values, part names, order), never wording.

## Identification

- **Engine code.** The Laser 8507 tool kit instructions (s1) list the petrol codes as AJ-20/PT204, AJ-200/PT204, AJ-200P/PT204, AJ200P, PT204 and AJ200. They list Discovery Sport "Si4, P250..." from 2017 on. JLR TOPIx bulletins call the engine "INGENIUM I4 2.0L Petrol".
- **2018 US output.** 237 hp and 251 lb-ft (auto123, s27). The 286 hp version was offered on the HSE Luxury (Automotive Fleet, s34). JLR's UK release (s28) rates the same engine at 240 PS / 340 N·m: 340 N·m is 251 lb-ft, and 240 PS is 237 hp.
- **This is not the 250 PS / 365 N·m tune.** Wikipedia (s29) lists a "245 PS / 365 N·m" variant for Evoque and Velar. The 2018 US Discovery Sport uses the 240 PS / 340 N·m calibration. Both carry the same PT204 hardware family.
- **CVVL on the 237 hp version: confirmed.** JLR's release for the 240 PS and 290 PS Discovery Sport/Evoque engines (s28) says both have "electrohydraulic control of the inlet valves" for variable valve lift. It also gives a twin-scroll turbo and 200 bar direct injection. Turbo ball-bearing cartridges are mentioned only for the 290 PS engine. JLR bulletins N892 (s24) and SSM75724 (s26) treat CVVL as standard on the Discovery Sport 2.0 petrol.
- **Balancer shafts: confirmed.** There are two, gear-driven at twice crank speed (s4).

## Sources and what each was used for

| id | Source | Used for |
|---|---|---|
| s1 | Laser Tools 8507 instructions (PDF) | Engine codes, applications, OEM tool equivalents JLR-303-1630/1635/1636, chains at the rear needing transmission and drive plate removal, 50 degrees ATDC pulley mark at 6 o'clock with cam marks at 12 o'clock, compression check before head removal |
| s2 | JLR bulletin LTB01145NAS2 (NHTSA MC-10136655) | 2018 Discovery Sport VCT/rattle concern and DTCs (P052A-00, P0011-71, P000A-00); tool order; 13 N·m tool bolts; VCT bolt 10 N·m then loosen 90 degrees, final 25 N·m plus 60 degrees; upper tensioner 55 N·m |
| s3 | JLR service action N481 (NHTSA MC-10185362) | Two VCT solenoids per engine (intake and exhaust); solenoid faults on 2018-2020 Discovery Sport |
| s4 | JLR workshop manual, Defender L663, Engine Description | Block, liners, crank, graded bearings, cap orientation, piston arrow, 120 degree ring gaps, balancers, CVVL operation, VCT ranges, oil system, timing chain layout, 50 degrees ATDC pulley mark, single-use bolts |
| s5 | JLR workshop manual (Defender L663): Lower timing chain | Full chain removal and install order, guide/tensioner torques, coloured-link alignment, JLR-303-1656 |
| s6 | JLR workshop manual (Defender L663): Upper timing chain | Upper chain order, tensioner release by pushing the guide |
| s7 | JLR workshop manual (Defender L663): Upper timing cover | VCT solenoids out before cover; cover torque pattern 13.5 N·m, loosen 180 degrees, 13.5 N·m; solenoids 9 N·m |
| s8 | JLR workshop manual (Defender L663): Lower timing cover | Rear seal must come out first; 16 bolts; 3 mm RTV within 7 minutes; staged torque; head gasket caution; CKP 8 N·m |
| s9 | JLR workshop manual (Defender L663): Engine front cover | 12 bolts at 12 N·m, alignment tool 303-1433, front seal tool JLR-303-1628, idler pulley positions |
| s10 | JLR workshop manual (Defender L663): Crankshaft pulley | New 48 mm bolts, 37 N·m plus 90 degrees, front seal not lubricated |
| s11 | JLR workshop manual (Defender L663): Crankshaft rear seal | Drill-and-pull removal with JLR-303-1712; install with JLR-303-1674A and spacer |
| s12 | JLR workshop manual (Defender L663): Drive plate | Transmission off first; new bolts 30 N·m plus 120 degrees; tap no deeper than 16 mm |
| s13 | JLR workshop manual (Defender L663): Oil pan | 3 mm silicone bead, 7 minute window, 10 then 25 N·m in sequence |
| s14 | JLR workshop manual (Defender L663): Oil pump drive chain | Holding tool 205-053; new bolt 60 N·m plus 90 degrees |
| s15 | JLR workshop manual (Defender L663): Oil pump | Pump 25 N·m, inlet pipe 12 N·m |
| s16 | JLR workshop manual (Defender L663): Cylinder head | 10 new head bolts with JLR-303-1653: 20 N·m, plus 90 degrees, plus 180 degrees in sequence; extra 3 bolts 12 N·m and 1 bolt 25 N·m; follower/HLA marking; plastic scraper only; distortion check |
| s17 | JLR workshop manual (Defender L663): Camshaft carrier | Carrier removal order; 19 bolts 10 then 28 N·m; CMP 8 N·m |
| s18 | JLR workshop manual (Defender L663): Camshafts | Loosen caps one turn at a time; caps 11 N·m in sequence |
| s19 | JLR workshop manual (Defender L663): Valves | Spring compressor 303-252; lapping; new stem seals |
| s20 | JLR workshop manual (Defender L663): CVVL | Injectors out first; locating pins JLR-303-1647; never invert; brake reset tool JLR-303-1639; pilot bolt procedure, 6 N·m, 10 bolts 12 N·m; software calibration; crank 10 s / rest 5 s x4 with injectors unplugged; idle 1 minute |
| s21 | JLR workshop manual (Defender L663): Engine and ancillaries removal | External teardown order, HP line reuse limit (4 cycles, paint mark), HPFP release one turn at a time, injector remover JLR-310-254, drain plug 23 N·m |
| s22 | JLR workshop manual (Defender L663): Engine and ancillaries installation | All external torque values, injector Teflon seal sizing tools and 2-minute wait, rail guide pins JLR-310-255/256, turbo nuts 18 then 25 N·m, banjo 18 N·m, oil cooler 15 then 25 N·m |
| s23 | JLR workshop manual (Defender L663): Engine removal | Engine lifting kit JLR-303-1633-01, stand adaptor JLR-303-1673, transmission removed separately |
| s24 | JLR service action N892v2 (NHTSA MC-11011721) | Oil degradation and sludge in high-pressure galleries and the CVVL unit under urban use; 7.0 L ordered per oil change |
| s25 | JLR SSM73804 (NHTSA MC-10136685) | Bosch instruction sheet in the injector refit kit has the steps in the wrong order, which damages seals |
| s26 | JLR SSM75724 technical topic (NHTSA MC-10212986) | Misfire DTCs P1315/P0316/P0300 leading to CVVL replacement; oil sample with returned unit |
| s27 | auto123 | 237 hp / 251 lb-ft, 9-speed ZF |
| s28 | JLR UK media release, June 2017 | 240 PS / 340 N·m, electrohydraulic inlet valve control, twin-scroll turbo, 200 bar DI, integrated exhaust manifold |
| s29 | Wikipedia, Ingenium engine family | Bore 83 mm, stroke 92.3 mm, 1,999 cc, compression 10.5:1, cast-iron liners |
| s30 | YouCanic Discovery Sport capacities | 0W-20, 7.4 qt |
| s31 | Motul Specific 5122 product page | STJLR.51.5122 0W-20 for JLR petrol engines |
| s32 | JLR workshop manual (Defender L663): Oil cooler | Turbo off first; 15 then 25 N·m |
| s33 | Garrett installation guide | Pre-oiling the turbo oil inlet before first crank (general turbo practice, not JLR-specific) |
| s34 | Automotive Fleet | 2018 US trims (SE/HSE/HSE Luxury) and the 237 / 286 hp split |

Other bulletins I read for background but did not cite: MC-10127526, MC-10143039, MC-10152034 and MC-10152684 (re-issues of the VCT rattle bulletin, Jaguar variants), MC-10222497 (charge air cooler coolant leak, 19-22MY), MC-11015338 (thermostat housing leak, Jaguar 20-24MY) and MC-10141069 (Jaguar version of the injector kit SSM).

## Conflicts and caveats

1. **Defender manual applied to a 2018 Discovery Sport.** Almost every procedure and torque value comes from the 2020-on Defender L663 workshop manual for the "Ingenium I4 2.0l Petrol". It is the same PT204 family. Still, there may be 2018-to-2020 changes, such as revised tensioners, guides or MHEV-related parts. The 2018 Discovery Sport bulletin (s2) agrees with the Defender manual on every overlapping value: tools, 13 N·m, VCT bolt staging and the 55 N·m tensioner. That supports the cross-application but does not prove all of it.
2. **Liner material.** Wikipedia (s29) and the JLR manual (s4) both say cast-iron liners. A search summary of an Automotive Powertrain Technology International article said "steel liners". That article returned 403 and could not be read, so I used cast iron.
3. **"VCT actuators at the front of the engine."** The JLR description (s4) says each VCT actuator sits on the camshaft "at the front of the engine". Everything else says the timing drive is at the rear (transmission end): Laser s1, the lower cover sitting behind the drive plate and rear seal (s8), and the CKP reading the drive plate. I treated the description's wording as an error.
4. **Crank pulley bolts.** The pulley procedure (s10) says discard and fit four new 48 mm bolts. The ancillaries removal (s21) says the bolts may be used four times if punch-marked. The JSON says fit new bolts.
5. **Front crank seal torque.** The seal is screwed into the front cover with JLR-303-1628. The value is 26 N·m in the pulley procedure (s10) and 30 N·m in the front cover procedure (s9). Because of the conflict I left it out.
6. **CVVL vs injector order inside the camshaft carrier procedure.** s17 lists removal as "CVVL, then injectors" and installation as "injectors, then CVVL". The dedicated CVVL procedure (s20) says remove the injectors first and refit them after the CVVL. I followed s20.
7. **Oil capacity.** I found no owner's-manual figure. N892 (s24) orders 7.0 L per oil change on 2021-on engines, and YouCanic (s30) says 7.4 qt (about 7.0 L). The JSON gives "about 7.0 L" and says to set the final level on the dipstick.
8. **Forums.** discoverysport.net (paywalled bot gateway, HTTP 402), jaguarownersclub.com and bolidenforum.de (403) could not be read. The fullfatrr and LR Direct pages that did load were about the **diesel** Ingenium (DPF oil dilution) and were not used for petrol facts. No petrol rebuild video was found to describe.
9. **Oil dilution on the petrol engine.** JLR's own petrol bulletin (N892) describes oil degradation and sludge from urban drive cycles. It does not specifically say fuel dilution. The well-known diesel "DPF regeneration dilution" problem does not apply to this engine, and the JSON avoids claiming it.

## Unconfirmed or omitted (no source found)

- Main bearing cap bolt torque/angle and connecting rod bolt torque/angle. A JustAnswer page claimed 140 ft-lb plus 90 degrees (mains) and 65 ft-lb plus 90 degrees (rods). These look implausible and are unsourced, so I rejected them.
- Idler sprocket bolt torque (the procedure says "tighten" with no value shown in the manual).
- Bearing running clearances, crank end float limits, ring end gaps, piston-to-bore clearance, head flatness limit and valve dimensions.
- Spark plug torque and gap. A forum thread mentioned 22.5 or 23 N·m but was unreadable.
- Balancer shaft removal/installation procedure and the alignment tool number. The description only says "specialized alignment tool(s)". The order (balancers out after the crank, in before it) is inferred from the gear drive layout.
- The exact JLR head bolt tightening sequence diagram (the step says "in sequence" without reproducing it).
- How the 2018 Discovery Sport powertrain is removed from the vehicle (with or without the transmission, from above or below). The step stays generic.
- The 2018 bulletin removes a "lower timing cover blanking plug" (LR091801) to use JLR-303-1630. Its exact role in the 2018 procedure is unclear. The Defender procedure uses JLR-303-1656 to turn the crank instead.
- Turbo pre-oiling comes from general Garrett guidance (s33), not JLR. The JLR-specific priming step is the CVVL cranking routine (s20).
